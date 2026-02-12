import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileCode,
  Image as ImageIcon,
  Info,
  Maximize,
  Minus,
  RefreshCw,
  Save,
  Scan,
  ZoomIn,
} from 'lucide-react';
import { getSessionToken, getWorkspaceId, pluginFetch } from '../authHelper';
import { useToast } from '../../app/ToastContext';
import './ImageStudio.css';

type OutputFormat = 'png' | 'jpeg' | 'webp';
type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

type StudioView = 'render' | 'source';
type DisplayMode = 'original' | 'processed';

interface ExifMap {
  [key: string]: string;
}

interface ImageMeta {
  name: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  sizeBytes: number;
  modifiedAt?: string;
}

interface FileStatResult {
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
}

const getRawUrl = (path: string) => {
  const token = getSessionToken();
  const wsId = getWorkspaceId();
  return `/api/files/raw?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token || '')}&workspaceId=${encodeURIComponent(wsId || '')}`;
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[index]}`;
};

const getBaseName = (path: string) => {
  const name = path.split('/').pop() || 'image';
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return name;
  return name.slice(0, dot);
};

const getExtension = (path: string) => path.split('.').pop()?.toLowerCase() || '';

const mimeForFormat = (format: OutputFormat) => {
  if (format === 'jpeg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  return 'image/png';
};

const buildOutputFileName = (path: string, suffix: string, format: OutputFormat) => {
  const base = getBaseName(path).replace(/\s+/g, '-');
  return `${base}-${suffix}.${format === 'jpeg' ? 'jpg' : format}`;
};

const loadImageDimensions = (url: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to decode image')); 
    img.src = url;
  });

const readBlobAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsArrayBuffer(blob);
  });

const parseExifFromJpeg = (buffer: ArrayBuffer): ExifMap => {
  const result: ExifMap = {};
  const view = new DataView(buffer);
  if (view.byteLength < 8 || view.getUint16(0, false) !== 0xffd8) return result;

  const readAscii = (offset: number, length: number) => {
    let out = '';
    for (let i = 0; i < length; i += 1) {
      const c = view.getUint8(offset + i);
      if (c === 0) break;
      out += String.fromCharCode(c);
    }
    return out;
  };

  let exifOffset = -1;
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset, false);
    const size = view.getUint16(offset + 2, false);
    if (marker === 0xffe1 && size > 8 && offset + 2 + size <= view.byteLength) {
      const id = readAscii(offset + 4, 6);
      if (id === 'Exif') {
        exifOffset = offset + 10;
        break;
      }
    }
    if (size < 2) break;
    offset += 2 + size;
  }

  if (exifOffset < 0 || exifOffset + 8 > view.byteLength) return result;

  const littleEndianMark = view.getUint16(exifOffset, false);
  const isLittle = littleEndianMark === 0x4949;
  if (!isLittle && littleEndianMark !== 0x4d4d) return result;

  const readU16 = (o: number) => view.getUint16(o, isLittle);
  const readU32 = (o: number) => view.getUint32(o, isLittle);

  const tiffMagic = readU16(exifOffset + 2);
  if (tiffMagic !== 42) return result;

  const ifd0Offset = exifOffset + readU32(exifOffset + 4);

  const exifTagMap: Record<number, string> = {
    0x010f: 'Make',
    0x0110: 'Model',
    0x0112: 'Orientation',
    0x0131: 'Software',
    0x0132: 'DateTime',
    0x829a: 'ExposureTime',
    0x829d: 'FNumber',
    0x8769: 'ExifOffset',
    0x8825: 'GPSOffset',
    0x8827: 'ISO',
    0x9003: 'DateTimeOriginal',
    0x920a: 'FocalLength',
    0x9209: 'Flash',
    0xa002: 'PixelXDimension',
    0xa003: 'PixelYDimension',
  };

  const getFieldValue = (type: number, count: number, valueOffset: number, base: number): string | null => {
    const typeSizeMap: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    const typeSize = typeSizeMap[type];
    if (!typeSize) return null;

    const valueByteLen = typeSize * count;
    const dataOffset = valueByteLen <= 4 ? valueOffset : base + readU32(valueOffset);
    if (dataOffset < 0 || dataOffset + valueByteLen > view.byteLength) return null;

    if (type === 2) return readAscii(dataOffset, count).trim();
    if (type === 3 && count === 1) return String(view.getUint16(dataOffset, isLittle));
    if (type === 4 && count === 1) return String(view.getUint32(dataOffset, isLittle));
    if ((type === 5 || type === 10) && count >= 1) {
      const n = readU32(dataOffset);
      const d = readU32(dataOffset + 4);
      if (d === 0) return null;
      const val = n / d;
      return val.toFixed(val >= 10 ? 1 : 2);
    }

    if (count <= 4 && (type === 1 || type === 7)) {
      const values: number[] = [];
      for (let i = 0; i < count; i += 1) values.push(view.getUint8(dataOffset + i));
      return values.join(',');
    }

    return null;
  };

  const walkIfd = (dirOffset: number, base: number, target: ExifMap, isGps = false) => {
    if (dirOffset <= 0 || dirOffset + 2 > view.byteLength) return;
    const entries = readU16(dirOffset);

    for (let i = 0; i < entries; i += 1) {
      const entryOffset = dirOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = readU16(entryOffset);
      const type = readU16(entryOffset + 2);
      const count = readU32(entryOffset + 4);
      const valueOffset = entryOffset + 8;

      if (!isGps && tag === 0x8769) {
        const subIfd = base + readU32(valueOffset);
        walkIfd(subIfd, base, target, false);
        continue;
      }

      if (!isGps && tag === 0x8825) {
        const gpsIfd = base + readU32(valueOffset);
        walkIfd(gpsIfd, base, target, true);
        continue;
      }

      const value = getFieldValue(type, count, valueOffset, base);
      if (!value) continue;

      if (isGps) {
        if (tag === 1) target.GPSLatitudeRef = value;
        if (tag === 2) target.GPSLatitude = value;
        if (tag === 3) target.GPSLongitudeRef = value;
        if (tag === 4) target.GPSLongitude = value;
      } else {
        const name = exifTagMap[tag];
        if (name && name !== 'ExifOffset' && name !== 'GPSOffset') target[name] = value;
      }
    }
  };

  walkIfd(ifd0Offset, exifOffset, result, false);
  return result;
};

const ImageStudioApp = () => {
  const { success, error } = useToast();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [svgSource, setSvgSource] = useState('');
  const [viewMode, setViewMode] = useState<StudioView>('render');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('original');
  const [meta, setMeta] = useState<ImageMeta | null>(null);
  const [exif, setExif] = useState<ExifMap>({});

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [format, setFormat] = useState<OutputFormat>('webp');
  const [quality, setQuality] = useState(0.86);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);
  const [targetWidth, setTargetWidth] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('KERNEX');
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkSize, setWatermarkSize] = useState(34);
  const [watermarkColor, setWatermarkColor] = useState('#ffffff');
  const [jpegBackground, setJpegBackground] = useState('#ffffff');

  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewSize, setPreviewSize] = useState(0);

  const originalBlobRef = useRef<Blob | null>(null);
  const originalUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const isSvg = useMemo(() => (currentPath ? getExtension(currentPath) === 'svg' : false), [currentPath]);

  const outputMime = useMemo(() => mimeForFormat(format), [format]);

  const cleanupObjectUrls = useCallback(() => {
    if (originalUrlRef.current) {
      URL.revokeObjectURL(originalUrlRef.current);
      originalUrlRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupObjectUrls(), [cleanupObjectUrls]);

  const readFileStat = async (path: string) => {
    try {
      const res = await pluginFetch(`/api/files/stat?path=${encodeURIComponent(path)}`);
      if (!res.ok) return null;
      return (await res.json()) as FileStatResult;
    } catch {
      return null;
    }
  };

  const updatePreviewAsset = useCallback((blob: Blob | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!blob) {
      setPreviewBlob(null);
      setPreviewUrl(null);
      setPreviewSize(0);
      return;
    }

    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewBlob(blob);
    setPreviewUrl(url);
    setPreviewSize(blob.size);
  }, []);

  const loadImage = useCallback(
    async (path: string) => {
      setProcessing(true);
      setCurrentPath(path);
      setViewMode('render');
      setDisplayMode('original');
      setExif({});
      setSvgSource('');
      setZoom(1);
      setPan({ x: 0, y: 0 });
      updatePreviewAsset(null);

      try {
        cleanupObjectUrls();

        const stat = await readFileStat(path);
        const rawUrl = getRawUrl(path);
        const fileResponse = await fetch(rawUrl);
        if (!fileResponse.ok) throw new Error('Failed to load image file');

        const blob = await fileResponse.blob();
        originalBlobRef.current = blob;

        const objectUrl = URL.createObjectURL(blob);
        originalUrlRef.current = objectUrl;
        setImageUrl(objectUrl);

        const dim = await loadImageDimensions(objectUrl);
        const ext = getExtension(path);
        const mime = blob.type || (ext ? `image/${ext}` : 'application/octet-stream');

        setMeta({
          name: path.split('/').pop() || 'image',
          ext,
          mime,
          width: dim.width,
          height: dim.height,
          sizeBytes: stat?.size ?? blob.size,
          modifiedAt: stat?.modifiedAt,
        });

        setTargetWidth(dim.width);
        setTargetHeight(dim.height);

        if (ext === 'svg') {
          const svgRes = await pluginFetch(`/api/files/read?path=${encodeURIComponent(path)}`);
          if (svgRes.ok) {
            const svgData = await svgRes.json();
            setSvgSource(svgData.content || '');
          }
        }

        if (ext === 'jpg' || ext === 'jpeg') {
          try {
            const exifBuffer = await readBlobAsArrayBuffer(blob);
            setExif(parseExifFromJpeg(exifBuffer));
          } catch {
            setExif({});
          }
        }
      } catch (e) {
        error(e instanceof Error ? e.message : 'Failed to load image');
      } finally {
        setProcessing(false);
      }
    },
    [cleanupObjectUrls, error, updatePreviewAsset]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialPath = params.get('initialPath') || params.get('file');
    if (initialPath) {
      loadImage(initialPath);
    }
  }, [loadImage]);

  const renderProcessedBlob = useCallback(async () => {
    if (!originalBlobRef.current || !meta) return null;

    const sourceUrl = URL.createObjectURL(originalBlobRef.current);
    try {
      const source = await loadImageDimensions(sourceUrl);
      const img = new Image();
      img.src = sourceUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Cannot decode source image'));
      });

      const width = resizeEnabled ? Math.max(1, Math.round(targetWidth)) : source.width;
      const height = resizeEnabled ? Math.max(1, Math.round(targetHeight)) : source.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is unavailable');

      if (format === 'jpeg') {
        ctx.fillStyle = jpegBackground;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      if (watermarkEnabled && watermarkText.trim()) {
        const fontSize = Math.max(10, watermarkSize);
        ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI`;
        ctx.textBaseline = 'alphabetic';

        const metrics = ctx.measureText(watermarkText);
        const padding = Math.max(12, Math.round(Math.min(width, height) * 0.02));
        const textWidth = metrics.width;
        const textHeight = fontSize;

        let x = padding;
        let y = textHeight + padding;

        if (watermarkPosition === 'top-right') {
          x = width - textWidth - padding;
          y = textHeight + padding;
        } else if (watermarkPosition === 'bottom-left') {
          x = padding;
          y = height - padding;
        } else if (watermarkPosition === 'bottom-right') {
          x = width - textWidth - padding;
          y = height - padding;
        } else if (watermarkPosition === 'center') {
          x = (width - textWidth) / 2;
          y = (height + textHeight) / 2;
        }

        ctx.globalAlpha = Math.max(0.05, Math.min(1, watermarkOpacity));
        ctx.fillStyle = watermarkColor;
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 8;
        ctx.fillText(watermarkText, x, y);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputMime, format === 'png' ? undefined : quality);
      });

      if (!blob) throw new Error('Failed to build output image');
      return blob;
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }, [format, jpegBackground, meta, outputMime, quality, resizeEnabled, targetHeight, targetWidth, watermarkColor, watermarkEnabled, watermarkOpacity, watermarkPosition, watermarkSize, watermarkText]);

  useEffect(() => {
    if (!meta || !originalBlobRef.current) return undefined;

    const timeout = window.setTimeout(async () => {
      try {
        const blob = await renderProcessedBlob();
        updatePreviewAsset(blob);
      } catch {
        updatePreviewAsset(null);
      }
    }, 240);

    return () => window.clearTimeout(timeout);
  }, [meta, renderProcessedBlob, updatePreviewAsset]);

  const effectiveViewUrl = displayMode === 'processed' && previewUrl ? previewUrl : imageUrl;

  const handleWidthChange = (value: number) => {
    if (!meta) return;
    const safe = Math.max(1, value || 1);
    setTargetWidth(safe);
    if (lockAspect) {
      const ratio = meta.height / meta.width;
      setTargetHeight(Math.max(1, Math.round(safe * ratio)));
    }
  };

  const handleHeightChange = (value: number) => {
    if (!meta) return;
    const safe = Math.max(1, value || 1);
    setTargetHeight(safe);
    if (lockAspect) {
      const ratio = meta.width / meta.height;
      setTargetWidth(Math.max(1, Math.round(safe * ratio)));
    }
  };

  const handleSaveToWorkspace = async () => {
    if (!currentPath) return;
    setProcessing(true);
    try {
      let blob = previewBlob;
      if (!blob) blob = await renderProcessedBlob();
      if (!blob) throw new Error('No output generated');

      const dir = currentPath.split('/').slice(0, -1).join('/');
      const fileName = buildOutputFileName(currentPath, 'edited', format);
      const file = new File([blob], fileName, { type: outputMime });

      const formData = new FormData();
      formData.append('file', file);

      const res = await pluginFetch(`/api/files/upload?targetDir=${encodeURIComponent(dir)}`, {
        method: 'POST',
        body: formData,
        headers: {},
      });

      if (!res.ok) throw new Error('Upload failed');
      success(`Saved ${fileName} to workspace`);
    } catch (e) {
      error(e instanceof Error ? e.message : 'Failed to save output');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!currentPath) return;
    setProcessing(true);
    try {
      let blob = previewBlob;
      if (!blob) blob = await renderProcessedBlob();
      if (!blob) throw new Error('No output generated');

      const fileName = buildOutputFileName(currentPath, 'download', format);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      success(`Downloaded ${fileName}`);
    } catch (e) {
      error(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setProcessing(false);
    }
  };

  const resetAdjustments = () => {
    if (!meta) return;
    setFormat('webp');
    setQuality(0.86);
    setResizeEnabled(false);
    setTargetWidth(meta.width);
    setTargetHeight(meta.height);
    setLockAspect(true);
    setWatermarkEnabled(false);
    setWatermarkText('KERNEX');
    setWatermarkPosition('bottom-right');
    setWatermarkOpacity(0.25);
    setWatermarkSize(34);
    setWatermarkColor('#ffffff');
    setJpegBackground('#ffffff');
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const onMouseUp = () => setDragging(false);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0012;
    setZoom((z) => Math.min(8, Math.max(0.08, z + delta)));
  };

  const exifEntries = useMemo(() => Object.entries(exif).filter(([, v]) => v), [exif]);

  if (!currentPath) {
    return (
      <div className="image-studio-empty">
        <ImageIcon size={48} />
        <p>No image loaded. Open an image from File Manager.</p>
      </div>
    );
  }

  return (
    <div className="image-studio-layout">
      <div
        className="image-studio-canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {viewMode === 'source' && isSvg ? (
          <div className="image-studio-source">
            <pre>{svgSource || 'No SVG source loaded.'}</pre>
          </div>
        ) : (
          <div
            className="image-studio-media-wrap"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {effectiveViewUrl && (
              <img
                src={effectiveViewUrl}
                alt="Preview"
                draggable={false}
                className="image-studio-preview"
              />
            )}
          </div>
        )}

        <div className="image-studio-overlay">
          <button className="icon-btn" title="Zoom out" onClick={() => setZoom((z) => Math.max(0.08, z - 0.1))}>
            <Minus size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" title="Zoom in" onClick={() => setZoom((z) => Math.min(8, z + 0.1))}>
            <ZoomIn size={16} />
          </button>
          <button
            className="icon-btn"
            title="Reset view"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>

      <aside className="image-studio-panel">
        <div className="image-studio-section">
          <div className="image-studio-head">
            <h3>{meta?.name}</h3>
          </div>
          <div className="image-studio-subtext">
            <span>
              <ImageIcon size={12} /> {meta ? `${meta.width} x ${meta.height}` : '--'}
            </span>
            <span>
              <Info size={12} /> {meta?.ext.toUpperCase()} {meta ? `(${formatBytes(meta.sizeBytes)})` : ''}
            </span>
            {meta?.modifiedAt && <span>{new Date(meta.modifiedAt).toLocaleString()}</span>}
          </div>
        </div>

        <div className="image-studio-section image-studio-mode-row">
          <div className="image-studio-btn-group">
            <button
              className={`image-studio-mode-btn ${displayMode === 'original' ? 'active' : ''}`}
              onClick={() => setDisplayMode('original')}
            >
              <Eye size={14} /> Original
            </button>
            <button
              className={`image-studio-mode-btn ${displayMode === 'processed' ? 'active' : ''}`}
              onClick={() => setDisplayMode('processed')}
              disabled={!previewUrl}
            >
              <Scan size={14} /> Processed
            </button>
          </div>

          {isSvg && (
            <div className="image-studio-btn-group">
              <button
                className={`image-studio-mode-btn ${viewMode === 'render' ? 'active' : ''}`}
                onClick={() => setViewMode('render')}
              >
                <Eye size={14} /> Render
              </button>
              <button
                className={`image-studio-mode-btn ${viewMode === 'source' ? 'active' : ''}`}
                onClick={() => setViewMode('source')}
              >
                <FileCode size={14} /> Source
              </button>
            </div>
          )}
        </div>

        <div className="image-studio-section">
          <h4>Output Settings</h4>
          <label className="label-sm">Format</label>
          <select className="input" value={format} onChange={(e) => setFormat(e.target.value as OutputFormat)}>
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
          </select>

          {format !== 'png' && (
            <>
              <label className="label-sm">Quality: {Math.round(quality * 100)}%</label>
              <input type="range" min={0.1} max={1} step={0.01} value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} />
            </>
          )}

          {format === 'jpeg' && (
            <>
              <label className="label-sm">JPEG Background</label>
              <input className="input" type="color" value={jpegBackground} onChange={(e) => setJpegBackground(e.target.value)} />
            </>
          )}

          <label className="image-studio-inline-check">
            <input type="checkbox" checked={resizeEnabled} onChange={(e) => setResizeEnabled(e.target.checked)} />
            Resize output
          </label>

          {resizeEnabled && (
            <div className="image-studio-grid-2">
              <div>
                <label className="label-sm">Width</label>
                <input className="input" type="number" min={1} value={targetWidth} onChange={(e) => handleWidthChange(Number(e.target.value))} />
              </div>
              <div>
                <label className="label-sm">Height</label>
                <input className="input" type="number" min={1} value={targetHeight} onChange={(e) => handleHeightChange(Number(e.target.value))} />
              </div>
              <label className="image-studio-inline-check" style={{ gridColumn: '1 / -1' }}>
                <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} />
                Lock aspect ratio
              </label>
            </div>
          )}
        </div>

        <div className="image-studio-section">
          <h4>Watermark</h4>
          <label className="image-studio-inline-check">
            <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} />
            Enable watermark
          </label>

          {watermarkEnabled && (
            <>
              <label className="label-sm">Text</label>
              <input className="input" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} maxLength={80} />

              <label className="label-sm">Position</label>
              <select className="input" value={watermarkPosition} onChange={(e) => setWatermarkPosition(e.target.value as WatermarkPosition)}>
                <option value="top-left">Top Left</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="center">Center</option>
              </select>

              <label className="label-sm">Size: {watermarkSize}px</label>
              <input type="range" min={12} max={120} step={1} value={watermarkSize} onChange={(e) => setWatermarkSize(Number(e.target.value))} />

              <label className="label-sm">Opacity: {Math.round(watermarkOpacity * 100)}%</label>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
              />

              <label className="label-sm">Color</label>
              <input className="input" type="color" value={watermarkColor} onChange={(e) => setWatermarkColor(e.target.value)} />
            </>
          )}
        </div>

        <div className="image-studio-section">
          <h4>Export</h4>
          <div className="image-studio-subtext">
            <span>MIME: {outputMime}</span>
            {previewSize > 0 && <span>Estimated output: {formatBytes(previewSize)}</span>}
          </div>

          <div className="image-studio-actions">
            <button className="btn-primary" onClick={handleSaveToWorkspace} disabled={processing}>
              {processing ? <RefreshCw size={16} className="spin" /> : <Save size={16} />}
              Save to Workspace
            </button>
            <button className="btn-primary" onClick={handleDownload} disabled={processing}>
              <Download size={16} /> Download
            </button>
            <button className="icon-btn" onClick={resetAdjustments} title="Reset all adjustments">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="image-studio-section">
          <h4>Technical Metadata</h4>
          <div className="image-studio-meta-list">
            <div><span>File</span><b>{meta?.name}</b></div>
            <div><span>Type</span><b>{meta?.mime || '--'}</b></div>
            <div><span>Size</span><b>{meta ? formatBytes(meta.sizeBytes) : '--'}</b></div>
            <div><span>Dimensions</span><b>{meta ? `${meta.width} x ${meta.height}` : '--'}</b></div>
          </div>

          {exifEntries.length > 0 && (
            <>
              <h4 style={{ marginTop: 14 }}>EXIF</h4>
              <div className="image-studio-meta-list">
                {exifEntries.map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ImageStudioApp;
