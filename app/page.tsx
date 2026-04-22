'use client';

import { useState } from 'react';
import GazeBoard from '@/components/GazeBoard';
import Calibration from '@/components/Calibration';

export default function Home() {
  const [phase, setPhase] = useState<'calibration' | 'board'>('calibration');

  return phase === 'calibration'
    ? <Calibration onComplete={() => setPhase('board')} onSkip={() => setPhase('board')} />
    : <GazeBoard />;
}