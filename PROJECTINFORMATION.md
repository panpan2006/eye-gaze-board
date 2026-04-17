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
├── hooks/
│   ├── useGazeTracker.ts     # Custom hook for WebGazer
│   └── useWordPrediction.ts  # Custom hook for Datamuse
├── lib/
│   └── tts.ts                # Text-to-speech utility
└── types/
    └── index.ts              # Shared TypeScript types
    |___ webgazer.d.ts


Framework: Next.js, Node.js, Webgazer.js 