'use client';

interface TextDisplayProps {
  currentWord: string;
  sentence: string;
}

export default function TextDisplay({ currentWord, sentence }: TextDisplayProps) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '2px solid #333',
      borderRadius: '16px',
      padding: '1rem 1.5rem',
      marginBottom: '1rem',
      minHeight: '80px',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    }}>
      {/* Sentence so far */}
      <div style={{ color: '#aaa', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
        SENTENCE
      </div>
      <div style={{
        color: '#e0e0e0',
        fontSize: '1.1rem',
        minHeight: '1.5rem',
        wordBreak: 'break-word',
      }}>
        {sentence}
        {/* Current word preview */}
        {currentWord && (
          <span style={{ color: '#4fc3f7', fontWeight: 'bold' }}>
            {sentence ? ' ' : ''}{currentWord}
          </span>
        )}
        {/* Blinking cursor */}
        <span style={{
          display: 'inline-block',
          width: '2px',
          height: '1.1rem',
          background: '#4fc3f7',
          marginLeft: '2px',
          verticalAlign: 'middle',
          animation: 'blink 1s step-end infinite',
        }} />
      </div>
    </div>
  );
}