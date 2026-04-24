'use client';

import { useEffect, useRef, useCallback } from 'react';

export type TiltAction = 'SELECT' | 'SPACE' | 'SPEAK' | null;

interface FaceOrientationOptions {
  // How far (in degrees) the head must tilt before registering — from calibration
  tiltThreshold?: number;
  // How long (ms) a tilt must be held before firing
  dwellMs?: number;
  // How long (ms) right-tilt must be held to trigger SPEAK instead of SPACE
  speakHoldMs?: number;
  // Smoothing: number of frames to average roll over
  smoothingFrames?: number;
  onAction: (action: TiltAction) => void;
}

// WebGazer exposes raw face data via a face overlay module.
// The face mesh keypoints let us compute a roll angle from
// the line between left-eye and right-eye landmarks.
// keypoint indices (MediaPipe 468-point mesh):
//   left eye outer corner  = 33
//   right eye outer corner = 263
const LEFT_EYE_IDX  = 33;
const RIGHT_EYE_IDX = 263;

// Degrees of tilt we consider "neutral" — populated on mount
const DEFAULT_THRESHOLD = 12; // degrees

export function useFaceOrientation({
  tiltThreshold = DEFAULT_THRESHOLD,
  dwellMs = 600,
  speakHoldMs = 1800,
  smoothingFrames = 6,
  onAction,
}: FaceOrientationOptions) {
  const rollHistory   = useRef<number[]>([]);
  const tiltStartRef  = useRef<number | null>(null);
  const lastTiltDir   = useRef<'left' | 'right' | null>(null);
  const spokeFiredRef = useRef(false);
  const onActionRef   = useRef(onAction);

  useEffect(() => { onActionRef.current = onAction; }, [onAction]);

  // Compute roll angle (degrees) from two 2-D points
  const getRollDeg = useCallback((lx: number, ly: number, rx: number, ry: number): number => {
    const dx = rx - lx;
    const dy = ry - ly;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, []);

  // Smooth roll by keeping a rolling window average
  const smoothRoll = useCallback((raw: number): number => {
    rollHistory.current.push(raw);
    if (rollHistory.current.length > smoothingFrames) {
      rollHistory.current.shift();
    }
    const sum = rollHistory.current.reduce((a, b) => a + b, 0);
    return sum / rollHistory.current.length;
  }, [smoothingFrames]);

  const processTilt = useCallback((roll: number) => {
    const now = Date.now();

    const isLeft  = roll < -tiltThreshold;
    const isRight = roll >  tiltThreshold;
    const dir: 'left' | 'right' | null = isLeft ? 'left' : isRight ? 'right' : null;

    if (dir === null) {
      // Back to neutral — reset
      tiltStartRef.current  = null;
      lastTiltDir.current   = null;
      spokeFiredRef.current = false;
      return;
    }

    if (dir !== lastTiltDir.current) {
      // New tilt direction — start timer
      tiltStartRef.current  = now;
      lastTiltDir.current   = dir;
      spokeFiredRef.current = false;
      return;
    }

    // Same direction — check how long it's been held
    const heldMs = now - (tiltStartRef.current ?? now);

    if (dir === 'right') {
      if (!spokeFiredRef.current && heldMs >= speakHoldMs) {
        spokeFiredRef.current = true;
        onActionRef.current('SPEAK');
      } else if (!spokeFiredRef.current && heldMs >= dwellMs) {
        // Don't fire SPACE yet — wait to see if SPEAK threshold is hit.
        // SPACE fires only on release (handled below by dir change to null),
        // so we mark a "space pending" here but don't fire until they return to neutral.
        // We use a separate flag for this:
        (tiltStartRef as any)._spacePending = true;
      }
    }

    if (dir === 'left' && heldMs >= dwellMs) {
      // SELECT fires once per tilt-left gesture
      onActionRef.current('SELECT');
      // Reset so it doesn't fire again until they return to neutral
      tiltStartRef.current = now + 99999; // effectively mute until neutral
    }
  }, [tiltThreshold, dwellMs, speakHoldMs]);

  // Fire SPACE when right-tilt releases (if SPEAK wasn't fired)
  const processRelease = useCallback((prevDir: 'left' | 'right' | null) => {
    if (
      prevDir === 'right' &&
      !spokeFiredRef.current &&
      (tiltStartRef as any)._spacePending
    ) {
      onActionRef.current('SPACE');
    }
    (tiltStartRef as any)._spacePending = false;
  }, []);

 useEffect(() => {
  let animFrame: number;
  let lastDir: 'left' | 'right' | null = null;

  const tick = () => {
    const wg = (window as any).webgazer;
    const tracker = wg?.getTracker?.();
    const positions = tracker?.positionsArray;

    if (positions && positions.length > Math.max(LEFT_EYE_IDX, RIGHT_EYE_IDX)) {
      const lp = positions[LEFT_EYE_IDX];
      const rp = positions[RIGHT_EYE_IDX];

      if (lp && rp) {
        const rawRoll = getRollDeg(lp[0], lp[1], rp[0], rp[1]);
        const smoothed = smoothRoll(rawRoll);

        const curDir: 'left' | 'right' | null =
          smoothed < -tiltThreshold ? 'left' :
          smoothed >  tiltThreshold ? 'right' : null;

        if (lastDir !== null && curDir === null) {
          processRelease(lastDir);
        }
        lastDir = curDir;
        processTilt(smoothed);
      }
    }

    animFrame = requestAnimationFrame(tick);
  };

  animFrame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(animFrame);
}, [getRollDeg, smoothRoll, processTilt, processRelease, tiltThreshold]);
      }

