import { useState, useEffect } from 'react';
import { pluginFetch } from '../authHelper';

const DiskManager = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    pluginFetch('/api/system/disk').then(res => res.json()).then(setData);
  }, []);

  if (!data) return <div>Loading disk data...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h3>Disk Usage</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default DiskManager;