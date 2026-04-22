eye-gaze-board/
├── app/
│   ├── page.tsx              # Main entry
│   └── gaze-board/
│       └── page.tsx          # The gaze board UI
├── components/
│   ├── GazeBoard.tsx         # Main board component
│   ├── GazeTile.tsx          # Individual letter/number tile
│   ├── WordSuggestions.tsx   # Autocomplete suggestions
│   ├── TextOutput.tsx        # The sentence being built
│   └── GazeTracker.tsx       # WebGazer hook/wrapper
|   |____TextDisplay.tsx
|   |____SentenceControls.tsx
|   |____Calibration.tsx
├── hooks/
│   ├── useGazeTracker.ts     # Custom hook for WebGazer
│   └── useWordPrediction.ts  # Custom hook for Datamuse
├── lib/
│   └── tts.ts                # Text-to-speech utility
└── types/
    └── index.ts              # Shared TypeScript types
    |___ webgazer.d.ts


Framework: Next.js, Node.js, Webgazer.js 

Phases: 
1. WebGazer running & logging coordinates
2. Build the board UI 
3. Dwell time selection 
4. Word building
5. Word predictions
6. Suggestion selection
7. TTS confirmation 
8. Calibration screen
9. Train an ML model to strengthen word predictions - should also follow gaze