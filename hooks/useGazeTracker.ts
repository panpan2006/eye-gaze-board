'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
}
interface GazeData {
  x: number;
  y: number;
}

interface UseGazeTrackerOptions {
  onGaze?: (point: GazePoint) => void;
  throttleMs?: number; // how often to update, default 50ms
}

interface UseGazeTrackerReturn {
  isLoading: boolean;
  isRunning: boolean;
  error: string | null;
  currentGaze: GazePoint | null;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

export function useGazeTracker(
  options: UseGazeTrackerOptions = {}
): UseGazeTrackerReturn {
  const { onGaze, throttleMs = 50 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGaze, setCurrentGaze] = useState<GazePoint | null>(null);

  const webgazerRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopTracking = useCallback(() => {
    if (webgazerRef.current) {
      webgazerRef.current.end();
      webgazerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsRunning(false);
    }
  }, []);

const startTracking = useCallback(async () => {
  setIsLoading(true);
  setError(null);

  try {
    // Wait for WebGazer to be available on window
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.webgazer) {
          clearInterval(interval);
          resolve();
        }
        if (attempts > 20) {
          clearInterval(interval);
          reject(new Error('WebGazer failed to load. Try refreshing the page.'));
        }
      }, 500);
    });

    const webgazer = window.webgazer;
    webgazerRef.current = webgazer;

    webgazer
      .setRegression('ridge')
      .showVideo(true)
      .showFaceOverlay(true)
      .showFaceFeedbackBox(true)
      .showPredictionPoints(true);

    webgazer.setGazeListener((data: GazeData | null, timestamp: number) => {
      if (!data || !isMountedRef.current) return;

      const now = Date.now();
      if (now - lastUpdateRef.current < throttleMs) return;
      lastUpdateRef.current = now;

      const point: GazePoint = {
        x: Math.round(data.x),
        y: Math.round(data.y),
        timestamp,
      };

      setCurrentGaze(point);
      onGaze?.(point);
    });

    await webgazer.begin();

    if (isMountedRef.current) {
      setIsRunning(true);
      setIsLoading(false);
    }
  } catch (err: any) {
    if (isMountedRef.current) {
      setError(err?.message ?? 'Failed to start eye tracking');
      setIsLoading(false);
    }
  }
}, [onGaze, throttleMs]);

  // Clean up when the component using this hook unmounts
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isLoading,
    isRunning,
    error,
    currentGaze,
    startTracking,
    stopTracking,
  };
}