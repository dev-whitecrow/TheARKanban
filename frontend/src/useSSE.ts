import { useEffect, useRef, useState, useCallback } from 'react';

interface SSEEvent {
  type: string;
  task: Record<string, unknown>;
  source: string;
  timestamp: string;
}

export function useSSE(onEvent: (event: SSEEvent) => void) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/events');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.addEventListener('task:created', (e) => {
      onEventRef.current(JSON.parse(e.data));
    });

    es.addEventListener('task:updated', (e) => {
      onEventRef.current(JSON.parse(e.data));
    });

    es.addEventListener('task:deleted', (e) => {
      onEventRef.current(JSON.parse(e.data));
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Auto-reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
