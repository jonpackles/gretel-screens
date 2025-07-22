import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInformContentOptions {
  filterType?: 'event' | 'project' | 'all';
  pollInterval?: number; // milliseconds
  enableBroadcast?: boolean;
}

interface InformContentState {
  content: any[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

export function useInformContent(options: UseInformContentOptions = {}) {
  const {
    filterType = 'all',
    pollInterval = 60000, // 1 minute default
    enableBroadcast = true
  } = options;

  const [state, setState] = useState<InformContentState>({
    content: [],
    loading: true,
    error: null,
    lastUpdated: 0
  });

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isMountedRef = useRef(true);
  const fetchContentRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);

  // Initial fetch and setup polling
  useEffect(() => {
    const fetchContent = async (silent = false) => {
      if (!silent) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      try {
        // Add cache-busting parameter
        const cacheBuster = Date.now();
        const response = await fetch(`/api/inform?_t=${cacheBuster}`, {
          cache: 'no-store', // Prevent browser caching
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch content`);
        }

        const rawData = await response.json();
        
        // Filter content based on type
        let filteredContent = rawData;
        if (filterType === 'event') {
          filteredContent = rawData.filter((item: any) => 
            item.type === 'event' || item.type === 'announcement'
          );
        } else if (filterType === 'project') {
          filteredContent = rawData.filter((item: any) => 
            item.type === 'project'
          );
        }

        if (isMountedRef.current) {
          setState({
            content: filteredContent,
            loading: false,
            error: null,
            lastUpdated: Date.now()
          });
        }
      } catch (error) {
        console.error('Failed to fetch inform content:', error);
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch content'
          }));
        }
      }
    };
    
    // Store fetchContent in ref for access by broadcast and forceRefresh
    fetchContentRef.current = fetchContent;
    
    fetchContent(); // Initial fetch (not silent)
    
    // Setup polling
    const setupPolling = () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
      
      pollTimeoutRef.current = setTimeout(() => {
        fetchContent(true); // Silent refresh
        setupPolling(); // Schedule next poll
      }, pollInterval);
    };
    
    setupPolling(); // Start polling
    
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [filterType, pollInterval]); // Simplified dependencies

  // Setup broadcast channel for real-time updates
  useEffect(() => {
    if (!enableBroadcast) return;

    broadcastChannelRef.current = new BroadcastChannel('inform-content-updates');
    
    const handleMessage = (event: MessageEvent) => {
      const { type } = event.data;
      
      if (type === 'content-updated') {
        console.log('📡 Received broadcast update signal, refreshing content...');
        if (fetchContentRef.current) {
          fetchContentRef.current(true); // Silent refresh on broadcast
        }
      }
    };

    broadcastChannelRef.current.addEventListener('message', handleMessage);

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleMessage);
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [enableBroadcast]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true; // Ensure it's set to true on mount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const forceRefresh = useCallback(() => {
    if (fetchContentRef.current) {
      fetchContentRef.current(false); // Manual refresh (show loading)
    }
  }, []);

  return {
    content: state.content,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    forceRefresh
  };
} 