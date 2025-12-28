import { useState, useEffect } from 'react';
import { pluginFetch } from '../authHelper';

const SystemInfo = () => {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    pluginFetch('/api/system/info').then(res => res.json()).then(setInfo);
  }, []);

  if (!info) return <div>Loading system info...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h3>System Overview</h3>
      <pre>{JSON.stringify(info, null, 2)}</pre>
    </div>
  );
};

export default SystemInfo;