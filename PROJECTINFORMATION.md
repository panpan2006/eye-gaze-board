Project Description: 
This project is an assistive device for patients with spinal cord injuries/stroke/CP where speech is impaired and the patient has low mobility. Originally, the prototype tracked eye movement across a keyboard and entered letters when the eyes dwelled. A calibration screen was created to improve accuracy of the eye tracking.

 The UI was later redesigned to have four buttons: "Select", "Space", "Delete", and "Speak", and also featured word predictions the patient could choose from. A slider would move through the alphabet and when it falls on the desired letter the patient would select it. However, the eye tracking was not accurate/consistent enough. 

 Transitioned to a new approach - head tracking. Slight tilting to the left/right to select letters and add a space between words. The user would enter keywords and the ML model would interpret them into a sentence. For example: "BED" "HOT" - "the bed is too hot, please remove some blankets".  


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
|   |___useFaceOrientation.ts
├── lib/
│   └── tts.ts                # Text-to-speech utility
└── types/
    └── index.ts              # Shared TypeScript types
    |___ webgazer.d.ts


Framework: Next.js, Node.js, Webgazer.js, HuggingFace t5 model, PyTorch neural network model

Phases: 
1. WebGazer running & logging coordinates
2. Build the board UI 
3. Dwell time selection 
4. Word building
5. Word predictions
6. Suggestion selection
7. TTS confirmation 
8. Calibration screen
10. Design UI
11. Adjust WebGazer to follow head movements and redesign UI 
10. Train an ML model to piece together key words 

Frontend: Next.js UI (i.e. components)-> Backend 1: Next.js API route -> Backend 2: Python ML server

ML Workflow: 
keywords
   ↓
Next.js
   ↓
Python FastAPI
   ↓
T5 model inference
   ↓
sentence
   ↓
Next.js
   ↓
frontend
