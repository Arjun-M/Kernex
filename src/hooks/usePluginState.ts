import { useState, useEffect, useRef, useCallback } from 'react';
import { authFetch } from '../app/authFetch';

// Get workspace ID from URL or context. Since plugins run inside the main app context,
// we can usually parse it from window.location or passed props.
// However, plugins in iframes might need a different approach.
// Assuming this hook is used within the main app or plugins sharing the same origin/context.
// For the main app's plugins (which seem to be React components), we can get it from the URL usually /workspace/:id

const getWorkspaceId = () => {
    // 1. Try Query Param (Iframe context)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('workspaceId');
    if (id) return id;

    // 2. Try URL Path (Main App context)
    const match = window.location.pathname.match(/\/workspace\/([^/]+)/);
    return match ? match[1] : null;
};

export function usePluginState<T>(pluginId: string, initialState: T) {
    const [state, setState] = useState<T>(initialState);
    const [loading, setLoading] = useState(true);
    const workspaceId = getWorkspaceId();
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load state on mount
    useEffect(() => {
        if (!workspaceId) {
            setLoading(false);
            return;
        }

        const fetchState = async () => {
            try {
                const res = await authFetch(`/api/workspace-state/${workspaceId}/${pluginId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && Object.keys(data).length > 0) {
                        setState({ ...initialState, ...data });
                    }
                }
            } catch (e) {
                console.error(`Failed to load state for ${pluginId}`, e);
            } finally {
                setLoading(false);
            }
        };

        fetchState();
    }, [pluginId, workspaceId]);

    // Save state wrapper
    const setPluginState = useCallback((newState: T | ((prev: T) => T)) => {
        setState((prev) => {
            const resolvedState = typeof newState === 'function' ? (newState as any)(prev) : newState;
            
            // Debounce save
            if (workspaceId) {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(async () => {
                    try {
                        await authFetch(`/api/workspace-state/${workspaceId}/${pluginId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(resolvedState)
                        });
                    } catch (e) {
                        console.error('Failed to save plugin state', e);
                    }
                }, 1000); // 1s debounce
            }
            
            return resolvedState;
        });
    }, [pluginId, workspaceId]);

    return [state, setPluginState, loading] as const;
}
