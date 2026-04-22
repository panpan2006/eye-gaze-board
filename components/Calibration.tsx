'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GazeFilter } from '@/lib/gazeFilter';

interface CalibrationPoint {
  x: number;
  y: number;
  id: number;
}

const CALIBRATION_POINTS: CalibrationPoint[] = [
  { id: 1, x: 10, y: 50 },
  { id: 2, x: 30, y: 50 },
  { id: 3, x: 70, y: 50 },
  { id: 4, x: 90, y: 50 },
  { id: 5, x: 10, y: 90 },
  { id: 6, x: 30, y: 90 },
  { id: 7, x: 70, y: 90 },
  { id: 8, x: 90, y: 90 },
];

interface CalibrationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function Calibration({ onComplete, onSkip }: CalibrationProps) {
  const [currentPoint, setCurrentPoint] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | null>(null);
  const DWELL_TIME = 2500;
  const gazeFilterRef = useRef(new GazeFilter(0.2));

  const dwellStartRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const webgazerRef = useRef<any>(null);
  const currentPointRef = useRef(0);

  useEffect(() => {
    currentPointRef.current = currentPoint;
  }, [currentPoint]);

  const getPointPixels = (point: CalibrationPoint) => ({
    x: (point.x / 100) * window.innerWidth,
    y: (point.y / 100) * window.innerHeight,
  });

  const isGazingAtPoint = useCallback((
    gazeX: number,
    gazeY: number,
    point: CalibrationPoint,
    radius = 120
  ) => {
    const { x, y } = getPointPixels(point);
    const dist = Math.sqrt((gazeX - x) ** 2 + (gazeY - y) ** 2);
    return dist < radius;
  }, []);

  const advancePoint = useCallback(() => {
    const next = currentPointRef.current + 1;
    if (next >= CALIBRATION_POINTS.length) {
      setIsFinished(true);
      setProgress(0);
      return;
    }
    setCompleted(prev => [...prev, currentPointRef.current]);
    setCurrentPoint(next);
    setProgress(0);
    dwellStartRef.current = null;
  }, []);

  const recordCalibrationPoint = useCallback((point: CalibrationPoint) => {
    const wg = webgazerRef.current;
    if (!wg) return;
    const { x, y } = getPointPixels(point);
    wg.recordScreenPosition(x, y, 'click');
  }, []);

  useEffect(() => {
    const initWebGazer = async () => {
      let wg: any = null;
      for (let i = 0; i < 20; i++) {
        if ((window as any).webgazer) { wg = (window as any).webgazer; break; }
        await new Promise(r => setTimeout(r, 500));
      }
      if (!wg) return;
      webgazerRef.current = wg;

      wg.setGazeListener((data: any) => {
        if (!data) return;
        const filtered = gazeFilterRef.current.filter(data.x, data.y);
        const gx = filtered.x;
        const gy = filtered.y;
        setGazePoint({ x: gx, y: gy });

        const idx = currentPointRef.current;
        if (idx >= CALIBRATION_POINTS.length) return;
        const point = CALIBRATION_POINTS[idx];

        if (isGazingAtPoint(gx, gy, point)) {
          if (!dwellStartRef.current) {
            dwellStartRef.current = Date.now();
          }
          const elapsed = Date.now() - dwellStartRef.current;
          const p = Math.min(elapsed / DWELL_TIME, 1);
          setProgress(p);
          if (p >= 1) {
            recordCalibrationPoint(point);
            advancePoint();
          }
        } else {
          if (dwellStartRef.current) {
            dwellStartRef.current = null;
            setProgress(0);
          }
        }
      });

      await wg.begin();
      wg.showVideo(true);
      wg.showFaceOverlay(false);
      wg.showFaceFeedbackBox(true);
      wg.showPredictionPoints(false);
      wg.applyKalmanFilter(true);
    };

    initWebGazer();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isGazingAtPoint, recordCalibrationPoint, advancePoint]);

