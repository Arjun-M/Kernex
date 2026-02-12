import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Search, FileText, Check, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import './NotesApp.css';
import { pluginFetch } from '../authHelper';
import { usePluginState } from '../../hooks/usePluginState';

interface Note {
  id: string;
  title: string;
  content?: string;
  updated_at: number;
}

interface NotesPluginState {
    activeNoteId: string | null;
    isFullscreen: boolean;
    // We could store scrollPosition here too, but it might be too jittery for remote state unless throttled heavily.
}

const NotesApp: React.FC = () => {
  // State Management Hook
  const [persistedState, setPersistedState, stateLoading] = usePluginState<NotesPluginState>('notes-app', {
      activeNoteId: null,
      isFullscreen: false
  });

  const [notes, setNotes] = useState<Note[]>([]);
  // Use local state for immediate interaction, sync with persisted
  const activeNoteId = persistedState.activeNoteId;
  const isFullscreen = persistedState.isFullscreen;

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isLoading, setIsLoading] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  const workspaceId = 'default';
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch all notes
  const fetchNotes = useCallback(async () => {
    try {
      const res = await pluginFetch(`/api/notes?workspaceId=${workspaceId}`);
      const data = await res.json();
      setNotes(data);
      
      // If we loaded notes, and we have an activeNoteId in state, ensuring it exists is handled by the useEffect below
      // If no activeNoteId, we can optionally default to first, but maybe better to respect "no selection".
    } catch (e) {
      console.error('Failed to fetch notes', e);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Load specific note content when activeNoteId changes
  useEffect(() => {
    if (activeNoteId) {
      const loadNote = async () => {
        try {
          const res = await pluginFetch(`/api/notes/${activeNoteId}`);
          if (res.ok) {
            const data = await res.json();
            setActiveNote(data);
          } else {
             // Note might be deleted
             setPersistedState(prev => ({ ...prev, activeNoteId: null }));
             setActiveNote(null);
          }
        } catch (e) {
          console.error('Failed to load note content');
          setActiveNote(null);
        }
      };
      loadNote();
    } else {
      setActiveNote(null);
    }
  }, [activeNoteId]);

  // Auto-save logic
  const performSave = useCallback(async (note: Note) => {
    if (!note) return;
    setSaveStatus('saving');
    try {
      const res = await pluginFetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: note.title, content: note.content })
      });
      if (res.ok) {
        setSaveStatus('saved');
        // Update updated_at in list
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, title: note.title, updated_at: Date.now() } : n).sort((a,b) => b.updated_at - a.updated_at));
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('error');
    }
  }, []);

  const triggerAutoSave = useCallback((note: Note) => {
    if (!autoSaveEnabled) {
        setSaveStatus('error'); 
        return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => performSave(note), 800);
  }, [performSave, autoSaveEnabled]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeNote) return;
    const updated = { ...activeNote, title: e.target.value };
    setActiveNote(updated);
    triggerAutoSave(updated);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeNote) return;
    const updated = { ...activeNote, content: e.target.value };
    setActiveNote(updated);
    triggerAutoSave(updated);
  };

  // Keyboard Shortcuts (Manual Save & Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeNote) performSave(activeNote);
      }
      if (e.key === 'f' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNote, performSave]);

  const toggleFullscreen = () => {
    setPersistedState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  };

  const createNewNote = async () => {
    try {
      const res = await pluginFetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, title: 'New Note', content: '' })
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes([newNote, ...notes]);
        setPersistedState(prev => ({ ...prev, activeNoteId: newNote.id }));
      }
    } catch (e) {
      console.error('Failed to create note');
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this note?')) return;
    try {
      const res = await pluginFetch(`/api/notes/${id}`, { 
        method: 'DELETE'
      });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (activeNoteId === id) {
            setPersistedState(prev => ({ ...prev, activeNoteId: null }));
            setActiveNote(null);
        }
      }
    } catch (e) {
      console.error('Failed to delete note');
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (stateLoading) {
      return <div style={{ padding: 20 }}>Loading state...</div>;
  }

  return (
    <div className={`notes-app ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* Sidebar */}
      {!isFullscreen && (
        <div className="notes-sidebar">
          <div className="notes-sidebar-header">
            <button className="new-note-btn" onClick={createNewNote}>
              <Plus size={16} /> New Note
            </button>
          </div>
          <div className="notes-search-wrapper">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="notes-list">
            {isLoading ? (
              <div className="notes-empty">Loading...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="notes-empty">No notes found</div>
            ) : filteredNotes.map(note => (
              <div 
                key={note.id} 
                className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
                onClick={() => setPersistedState(prev => ({ ...prev, activeNoteId: note.id }))}
              >
                <FileText size={14} />
                <div className="note-item-info">
                  <div className="note-item-title">{note.title}</div>
                  <div className="note-item-date">{new Date(note.updated_at).toLocaleDateString()}</div>
                </div>
                <button className="delete-btn" onClick={(e) => deleteNote(note.id, e)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="notes-editor">
        {activeNote ? (
          <>
            <div className="editor-header">
              <input 
                className="note-title-input"
                value={activeNote.title}
                onChange={handleTitleChange}
                placeholder="Note Title"
                onBlur={() => performSave(activeNote)}
              />
              <div className="editor-actions">
                <button 
                    className={`icon-btn ${autoSaveEnabled ? 'active' : ''}`} 
                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} 
                    title={autoSaveEnabled ? "Auto Save On" : "Auto Save Off"}
                    style={{ fontSize: '10px', width: 'auto', padding: '0 8px', color: autoSaveEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                >
                    {autoSaveEnabled ? 'Auto Save' : 'Manual Save'}
                </button>
                <div className={`save-indicator ${saveStatus}`}>
                  {saveStatus === 'saving' && <><Loader2 size={12} className="spin" /> Saving...</>}
                  {saveStatus === 'saved' && <><Check size={12} /> Saved</>}
                  {saveStatus === 'error' && <>Unsaved</>}
                </div>
                <button className="icon-btn" onClick={toggleFullscreen} title="Toggle Fullscreen">
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button className="icon-btn delete" onClick={(e) => deleteNote(activeNote.id, e as any)} title="Delete Note">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <textarea 
              ref={textareaRef}
              className="note-textarea"
              value={activeNote.content}
              onChange={handleContentChange}
              onBlur={() => autoSaveEnabled && performSave(activeNote)}
              placeholder="Start writing..."
              spellCheck={false}
            />
          </>
        ) : (
          <div className="editor-placeholder">
            <FileText size={48} opacity={0.1} />
            <p>Select or create a note to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesApp;
