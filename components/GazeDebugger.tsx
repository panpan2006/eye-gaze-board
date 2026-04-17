'use client';

import { useState, useCallback } from 'react';
import { useGazeTracker, GazePoint } from '@/hooks/useGazeTracker';

export default function GazeDebugger() {
  const [gazeLog, setGazeLog] = useState<GazePoint[]>([]);

  const handleGaze = useCallback((point: GazePoint) => {
    setGazeLog((prev) => [point, ...prev].slice(0, 20)); // keep last 20 entries
  }, []);

  const { isLoading, isRunning, error, currentGaze, startTracking, stopTracking } =
    useGazeTracker({ onGaze: handleGaze, throttleMs: 100 });

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <h1 className="text-2xl font-bold mb-2">Phase 1 — Gaze Tracker Debug</h1>
      <p className="text-gray-400 mb-6 text-sm">
        Click Start, allow camera access, and move your eyes around to see coordinates.
      </p>

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={startTracking}
          disabled={isLoading || isRunning}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 
                     disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
        >
          {isLoading ? 'Starting...' : 'Start Tracking'}
        </button>

        <button
          onClick={stopTracking}
          disabled={!isRunning}
          className="px-6 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 
                     disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
        >
          Stop Tracking
        </button>
      </div>

      {/* Status */}
      <div className="mb-6">
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm
          ${isRunning ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          {isRunning ? 'Tracking active' : isLoading ? 'Loading...' : 'Not running'}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Current gaze */}
      <div className="mb-8 p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h2 className="text-sm text-gray-400 mb-2 uppercase tracking-widest">Current Gaze</h2>
        {currentGaze ? (
          <div className="text-3xl font-bold text-cyan-400">
            x: {currentGaze.x}px &nbsp; y: {currentGaze.y}px
          </div>
        ) : (
          <div className="text-gray-600">No gaze data yet</div>
        )}
      </div>

      {/* Live dot overlay hint */}
      {isRunning && currentGaze && (
        <div
          className="fixed w-4 h-4 rounded-full bg-cyan-400 opacity-60 pointer-events-none
                     -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
          style={{ left: currentGaze.x, top: currentGaze.y }}
        />
      )}

      {/* Log */}
      <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
        <h2 className="text-sm text-gray-400 mb-3 uppercase tracking-widest">
          Gaze Log (last 20 points)
        </h2>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {gazeLog.length === 0 ? (
            <div className="text-gray-600 text-sm">Waiting for data...</div>
          ) : (
            gazeLog.map((point, i) => (
              <div
                key={point.timestamp}
                className={`text-sm ${i === 0 ? 'text-cyan-300' : 'text-gray-500'}`}
              >
                [{new Date(point.timestamp).toISOString().slice(11, 23)}]&nbsp;
                x={String(point.x).padStart(4, ' ')} y={String(point.y).padStart(4, ' ')}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}