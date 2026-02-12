import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Helper to download a file
const downloadFile = async (url: string, destPath: string) => {
    try {
        const res = await fetch(url);
        if (!res.ok) return false;
        const arrayBuffer = await res.arrayBuffer();
        await fs.writeFile(destPath, Buffer.from(arrayBuffer));
        return true;
    } catch (e) {
        return false;
    }
}

// Helper to resolve URLs
const resolveUrl = (baseUrl: string, relUrl: string) => {
    try {
        return new URL(relUrl, baseUrl).href;
    } catch {
        return null;
    }
}

export default async function extractorRoutes(fastify: FastifyInstance) {
    fastify.post('/extract', async (request, reply) => {
        const { url, workspaceId, folderName } = request.body as any;
        
        if (!url || !workspaceId) return reply.code(400).send({ error: 'Missing URL or Workspace ID' });

        try {
            // Validate URL
            new URL(url);
        } catch {
            return reply.code(400).send({ error: 'Invalid URL' });
        }

        const safeFolderName = (folderName || new URL(url).hostname).replace(/[^a-z0-9-_.]/gi, '_');
        const workspacePath = path.join(process.cwd(), 'workspace', workspaceId);
        const extractPath = path.join(workspacePath, safeFolderName);

        try {
            await fs.mkdir(extractPath, { recursive: true });
            const assetsPath = path.join(extractPath, 'assets');
            await fs.mkdir(assetsPath, { recursive: true });

            // Fetch Main HTML
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (!res.ok) throw new Error(`Failed to fetch ${url} - Status: ${res.status}`);
            let html = await res.text();

            // Simple Regex Scraper
            // Finds src="..." and href="..."
            const regex = /(?:src|href)=["']([^"']+)["']/g;
            const resources = new Set<string>();
            let match;
            
            // First pass: Collect all resources
            while ((match = regex.exec(html)) !== null) {
                const relUrl = match[1];
                if (relUrl.startsWith('data:') || relUrl.startsWith('#') || relUrl.startsWith('mailto:') || relUrl.startsWith('tel:')) continue;
                
                const absUrl = resolveUrl(url, relUrl);
                if (absUrl) resources.add(absUrl);
            }

            // Download assets (Limit concurrency to 10)
            const assetList = Array.from(resources);
            const results: Record<string, string> = {};
            
            // Chunking for simple concurrency control
            const chunkSize = 10;
            for (let i = 0; i < assetList.length; i += chunkSize) {
                const chunk = assetList.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (assetUrl) => {
                    try {
                        const urlObj = new URL(assetUrl);
                        // Get extension or guess it
                        let ext = path.extname(urlObj.pathname);
                        if (!ext || ext.length > 5) ext = '.file';
                        
                        const filename = `${crypto.randomUUID().slice(0, 12)}${ext}`;
                        const localPath = path.join(assetsPath, filename);
                        
                        const success = await downloadFile(assetUrl, localPath);
                        if (success) {
                            results[assetUrl] = `assets/${filename}`;
                        }
                    } catch (e) {
                        // Ignore download errors
                    }
                }));
            }

            // Second pass: Replace in HTML
            html = html.replace(/(src|href)=["']([^"']+)["']/g, (fullMatch, attr, capturedUrl) => {
                if (capturedUrl.startsWith('data:') || capturedUrl.startsWith('#')) return fullMatch;
                const absUrl = resolveUrl(url, capturedUrl);
                
                if (absUrl && results[absUrl]) {
                    return `${attr}="${results[absUrl]}"`;
                }
                return fullMatch;
            });

            // Save index.html
            await fs.writeFile(path.join(extractPath, 'index.html'), html);

            return { success: true, path: safeFolderName };

        } catch (e: any) {
            request.log.error(e);
            return reply.code(500).send({ error: e.message });
        }
    });
}
