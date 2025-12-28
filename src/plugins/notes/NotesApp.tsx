import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Search, FileText, Check, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import './NotesApp.css';
import { pluginFetch } from '../authHelper';

interface Note {
  id: string;
  title: string;
  content?: string;
  updated_at: number;
}

interface NotesAppState {
  noteId?: string | null;
  isFullscreen?: boolean;
  scrollPosition?: number;
}

interface NotesAppProps {
  initialState?: NotesAppState;
  onStateChange?: (state: NotesAppState) => void;
}

const NotesApp: React.FC<NotesAppProps> = ({ initialState, onStateChange }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialState?.noteId || null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(initialState?.isFullscreen || false);
  
  const workspaceId = 'default';
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state to canvas
  const syncState = useCallback((updates: Partial<NotesAppState>) => {
    if (onStateChange) {
      onStateChange({
        noteId: activeNoteId,
        isFullscreen,
        scrollPosition: textareaRef.current?.scrollTop || 0,
        ...updates
      });
    }
  }, [activeNoteId, isFullscreen, onStateChange]);

  // Fetch all notes
  const fetchNotes = useCallback(async () => {
    try {
      const res = await pluginFetch(`/api/notes?workspaceId=${workspaceId}`);
      const data = await res.json();
      setNotes(data);
      
      // Auto-select most recent if none selected
      if (!activeNoteId && data.length > 0) {
        setActiveNoteId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to fetch notes', e);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, activeNoteId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Load specific note content
  useEffect(() => {
    if (activeNoteId) {
      const loadNote = async () => {
        try {
          const res = await pluginFetch(`/api/notes/${activeNoteId}`);
          if (res.ok) {
            const data = await res.json();
            setActiveNote(data);
            
            // Restore scroll position after content is loaded
            if (initialState?.scrollPosition && textareaRef.current) {
                setTimeout(() => {
                    if (textareaRef.current) textareaRef.current.scrollTop = initialState.scrollPosition!;
                }, 0);
            }
            syncState({ noteId: activeNoteId });
          }
        } catch (e) {
          console.error('Failed to load note content');
        }
      };
      loadNote();
    } else {
      setActiveNote(null);
    }
  }, [activeNoteId]); // Note: syncState is not here to avoid loops

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
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => performSave(note), 800);
  }, [performSave]);

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
    const newState = !isFullscreen;
    setIsFullscreen(newState);
    syncState({ isFullscreen: newState });
  };

  const handleScroll = () => {
    if (textareaRef.current) {
      syncState({ scrollPosition: textareaRef.current.scrollTop });
    }
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
        setActiveNoteId(newNote.id);
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
            setActiveNoteId(null);
            setActiveNote(null);
            syncState({ noteId: null });
        }
      }
    } catch (e) {
      console.error('Failed to delete note');
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                onClick={() => setActiveNoteId(note.id)}
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
                <div className={`save-indicator ${saveStatus}`}>
                  {saveStatus === 'saving' && <><Loader2 size={12} className="spin" /> Saving...</>}
                  {saveStatus === 'saved' && <><Check size={12} /> Saved</>}
                  {saveStatus === 'error' && <>Error saving</>}
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
              onScroll={handleScroll}
              onBlur={() => performSave(activeNote)}
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