  const activePoint = CALIBRATION_POINTS[currentPoint];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#080808',
      zIndex: 1000,
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Instructions */}
      {!isFinished && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}>
          <div style={{
            color: 'white',
            fontSize: '1rem',
            fontFamily: "'JetBrains Mono', monospace",
            background: 'linear-gradient(145deg, #131313 0%, #0f0f0f 100%)',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            border: '1px solid #1f1f1f',
            boxShadow: '0 2px 20px rgba(0,0,0,0.7)',
          }}>
            👁 Look at each glowing dot until it fills completely
            <br />
            <span style={{ color: '#555', fontSize: '0.85rem' }}>
              Point {currentPoint + 1} of {CALIBRATION_POINTS.length}
            </span>
          </div>
        </div>
      )}

      {/* Calibration points */}
      {CALIBRATION_POINTS.map((point, idx) => {
        const isDone = completed.includes(idx);
        const isActive = idx === currentPoint && !isFinished;

        if (!isDone && !isActive) return null;

        const px = `${point.x}%`;
        const py = `${point.y}%`;
        const size = isActive ? 48 : 20;

        return (
          <div
            key={point.id}
            style={{
              position: 'absolute',
              left: px,
              top: py,
              transform: 'translate(-50%, -50%)',
              width: size,
              height: size,
              transition: 'width 0.3s, height 0.3s',
            }}
          >
            {/* Completed dot */}
            {isDone && (
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '10px',
                boxShadow: '0 0 8px rgba(99,102,241,0.4)',
              }}>
                ✓
              </div>
            )}

            {/* Active dot */}
            {isActive && (
              <>
                {/* Pulse ring */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid #6366f1',
                  animation: 'pulse-ring 1.5s ease-out infinite',
                }} />

                {/* Outer ring */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid #6366f144',
                }} />

                {/* Progress fill */}
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50" cy="50" r="44"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="8"
                    strokeDasharray={`${progress * 276} 276`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: 'stroke-dasharray 0.05s linear' }}
                  />
                </svg>

                {/* Center dot */}
                <div style={{
                  position: 'absolute',
                  inset: '30%',
                  borderRadius: '50%',
                  background: progress > 0.5 ? '#6366f1' : 'white',
                  transition: 'background 0.2s',
                }} />
              </>
            )}
          </div>
        );
      })}

      {/* Gaze dot */}
      {gazePoint && (
        <div style={{
          position: 'fixed',
          left: gazePoint.x,
          top: gazePoint.y,
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: 'rgba(99,102,241,0.4)',
          border: '2px solid #6366f1',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'left 0.03s, top 0.03s',
          boxShadow: '0 0 10px rgba(99,102,241,0.5)',
        }} />
      )}

      {/* Finished screen */}
      {isFinished && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          animation: 'fade-in 0.4s ease',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{ fontSize: '4rem' }}>🎯</div>
          <div style={{
            color: 'white',
            fontSize: '1.75rem',
            fontWeight: '500',
            letterSpacing: '0.05em',
          }}>
            Calibration Complete!
          </div>
          <div style={{
            color: '#555',
            fontSize: '1rem',
            textAlign: 'center',
            maxWidth: '400px',
            letterSpacing: '0.03em',
          }}>
            Your eye tracking is now calibrated.
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={onComplete}
              style={{
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white',
                border: '1px solid #6366f1',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                boxShadow: '0 0 20px rgba(99,102,241,0.35)',
              }}
            >
              Start using board →
            </button>
            <button
              onClick={() => {
                setCurrentPoint(0);
                setCompleted([]);
                setProgress(0);
                setIsFinished(false);
                dwellStartRef.current = null;
              }}
              style={{
                padding: '0.75rem 2rem',
                background: 'linear-gradient(145deg, #131313, #0f0f0f)',
                color: 'white',
                border: '1px solid #1f1f1f',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '500',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Recalibrate
            </button>
          </div>
        </div>
      )}

      {/* Skip button */}
      {!isFinished && (
        <button
          onClick={onSkip}
          style={{
            position: 'absolute',
            bottom: '2rem',
            right: '2rem',
            padding: '0.5rem 1rem',
            background: 'transparent',
            color: 'white',
            border: '1px solid #1f1f1f',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.08em',
          }}
        >
          SKIP CALIBRATION
        </button>
      )}
    </div>
  );
}
