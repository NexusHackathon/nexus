import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedFrame, Reading } from "../types";

const MAX_POINTS = 90;

export interface FeedState {
  latest: Reading | null;
  history: Reading[];
  connected: boolean;
}

/**
 * Subscribes to the backend WebSocket stream. On connect the server replays a
 * history snapshot, then pushes one frame per reading. Reconnects automatically
 * with exponential backoff so the dashboard self-heals if the backend restarts.
 */
export function useNexusFeed(): FeedState {
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const stoppedRef = useRef(false);

  const connect = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retriesRef.current = 0;
    };

    ws.onmessage = (ev: MessageEvent<string>) => {
      const frame = JSON.parse(ev.data) as FeedFrame;
      if (frame.type === "snapshot") {
        const hist = frame.history.slice(-MAX_POINTS);
        setHistory(hist);
        if (hist.length > 0) setLatest(hist[hist.length - 1]);
      } else {
        setLatest(frame.data);
        setHistory((prev) => [...prev, frame.data].slice(-MAX_POINTS));
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (stoppedRef.current) return;
      const delay = Math.min(8000, 500 * 2 ** retriesRef.current);
      retriesRef.current += 1;
      timerRef.current = window.setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      window.clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { latest, history, connected };
}
