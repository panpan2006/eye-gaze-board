'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import GazeTile from './GazeTile';
import TextDisplay from './TextDisplay';
import WordSuggestions from './WordSuggestions';
import { useWordPrediction } from '@/hooks/useWordPrediction';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = '0123456789'.split('');
const DWELL_TIME = 1000;

export default function GazeBoard() {
  const [currentWord, setCurrentWord] = useState('');
  const [sentence, setSentence] = useState('');
  const [gazedTile, setGazedTile] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Press Start to begin');
  const [gazePoint, setGazePoint] = useState<{x: number, y: number} | null>(null);

  const { suggestions, isLoading: suggestionsLoading } = useWordPrediction(currentWord, sentence);

  const tileRefs = useRef<Map<string, DOMRect>>(new Map());
  const boardRef = useRef<HTMLDivElement>(null);
  const dwellAnimRef = useRef<number | null>(null);
  const dwellStartRef = useRef<number | null>(null);
  const currentGazedRef = useRef<string | null>(null);
  const webgazerRef = useRef<any>(null);

  // Register all tile positions
  const updateTileRects = useCallback(() => {
    boardRef.current?.querySelectorAll('[data-tile]').forEach((el) => {
      const label = (el as HTMLElement).dataset.tile!;
      tileRefs.current.set(label, el.getBoundingClientRect());
    });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateTileRects);
    return () => window.removeEventListener('resize', updateTileRects);
  }, [updateTileRects]);

  // Update suggestion tile rects when suggestions change
  useEffect(() => {
    setTimeout(updateTileRects, 100);
  }, [suggestions, updateTileRects]);

  const getTileAtCoords = useCallback((x: number, y: number): string | null => {
    for (const [label, rect] of tileRefs.current.entries()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return label;
      }
    }
    return null;
  }, []);

  const handleTileSelect = useCallback((label: string) => {
    if (label === 'SPACE') {
      if (currentWord.trim()) {
        setSentence(prev => (prev ? prev + ' ' : '') + currentWord);
        setCurrentWord('');
      }
    } else if (label === 'DELETE') {
      setCurrentWord(prev => prev.slice(0, -1));
    } else if (label.startsWith('SUGGESTION_')) {
      // Autofill the suggestion
      const word = label.replace('SUGGESTION_', '');
      setCurrentWord(word.toUpperCase());
    } else {
      setCurrentWord(prev => prev + label);
    }
  }, [currentWord]);

  const stopDwell = useCallback(() => {
    currentGazedRef.current = null;
    dwellStartRef.current = null;
    if (dwellAnimRef.current) cancelAnimationFrame(dwellAnimRef.current);
    setGazedTile(null);
    setDwellProgress(0);
  }, []);

  const startDwell = useCallback((tile: string) => {
    dwellStartRef.current = Date.now();
    currentGazedRef.current = tile;
    setGazedTile(tile);
    setDwellProgress(0);

    const animate = () => {
      if (!dwellStartRef.current || currentGazedRef.current !== tile) return;
      const elapsed = Date.now() - dwellStartRef.current;
      const progress = Math.min(elapsed / DWELL_TIME, 1);
      setDwellProgress(progress);

      if (progress < 1) {
        dwellAnimRef.current = requestAnimationFrame(animate);
      } else {
        handleTileSelect(tile);
        setTimeout(() => {
          setGazedTile(null);
          setDwellProgress(0);
          dwellStartRef.current = null;
          currentGazedRef.current = null;
        }, 300);
      }
    };
    dwellAnimRef.current = requestAnimationFrame(animate);
  }, [handleTileSelect]);

  const startTracking = useCallback(async () => {
    setIsLoading(true);
    setStatus('Loading WebGazer...');

    let wg: any = null;
    for (let i = 0; i < 20; i++) {
      if ((window as any).webgazer) { wg = (window as any).webgazer; break; }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!wg) {
      setStatus('ERROR: WebGazer not found');
      setIsLoading(false);
      return;
    }

    webgazerRef.current = wg;

    try {
      updateTileRects();

      wg.setGazeListener((data: any) => {
        if (!data) return;
        setGazePoint({ x: Math.round(data.x), y: Math.round(data.y) });

        const tile = getTileAtCoords(data.x, data.y);
        if (tile !== currentGazedRef.current) {
          stopDwell();
          if (tile) startDwell(tile);
        }
      });

      await wg.begin();
      wg.showVideo(true);
      wg.showFaceOverlay(true);
      wg.showFaceFeedbackBox(true);
      wg.showPredictionPoints(false);

      setIsTracking(true);
      setIsLoading(false);
      setStatus('Tracking active — look at a tile for 2 seconds to select it');
    } catch (e: any) {
      setStatus('ERROR: ' + e.message);
      setIsLoading(false);
    }
  }, [getTileAtCoords, startDwell, stopDwell, updateTileRects]);

  const stopTracking = useCallback(() => {
    if (webgazerRef.current) {
      try {
        webgazerRef.current.pause();
        webgazerRef.current.clearGazeListener();
        webgazerRef.current.end();
      } catch (e) {}
      webgazerRef.current = null;
    }
    stopDwell();
    setIsTracking(false);
    setStatus('Tracking stopped');
  }, [stopDwell]);

  // Figure out what to show in the gazed/dwell state for suggestions
  const gazedSuggestion = gazedTile?.startsWith('SUGGESTION_')
    ? gazedTile.replace('SUGGESTION_', '')
    : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      padding: '1rem',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ color: 'white', fontSize: '1.25rem', margin: 0, fontWeight: 'bold' }}>
          👁 Eye Gaze Board
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={startTracking}
            disabled={isLoading || isTracking}
            style={{
              padding: '0.4rem 1rem',
              background: isTracking ? '#555' : '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isTracking ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isLoading ? 'Loading...' : 'Start'}
          </button>
          <button
            onClick={stopTracking}
            disabled={!isTracking}
            style={{
              padding: '0.4rem 1rem',
              background: !isTracking ? '#555' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !isTracking ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            Stop
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{
        color: isTracking ? '#4fc3f7' : '#888',
        fontSize: '0.8rem',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: isTracking ? '#4fc3f7' : '#555',
          display: 'inline-block',
          boxShadow: isTracking ? '0 0 6px #4fc3f7' : 'none',
        }} />
        {status}
      </div>

      {/* Text display */}
      <TextDisplay currentWord={currentWord} sentence={sentence} />

      {/* Word suggestions */}
      <WordSuggestions
        suggestions={suggestions}
        isLoading={suggestionsLoading}
        gazedSuggestion={gazedSuggestion}
        dwellProgress={gazedTile?.startsWith('SUGGESTION_') ? dwellProgress : 0}
        onSelect={(word) => handleTileSelect(`SUGGESTION_${word}`)}
      />

      {/* Board */}
      <div ref={boardRef} style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        minHeight: '0',
      }}>
        {/* Letters */}
        {[LETTERS.slice(0, 9), LETTERS.slice(9, 18), LETTERS.slice(18)].map((row, rowIdx) => (
          <div key={rowIdx} style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${row.length}, 1fr)`,
            gap: '0.5rem',
          }}>
            {row.map(letter => (
              <div key={letter} data-tile={letter}>
                <GazeTile
                  label={letter}
                  isGazed={gazedTile === letter}
                  dwellProgress={gazedTile === letter ? dwellProgress : 0}
                  onSelect={handleTileSelect}
                />
              </div>
            ))}
          </div>
        ))}

        {/* Numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '0.5rem' }}>
          {NUMBERS.map(num => (
            <div key={num} data-tile={num}>
              <GazeTile
                label={num}
                isGazed={gazedTile === num}
                dwellProgress={gazedTile === num ? dwellProgress : 0}
                onSelect={handleTileSelect}
              />
            </div>
          ))}
        </div>

        {/* Space and Delete */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '0.5rem' }}>
          {(['SPACE', 'DELETE'] as const).map(key => (
            <div key={key} data-tile={key}>
              <GazeTile
                label={key === 'SPACE' ? '⎵ SPACE' : '⌫ DELETE'}
                isGazed={gazedTile === key}
                dwellProgress={gazedTile === key ? dwellProgress : 0}
                onSelect={() => handleTileSelect(key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom gaze dot */}
      {isTracking && gazePoint && (
        <div style={{
          position: 'fixed',
          left: gazePoint.x,
          top: gazePoint.y,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(79, 195, 247, 0.6)',
          border: '2px solid #4fc3f7',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 9999,
          transition: 'left 0.05s, top 0.05s',
        }} />
      )}
    </div>
  );
}