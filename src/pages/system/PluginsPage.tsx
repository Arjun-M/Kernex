



import React from 'react';
import { useTitle } from '../../hooks/useTitle';

const PluginsPage: React.FC = () => {
  useTitle('Plugins');
  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Plugin Manager</h1>
      <div className="card">
        <p>No plugins installed.</p>
      </div>
    </div>
  );
};
export default PluginsPage;
