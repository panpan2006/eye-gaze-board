'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface GazePoint {
  x: number;
  y: number;
  timestamp: number;
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
      // WebGazer must be imported dynamically — it accesses
      // the browser's window/navigator and cannot run on the server
      const webgazer = (await import('webgazer')).default;
      webgazerRef.current = webgazer;

      webgazer
        .setRegression('ridge')
        .showVideo(true)          // show camera feed (top-left by default)
        .showFaceOverlay(true)    // show face mesh overlay
        .showFaceFeedbackBox(true)// show the green alignment box
        .showPredictionPoints(true); // show the red dot where gaze is predicted

      webgazer.setGazeListener((data: { x: number; y: number } | null, timestamp: number) => {
        if (!data || !isMountedRef.current) return;

        // Throttle updates to avoid flooding React state
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