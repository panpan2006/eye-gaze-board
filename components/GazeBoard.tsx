'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { speak, stopSpeaking } from '@/lib/tts';
import { useFaceOrientation } from '@/hooks/useFaceOrientation';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS  = '1234567890'.split('');
const ALL_SYMBOLS = [...LETTERS, ...NUMBERS];
const SCAN_INTERVAL = 1000; // ms per letter advance

// ─── Tilt indicator icons ─────────────────────────────────────────────────────

const TiltLeftIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M5 12l7-7M5 12l7 7" />
    <path d="M12 3c0 3-2 5-2 9s2 6 2 9" strokeDasharray="3 2" opacity="0.5" />
  </svg>
);

const TiltRightIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M19 12l-7-7M19 12l-7 7" />
    <path d="M12 3c0 3 2 5 2 9s-2 6-2 9" strokeDasharray="3 2" opacity="0.5" />
  </svg>
);

const SpeakHoldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

// ─── Main component ────────────────────────────────────────────────────────────

export default function GazeBoard() {
  const [currentWord, setCurrentWord]   = useState('');
  const [sentence, setSentence]         = useState('');
  const [scanIndex, setScanIndex]       = useState(0);
  const [isScanning, setIsScanning]     = useState(false);
  const [isTracking, setIsTracking]     = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  // Visual feedback: which tilt gesture is currently active
  const [activeTilt, setActiveTilt]     = useState<'left' | 'right' | 'speak' | null>(null);

  // ── Refs ──
  const scanTimerRef    = useRef<NodeJS.Timeout | null>(null);
  const scanIndexRef    = useRef(0);
  const webgazerRef     = useRef<any>(null);

  // Stable refs for latest state — fixes stale closure bugs
  const currentWordRef = useRef(currentWord);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);

  const sentenceRef = useRef(sentence);
  useEffect(() => { sentenceRef.current = sentence; }, [sentence]);

  // ── Scanner ───────────────────────────────────────────────────────────────

  const stopScanning = useCallback(() => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    setIsScanning(false);
  }, []);

  const startScanFrom = useCallback((startIdx: number) => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setScanIndex(startIdx);
    scanIndexRef.current = startIdx;
    setIsScanning(true);

    const tick = () => {
      scanTimerRef.current = setTimeout(() => {
        const next = (scanIndexRef.current + 1) % ALL_SYMBOLS.length;
        scanIndexRef.current = next;
        setScanIndex(next);
        tick();
      }, SCAN_INTERVAL);
    };
    tick();
  }, []);

  const resetScan = useCallback(() => {
    startScanFrom(0);
  }, [startScanFrom]);

  // ── Speak ─────────────────────────────────────────────────────────────────

