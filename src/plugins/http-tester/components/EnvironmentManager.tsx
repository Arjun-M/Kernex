import React, { useState, useEffect } from 'react';
import './EnvironmentManager.css';
import { Plus, Trash2, X, Save } from 'lucide-react';
import type { Environment } from '../types';
import { pluginFetch } from '../../authHelper';

interface EnvironmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onEnvironmentChanged: () => void;
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = ({ isOpen, onClose, onEnvironmentChanged }) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  
  // Edit State
  const [editName, setEditName] = useState('');
  const [editVars, setEditVars] = useState<{key: string, value: string}[]>([]);

  useEffect(() => {
    if (isOpen) fetchEnvironments();
  }, [isOpen]);

  const fetchEnvironments = async () => {
    try {
      const res = await pluginFetch('/api/http/environments');
      const data = await res.json();
      setEnvironments(data);
      if (data.length > 0 && !selectedEnvId) {
          selectEnv(data[0]);
      } else if (data.length === 0) {
          setSelectedEnvId(null);
          setEditName('');
          setEditVars([]);
      }
    } catch (e) {
      console.error('Failed to fetch environments', e);
    }
  };

  const selectEnv = (env: Environment) => {
      setSelectedEnvId(env.id);
      setEditName(env.name);
      setEditVars(env.variables || []);
  };

  const handleNew = () => {
      setSelectedEnvId('new');
      setEditName('New Environment');
      setEditVars([{ key: '', value: '' }]);
  };

  const handleSave = async () => {
      if (!editName) return alert('Name is required');
      
      const payload = {
          name: editName,
          variables: editVars.filter(v => v.key) // Only save vars with keys
      };

      try {
          if (selectedEnvId === 'new') {
              await pluginFetch('/api/http/environments', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(payload)
              });
          } else {
              await pluginFetch(`/api/http/environments/${selectedEnvId}`, {
                  method: 'PUT',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(payload)
              });
          }
          await fetchEnvironments();
          onEnvironmentChanged();
          if (selectedEnvId === 'new') {
               // After fetch, we need to select the new one. 
               // For simplicity, fetchEnvironments logic handles default selection or we can leave it.
               // Ideally we find the created one.
          }
      } catch (e) {
          alert('Failed to save environment');
      }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm('Delete environment?')) return;
      
      try {
          await pluginFetch(`/api/http/environments/${id}`, { method: 'DELETE' });
          if (selectedEnvId === id) setSelectedEnvId(null);
          await fetchEnvironments();
          onEnvironmentChanged();
      } catch (e) {
          alert('Failed to delete environment');
      }
  };

  const updateVar = (index: number, field: 'key' | 'value', val: string) => {
      const newVars = [...editVars];
      newVars[index] = { ...newVars[index], [field]: val };
      setEditVars(newVars);
  };

  const addVar = () => {
      setEditVars([...editVars, { key: '', value: '' }]);
  };

  const removeVar = (index: number) => {
      setEditVars(editVars.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="env-modal-overlay">
      <div className="env-modal">
        <div className="env-sidebar">
            <div className="env-sidebar-header">
                <h3>Environments</h3>
                <button onClick={handleNew} title="New Environment"><Plus size={16}/></button>
            </div>
            <div className="env-list">
                {environments.map(env => (
                    <div 
                        key={env.id} 
                        className={`env-item ${selectedEnvId === env.id ? 'active' : ''}`}
                        onClick={() => selectEnv(env)}
                    >
                        <span className="name">{env.name}</span>
                        <button className="delete-btn" onClick={(e) => handleDelete(e, env.id)}>
                            <Trash2 size={12}/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
        <div className="env-content">
            <div className="env-header">
                <h2>{selectedEnvId === 'new' ? 'Create Environment' : 'Edit Environment'}</h2>
                <button className="close-btn" onClick={onClose}><X size={20}/></button>
            </div>
            
            {(selectedEnvId || selectedEnvId === 'new') ? (
                <div className="env-editor">
                    <div className="form-group">
                        <label>Environment Name</label>
                        <input 
                            type="text" 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)}
                            placeholder="e.g., Production" 
                        />
                    </div>
                    
                    <div className="vars-section">
                        <div className="vars-header">
                            <label>Variables</label>
                            <button onClick={addVar} className="add-var-btn"><Plus size={14}/> Add</button>
                        </div>
                        <div className="vars-list">
                            {editVars.map((v, i) => (
                                <div key={i} className="var-row">
                                    <input 
                                        type="text" 
                                        placeholder="Variable" 
                                        value={v.key} 
                                        onChange={e => updateVar(i, 'key', e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Value" 
                                        value={v.value} 
                                        onChange={e => updateVar(i, 'value', e.target.value)}
                                    />
                                    <button onClick={() => removeVar(i)} className="remove-var-btn"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            {editVars.length === 0 && (
                                <div className="empty-vars">No variables defined.</div>
                            )}
                        </div>
                    </div>

                    <div className="env-actions">
                        <button className="save-btn" onClick={handleSave}>
                            <Save size={16}/> Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="no-selection">Select or create an environment</div>
            )}
        </div>
      </div>
    </div>
  );
};
