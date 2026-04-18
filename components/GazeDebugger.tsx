'use client';

import { useRef, useState } from 'react';

export default function GazeDebugger() {
  const [status, setStatus] = useState('Not started');
  const [coords, setCoords] = useState<{x: number, y: number} | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const started = useRef(false);

  const addLog = (msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 20));
  };

  const startTracking = async () => {
    if (started.current) return;
    started.current = true;
    setStatus('Waiting for WebGazer...');

    // Poll until webgazer is available
    let wg: any = null;
    for (let i = 0; i < 20; i++) {
      if ((window as any).webgazer) {
        wg = (window as any).webgazer;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (!wg) {
      setStatus('ERROR: WebGazer never loaded');
      started.current = false;
      return;
    }

    addLog('WebGazer found!');

    try {
      addLog('Calling begin()...');
      await wg.begin();
      addLog('Success!');
      setStatus('Tracking active');

      wg.setGazeListener((data: any) => {
        if (data) {
          setCoords({ x: Math.round(data.x), y: Math.round(data.y) });
        }
      });

    } catch (e: any) {
      setStatus('ERROR: ' + e.message);
      addLog('ERROR: ' + e.message);
      addLog('Stack: ' + e.stack);
      started.current = false;
    }
  };

  return (
    <div style={{padding: '2rem', fontFamily: 'monospace', background: '#111', minHeight: '100vh', color: 'white'}}>
      <h1 style={{fontSize: '1.5rem', marginBottom: '1rem'}}>WebGazer Debug</h1>

      <button
        onClick={startTracking}
        style={{padding: '0.5rem 1.5rem', background: 'green', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '1rem'}}
      >
        Start Tracking
      </button>

      <div style={{marginBottom: '1rem', padding: '0.75rem', background: '#222', borderRadius: '8px'}}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{marginBottom: '1rem', padding: '0.75rem', background: '#222', borderRadius: '8px'}}>
        <strong>Coords:</strong> {coords ? `x: ${coords.x}, y: ${coords.y}` : 'none'}
      </div>

      <div style={{padding: '0.75rem', background: '#1a1a1a', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto'}}>
        <strong style={{color: '#888'}}>Log:</strong>
        {log.map((entry, i) => (
          <div key={i} style={{fontSize: '0.875rem', marginTop: '4px', color: i === 0 ? '#4ade80' : '#666'}}>
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}