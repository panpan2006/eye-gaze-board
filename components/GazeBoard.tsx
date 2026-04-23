//Apply the slowness of the eye tracking from calibration to here 

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useWordPrediction } from '@/hooks/useWordPrediction';
import { speak, stopSpeaking } from '@/lib/tts';
import { GazeFilter } from '@/lib/gazeFilter';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '1234567890'.split('');
const ALL_SYMBOLS = [...LETTERS, ...NUMBERS];
const SCAN_INTERVAL = 4000;
const DWELL_TIME = 1000;
const STABILITY_THRESHOLD = 150;

export default function GazeBoard() {
  const [currentWord, setCurrentWord] = useState('');
  const [sentence, setSentence] = useState('');
  const [scanIndex, setScanIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [gazePoint, setGazePoint] = useState<{ x: number; y: number } | null>(null);
  const [gazedButton, setGazedButton] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);

  const { suggestions, isLoading: suggestionsLoading } = useWordPrediction(currentWord, sentence);

  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scanIndexRef = useRef(0);
  const webgazerRef = useRef<any>(null);
  const gazeFilterRef = useRef(new GazeFilter(0.1, 5, 18));
  const buttonRefsMap = useRef<Map<string, DOMRect>>(new Map());
  const boardRef = useRef<HTMLDivElement>(null);
  const dwellAnimRef = useRef<number | null>(null);
  const dwellStartRef = useRef<number | null>(null);
  const currentGazedRef = useRef<string | null>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);
  

  // Refs to always hold latest values — fixes stale closure bugs in dwell animation
  const currentWordRef = useRef(currentWord);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);

  const sentenceRef = useRef(sentence);
  useEffect(() => { sentenceRef.current = sentence; }, [sentence]);


  const updateButtonRects = useCallback(() => {
    boardRef.current?.querySelectorAll('[data-button]').forEach((el) => {
      const label = (el as HTMLElement).dataset.button!;
      buttonRefsMap.current.set(label, el.getBoundingClientRect());
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateButtonRects);
    return () => window.removeEventListener('resize', updateButtonRects);
  }, [updateButtonRects]);

  useEffect(() => { setTimeout(updateButtonRects, 100); }, [suggestions, updateButtonRects]);

  const getButtonAtCoords = useCallback((x: number, y: number): string | null => {
    for (const [label, rect] of buttonRefsMap.current.entries()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return label;
    }
    return null;
  }, []);

const resetScan = useCallback(() => {
  if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  scanTimerRef.current = null;
  setScanIndex(0); scanIndexRef.current = 0;
  const tick = () => {
scanTimerRef.current = setTimeout(() => {
  const next = (scanIndexRef.current + 1) % ALL_SYMBOLS.length;
  scanIndexRef.current = next;
  setScanIndex(next);
  console.log('scan advanced to:', next, ALL_SYMBOLS[next]);
  tick();
}, SCAN_INTERVAL);
  };
  tick();
}, []);

const startScanning = useCallback(() => {
  if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
  setScanIndex(0); scanIndexRef.current = 0; setIsScanning(true);
  const tick = () => {
    scanTimerRef.current = setTimeout(() => {
      const next = (scanIndexRef.current + 1) % ALL_SYMBOLS.length;
      scanIndexRef.current = next; setScanIndex(next); tick();
    }, SCAN_INTERVAL);
  };
  tick();
}, []);

  const stopScanning = useCallback(() => {
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    setIsScanning(false);
  }, []);

  const handleSpeak = useCallback(async () => {
    // Read from ref so we always get the latest sentence value
    const fullText = sentenceRef.current.trim();
    if (!fullText) return;
    setIsSpeaking(true);
    try {
      await speak(fullText, { rate: 0.85, pitch: 1, volume: 1 });
    } catch (e) { console.error(e); }
    finally {
      setIsSpeaking(false);
      setSentence(''); setCurrentWord('');
    }
  }, []);

  const handleButtonSelect = useCallback((button: string) => {
    // All state reads use refs to avoid stale closure issues inside dwell animation frames
    if (button === 'SELECT') {
  const idx = scanIndexRef.current;
  const letter = ALL_SYMBOLS[idx];
  console.log('SELECT pressed, idx:', idx, 'letter:', letter);
  setCurrentWord(prev => prev + letter);
  resetScan();
    } else if (button === 'SPACE') {
      const word = currentWordRef.current;
      if (word.trim()) {
        setSentence(prev => (prev ? prev + ' ' : '') + word.trim());
        setCurrentWord('');
      }
      resetScan();
    } else if (button === 'DELETE') {
      if (currentWordRef.current.length > 0) {
        setCurrentWord(prev => prev.slice(0, -1));
      } else {
        setSentence(prev => {
          const words = prev.trim().split(' ');
          words.pop();
          return words.join(' ');
        });
      }
      resetScan();
    } else if (button === 'SPEAK') {
      const word = currentWordRef.current;
      if (word.trim()) {
        setSentence(prev => (prev ? prev + ' ' : '') + word.trim());
        setCurrentWord('');
      }
      // setTimeout so sentence state updates before handleSpeak reads sentenceRef
      setTimeout(() => handleSpeak(), 0);
    } else if (button === 'CLEAR') {
      setSentence(''); setCurrentWord(''); stopSpeaking(); setIsSpeaking(false); resetScan();
    } else if (button.startsWith('SUGGESTION_')) {
      setCurrentWord(button.replace('SUGGESTION_', '').toUpperCase()); resetScan();
    }
  }, [handleSpeak, resetScan]);

  // Ref to latest handleButtonSelect — prevents stale closure in startDwell's rAF loop
  const handleButtonSelectRef = useRef(handleButtonSelect);
  useEffect(() => { handleButtonSelectRef.current = handleButtonSelect; }, [handleButtonSelect]);

  const stopDwell = useCallback(() => {
    if (stabilityTimerRef.current) { clearTimeout(stabilityTimerRef.current); stabilityTimerRef.current = null; }
    currentGazedRef.current = null; dwellStartRef.current = null;
    if (dwellAnimRef.current) cancelAnimationFrame(dwellAnimRef.current);
    setGazedButton(null); setDwellProgress(0);
  }, []);

  const startDwell = useCallback((button: string) => {
    currentGazedRef.current = button;
    stabilityTimerRef.current = setTimeout(() => {
      if (currentGazedRef.current !== button) return;
      dwellStartRef.current = Date.now();
      setGazedButton(button); setDwellProgress(0);
      const animate = () => {
        if (currentGazedRef.current !== button || !dwellStartRef.current) return;
        const progress = Math.min((Date.now() - dwellStartRef.current) / DWELL_TIME, 1);
        setDwellProgress(progress);
        if (progress < 1) {
          dwellAnimRef.current = requestAnimationFrame(animate);
        } else {
          // Always call via ref so we get the latest handleButtonSelect
          handleButtonSelectRef.current(button);
          setTimeout(() => {
            if (currentGazedRef.current === button) {
              setGazedButton(null); setDwellProgress(0);
              dwellStartRef.current = null; currentGazedRef.current = null;
            }
          }, 300);
        }
      };
      dwellAnimRef.current = requestAnimationFrame(animate);
    }, STABILITY_THRESHOLD);
  }, []);

   const startDwellRef = useRef(startDwell);
    useEffect(() => { startDwellRef.current = startDwell; }, [startDwell]);

    const stopDwellRef = useRef(stopDwell);
    useEffect(() => { stopDwellRef.current = stopDwell; }, [stopDwell]);

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
      updateButtonRects();
    wg.setGazeListener((data: any) => {
  if (!data) return;
  const f = gazeFilterRef.current.filter(data.x, data.y);
  setGazePoint({ x: f.x, y: f.y });
  const btn = getButtonAtCoords(f.x, f.y);

  // If currently dwelling on a button, require gaze to fully
  // leave that button before switching — prevents jitter cancelling dwell
  if (currentGazedRef.current && btn === null) {
    // Gaze left a button entirely — cancel dwell
    stopDwellRef.current();
  } else if (btn !== null && btn !== currentGazedRef.current) {
    // Gaze moved to a different button
    stopDwellRef.current();
    startDwellRef.current(btn);
  }
  // If btn === currentGazedRef.current, do nothing — keep dwelling
});
      const isReady = wg.isReady ? wg.isReady() : false;
      if (!isReady) await wg.begin();
      wg.applyKalmanFilter(true);
      wg.showVideo(true);
      wg.showFaceOverlay(true);
      wg.showFaceFeedbackBox(true);
      wg.showPredictionPoints(false);
      setIsTracking(true); setIsLoading(false);
      startScanning(); setIsScanning(true);
    } catch (e: any) { setIsLoading(false); }
  }, [getButtonAtCoords, startDwell, stopDwell, updateButtonRects, startScanning]);

  const stopTracking = useCallback(() => {
    if (webgazerRef.current) {
      try { webgazerRef.current.pause(); webgazerRef.current.clearGazeListener(); webgazerRef.current.end(); } catch (e) {}
      webgazerRef.current = null;
    }
    stopDwell(); stopScanning(); stopSpeaking();
    setIsTracking(false); setIsSpeaking(false);
  }, [stopDwell, stopScanning]);

  const CursorIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 1 L4 20 L8.5 15.5 L11.5 22 L13.5 21 L10.5 14.5 L17 14.5 Z" />
    </svg>
  );
  const SpaceIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19H2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4z" />
      <line x1="6" y1="19" x2="6" y2="23" /><line x1="18" y1="19" x2="18" y2="23" />
    </svg>
  );
  const DeleteIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  );
  const SpeakIcon = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );

  const ACTION_BUTTONS = [
    { id: 'DELETE', label: 'DELETE', icon: <DeleteIcon /> },
    { id: 'SELECT', label: 'SELECT', icon: <CursorIcon /> },
    { id: 'SPACE',  label: 'SPACE',  icon: <SpaceIcon /> },
    { id: 'SPEAK',  label: 'SPEAK',  icon: <SpeakIcon /> },
  ];

  const DwellPanel = ({
    id, isGazed, children, style, onClick
  }: {
    id: string;
    isGazed: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
    onClick?: () => void;
  }) => (
    <div
      data-button={id}
      onClick={onClick}
      style={{
        position: 'relative',
        background: isGazed
          ? 'linear-gradient(145deg, #18182f 0%, #13132a 100%)'
          : 'linear-gradient(145deg, #131313 0%, #0f0f0f 100%)',
        border: `1px solid ${isGazed ? '#6366f1' : '#1f1f1f'}`,
        borderRadius: '14px',
        boxShadow: isGazed
          ? '0 0 28px rgba(99,102,241,0.2), 0 2px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 2px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border 0.15s, box-shadow 0.15s, background 0.15s',
        ...style,
      }}
    >
      {/* Dwell fill */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%',
        height: isGazed ? `${dwellProgress * 100}%` : '0%',
        background: 'linear-gradient(to top, rgba(99,102,241,0.18), transparent)',
        transition: 'height 0.05s linear', pointerEvents: 'none',
      }} />
      {/* Dwell border trace */}
      {isGazed && (
        <svg style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%', pointerEvents: 'none',
        }} viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="1" y="1" width="98" height="98" rx="8"
            fill="none" stroke="#6366f1" strokeWidth="1.5"
            strokeDasharray={`${dwellProgress * 392} 392`}
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </div>
  );

  return (
    <div ref={boardRef} style={{
      height: '100vh', width: '100vw',
      background: '#080808',
      fontFamily: "'JetBrains Mono', monospace",
      display: 'grid',
      gridTemplateRows: '90px 140px 130px 1fr',
      gridTemplateColumns: '1fr',
      padding: '12px',
      gap: '10px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      color: 'white',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      {/* ── ROW 1: Sentence box + Start/Stop ── */}
      <div style={{ display: 'flex', gap: '10px', marginLeft: '310px' }}>

        {/* Sentence box */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(145deg, #131313 0%, #0f0f0f 100%)',
          border: '1px solid #6366f1',
          borderRadius: '14px',
          boxShadow: '0 0 28px rgba(99,102,241,0.2), 0 2px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}>
          <span style={{
            fontSize: '1rem',
            fontWeight: '600',
            letterSpacing: '0.06em',
            color: 'white',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
          }}>
            {sentence && <span style={{ color: 'white' }}>{sentence} </span>}
            <span style={{ color: 'white' }}>{currentWord}</span>
            <span style={{
              display: 'inline-block', width: '2px', height: '1.8rem',
              background: '#6366f1', marginLeft: '3px', verticalAlign: 'middle',
              animation: 'blink 1s step-end infinite',
            }} />
          </span>
        </div>

        {/* Start / Stop */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, width: '110px' }}>
          <button onClick={startTracking} disabled={isLoading || isTracking} style={{
            flex: 1, fontWeight: '700', fontSize: '0.8rem',
            letterSpacing: '0.1em',
            background: isTracking
              ? 'linear-gradient(145deg, #131313, #0f0f0f)'
              : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: isTracking ? '#333' : 'white',
            border: isTracking ? '1px solid #1f1f1f' : '1px solid #6366f1',
            borderRadius: '10px',
            cursor: isTracking ? 'not-allowed' : 'pointer',
            boxShadow: isTracking ? 'none' : '0 0 20px rgba(99,102,241,0.35)',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}>
            {isLoading ? '...' : 'START'}
          </button>
          <button onClick={stopTracking} disabled={!isTracking} style={{
            flex: 1, fontWeight: '700', fontSize: '0.8rem',
            letterSpacing: '0.1em',
            background: !isTracking
              ? 'linear-gradient(145deg, #131313, #0f0f0f)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: !isTracking ? '#333' : 'white',
            border: !isTracking ? '1px solid #1f1f1f' : '1px solid #ef4444',
            borderRadius: '10px',
            cursor: !isTracking ? 'not-allowed' : 'pointer',
            boxShadow: !isTracking ? 'none' : '0 0 20px rgba(239,68,68,0.35)',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}>
            STOP
          </button>
        </div>
      </div>

      {/* ── ROW 2: Alphabet scanner (no panel background) ── */}
      <div style={{ marginLeft: '310px' }}>
        <div style={{
          height: '100%',
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '8px',
        }}>
          {/* Letters */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {LETTERS.map((letter) => {
              const isActive = ALL_SYMBOLS[scanIndex] === letter && isScanning;
              return (
                <div key={letter} style={{
                  width: '34px', height: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#fff' : 'white',
                  background: isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  borderRadius: '7px',
                  border: isActive ? '1px solid #6366f1' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
                  transition: 'all 0.12s ease',
                }}>
                  {letter}
                </div>
              );
            })}
          </div>
          {/* Numbers */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            {NUMBERS.map((num) => {
              const isActive = ALL_SYMBOLS[scanIndex] === num && isScanning;
              return (
                <div key={num} style={{
                  width: '34px', height: '34px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: isActive ? '700' : '500',
                  color: isActive ? '#fff' : 'white',
                  background: isActive ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'transparent',
                  borderRadius: '7px',
                  border: isActive ? '1px solid #6366f1' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
                  transition: 'all 0.12s ease',
                }}>
                  {num}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Word suggestions ── */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {suggestions.length > 0 || suggestionsLoading ? (
          (suggestionsLoading
            ? [{ word: '', score: 0 }, { word: '', score: 0 }, { word: '', score: 0 }, { word: '', score: 0 }]
            : suggestions
          ).map((s, i) => {
            const id = `SUGGESTION_${s.word}`;
            const isGazed = gazedButton === id;
            return (
              <DwellPanel
                key={s.word || i} id={id} isGazed={isGazed}
                onClick={() => s.word && handleButtonSelect(id)}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <span style={{
                  position: 'relative', zIndex: 1,
                  color: isGazed ? '#a5b4fc' : (suggestionsLoading ? '#1a1a1a' : 'white'),
                  fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.08em',
                }}>
                  {s.word}
                </span>
              </DwellPanel>
            );
          })
        ) : (
          <div style={{ flex: 1, borderRadius: '14px', border: '1px solid #111' }} />
        )}
      </div>

      {/* ── ROW 4: Action buttons ── */}
      <div style={{ display: 'flex', gap: '10px', height: '100%' }}>
        {ACTION_BUTTONS.map(({ id, label, icon }) => {
          const isGazed = gazedButton === id;
          return (
            <DwellPanel
              key={id} id={id} isGazed={isGazed}
              onClick={() => handleButtonSelect(id)}
              style={{
                flex: 1, height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '10px',
                color: isGazed ? '#a5b4fc' : 'white',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1, transition: 'color 0.15s' }}>
                {icon}
              </div>
              <span style={{
                position: 'relative', zIndex: 1,
                fontSize: '1rem', fontWeight: '800',
                letterSpacing: '0.12em',
                color: isGazed ? '#a5b4fc' : 'white',
                transition: 'color 0.15s',
              }}>
                {label}
              </span>
            </DwellPanel>
          );
        })}
      </div>

      {/* Gaze dot */}
      {isTracking && gazePoint && (
        <div style={{
          position: 'fixed', left: gazePoint.x, top: gazePoint.y,
          width: '14px', height: '14px', borderRadius: '50%',
          background: 'rgba(99,102,241,0.4)', border: '2px solid #6366f1',
          transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 9999,
          transition: 'left 0.04s, top 0.04s',
          boxShadow: '0 0 10px rgba(99,102,241,0.5)',
        }} />
      )}
    </div>
  );
}