const handleSpeak = useCallback(async () => {
  const fullText = sentenceRef.current.trim();
  if (!fullText) return;
  setIsSpeaking(true);
  stopScanning();

  try {
    const res = await fetch('/api/expand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: fullText }),
    });
    const { sentence } = await res.json();
    const textToSpeak = sentence ?? fullText;

    await speak(textToSpeak, { rate: 0.85, pitch: 1, volume: 1 });
  } catch (e) {
    console.error(e);
    await speak(fullText, { rate: 0.85, pitch: 1, volume: 1 });
  } finally {
    setIsSpeaking(false);
    setSentence('');
    setCurrentWord('');
    startScanFrom(0);
  }
}, [stopScanning, startScanFrom]);

  // ── Action handler — called by head tilt gestures ─────────────────────────

  const handleAction = useCallback((action: 'SELECT' | 'SPACE' | 'SPEAK' | null) => {
    if (!action) return;

    if (action === 'SELECT') {
      const letter = ALL_SYMBOLS[scanIndexRef.current];
      setCurrentWord(prev => prev + letter);
      setActiveTilt('left');
      setTimeout(() => setActiveTilt(null), 400);
      resetScan();

    } else if (action === 'SPACE') {
      const word = currentWordRef.current;
      if (word.trim()) {
        setSentence(prev => (prev ? prev + ' ' : '') + word.trim());
        setCurrentWord('');
      }
      setActiveTilt('right');
      setTimeout(() => setActiveTilt(null), 400);
      resetScan();

    } else if (action === 'SPEAK') {
      // Flush current word into sentence first
      const word = currentWordRef.current;
      if (word.trim()) {
        setSentence(prev => (prev ? prev + ' ' : '') + word.trim());
        setCurrentWord('');
      }
      setActiveTilt('speak');
      setTimeout(() => setActiveTilt(null), 600);
      setTimeout(() => handleSpeak(), 50);
    }
  }, [handleSpeak, resetScan]);

  // ── Face orientation hook ─────────────────────────────────────────────────

  useFaceOrientation({
    tiltThreshold: 12,
    dwellMs: 350,
    speakHoldMs: 1500,
    smoothingFrames: 3,
    onAction: handleAction,
  });

  // ── WebGazer lifecycle ────────────────────────────────────────────────────

  const startTracking = useCallback(async () => {
    setIsLoading(true);
    let wg: any = null;
    for (let i = 0; i < 20; i++) {
      if ((window as any).webgazer) { wg = (window as any).webgazer; break; }
      await new Promise(r => setTimeout(r, 500));
    }
    if (!wg) { setIsLoading(false); return; }

    webgazerRef.current = wg;
    try {
      const isReady = wg.isReady ? wg.isReady() : false;
      if (!isReady) await wg.begin();

      wg.applyKalmanFilter(true);
      wg.showVideo(true);
      wg.showFaceOverlay(true);
      wg.showFaceFeedbackBox(true);
      wg.showPredictionPoints(false);
      // We don't need gaze point data — clear the listener to save CPU
      wg.setGazeListener(() => {});
    

      setIsTracking(true);
      setIsLoading(false);
      startScanFrom(0);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  }, [startScanFrom]);

  const stopTracking = useCallback(() => {
    if (webgazerRef.current) {
      try {
        webgazerRef.current.pause();
        webgazerRef.current.clearGazeListener();
        webgazerRef.current.end();
      } catch (e) {}
      webgazerRef.current = null;
    }
    stopScanning();
    stopSpeaking();
    setIsTracking(false);
    setIsSpeaking(false);
    setActiveTilt(null);
  }, [stopScanning]);

  // ── Render ────────────────────────────────────────────────────────────────

  const HINT_ROWS = [
    {
      id:    'left',
      icon:  <TiltRightIcon />,
      label: 'TILT RIGHT',
      sub:   'SELECT LETTER',
      color: '#6366f1',
    },
    {
      id:    'right',
      icon:  <TiltLeftIcon />,
      label: 'TILT LEFT',
      sub:   'ADD SPACE',
      color: '#6366f1',
    },
    {
      id:    'speak',
      icon:  <SpeakHoldIcon />,
      label: 'HOLD LEFT',
      sub:   'SPEAK SENTENCE',
      color: '#a78bfa',
    },
  ];

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: '#080808',
      fontFamily: "'JetBrains Mono', monospace",
      display: 'grid',
      gridTemplateRows: '80px 1fr 100px',
      gridTemplateColumns: '1fr',
      padding: '14px',
      gap: '12px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      color: 'white',
    }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes tilt-flash { 0%{opacity:1} 100%{opacity:0} }
      `}</style>

      {/* ── ROW 1: Sentence bar + Start/Stop ── */}
      <div style={{ display: 'flex', gap: '10px', marginLeft: '330px' }}>

        {/* Sentence display */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(145deg, #131313 0%, #0f0f0f 100%)',
          border: '1px solid #6366f1',
          borderRadius: '14px',
          boxShadow: '0 0 28px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.04)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          <span style={{
            fontSize: '1.05rem',
            fontWeight: '600',
            letterSpacing: '0.07em',
            color: 'white',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
          }}>
            {sentence && <span style={{ color: '#a5a5a5' }}>{sentence} </span>}
            <span style={{ color: 'white' }}>{currentWord}</span>
            <span style={{
              display: 'inline-block',
              width: '2px',
              height: '1.6rem',
              background: '#6366f1',
              marginLeft: '3px',
              verticalAlign: 'middle',
              animation: 'blink 1s step-end infinite',
            }} />
          </span>
        </div>

        {/* Start / Stop */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          flexShrink: 0,
          width: '108px',
        }}>
          <button
            onClick={startTracking}
            disabled={isLoading || isTracking}
            style={{
              flex: 1,
              fontFamily: 'inherit',
              fontWeight: '700',
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              background: isTracking
                ? 'linear-gradient(145deg, #131313, #0f0f0f)'
                : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: isTracking ? '#2a2a2a' : 'white',
              border: isTracking ? '1px solid #1a1a1a' : '1px solid #6366f1',
              borderRadius: '10px',
              cursor: isTracking ? 'not-allowed' : 'pointer',
              boxShadow: isTracking ? 'none' : '0 0 20px rgba(99,102,241,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? '...' : 'START'}
          </button>
          <button
            onClick={stopTracking}
            disabled={!isTracking}
            style={{
              flex: 1,
              fontFamily: 'inherit',
              fontWeight: '700',
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              background: !isTracking
                ? 'linear-gradient(145deg, #131313, #0f0f0f)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: !isTracking ? '#2a2a2a' : 'white',
              border: !isTracking ? '1px solid #1a1a1a' : '1px solid #ef4444',
              borderRadius: '10px',
              cursor: !isTracking ? 'not-allowed' : 'pointer',
              boxShadow: !isTracking ? 'none' : '0 0 20px rgba(239,68,68,0.3)',
              transition: 'all 0.2s',
            }}
          >
            STOP
          </button>
        </div>
      </div>

      {/* ── ROW 2: Full-height alphabet scanner ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '16px',
        padding: '8px 0',
      }}>

        {/* Letters row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {LETTERS.map((letter) => {
            const isActive = ALL_SYMBOLS[scanIndex] === letter && isScanning;
            return (
              <div
                key={letter}
                style={{
                  flex: 1,
                  height: '72px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: isActive ? '800' : '500',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                  background: isActive
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : 'transparent',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #6366f1' : '1px solid transparent',
                  boxShadow: isActive
                    ? '0 0 24px rgba(99,102,241,0.65), 0 0 6px rgba(99,102,241,0.3)'
                    : 'none',
                  transition: 'all 0.1s ease',
                  margin: '0 1px',
                }}
              >
                {letter}
              </div>
            );
          })}
        </div>

        {/* Numbers row */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
        }}>
          {NUMBERS.map((num) => {
            const isActive = ALL_SYMBOLS[scanIndex] === num && isScanning;
            return (
              <div
                key={num}
                style={{
                  width: '62px',
                  height: '62px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: isActive ? '800' : '500',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                  background: isActive
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : 'transparent',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #6366f1' : '1px solid transparent',
                  boxShadow: isActive
                    ? '0 0 24px rgba(99,102,241,0.65), 0 0 6px rgba(99,102,241,0.3)'
                    : 'none',
                  transition: 'all 0.1s ease',
                }}
              >
                {num}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ROW 3: Tilt instruction panel ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px',
      }}>
        {HINT_ROWS.map(({ id, icon, label, sub, color }) => {
          const isActive = activeTilt === id;
          return (
            <div
              key={id}
              style={{
                background: isActive
                  ? 'linear-gradient(145deg, #18182f 0%, #13132a 100%)'
                  : 'linear-gradient(145deg, #0e0e0e 0%, #0a0a0a 100%)',
                border: `1px solid ${isActive ? color : '#1a1a1a'}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '0 18px',
                transition: 'border 0.15s, background 0.15s',
                boxShadow: isActive ? `0 0 18px rgba(99,102,241,0.2)` : 'none',
              }}
            >
              <span style={{
                color: isActive ? color : 'rgba(255,255,255,0.18)',
                transition: 'color 0.15s',
                flexShrink: 0,
              }}>
                {icon}
              </span>
              <div>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  letterSpacing: '0.14em',
                  color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.25)',
                  transition: 'color 0.15s',
                }}>
                  {label}
                </div>
                <div style={{
                  fontSize: '0.6rem',
                  fontWeight: '500',
                  letterSpacing: '0.08em',
                  color: isActive ? 'rgba(196,181,253,0.6)' : 'rgba(255,255,255,0.12)',
                  marginTop: '2px',
                  transition: 'color 0.15s',
                }}>
                  {sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Speaking overlay */}
      {isSpeaking && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8,8,8,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          <SpeakHoldIcon />
          <span style={{
            fontSize: '1rem',
            fontWeight: '700',
            letterSpacing: '0.16em',
            color: '#a78bfa',
          }}>
            SPEAKING...
          </span>
        </div>
      )}
    </div>
  );
}
