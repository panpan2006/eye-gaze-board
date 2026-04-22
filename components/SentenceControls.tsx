'use client';

interface SentenceControlsProps {
  sentence: string;
  currentWord: string;
  isSpeaking: boolean;
  isConfirming: boolean;
  gazedControl: string | null;
  dwellProgress: number;
  onSpeak: () => void;
  onClear: () => void;
  onCancelConfirm: () => void;
}

export default function SentenceControls({
  sentence,
  currentWord,
  isSpeaking,
  isConfirming,
  gazedControl,
  dwellProgress,
  onSpeak,
  onClear,
  onCancelConfirm,
}: SentenceControlsProps) {

  const ControlButton = ({
    id,
    label,
    emoji,
    color,
    disabled,
    onClick,
  }: {
    id: string;
    label: string;
    emoji: string;
    color: string;
    disabled?: boolean;
    onClick: () => void;
  }) => {
    const isGazed = gazedControl === id;
    return (
      <button
        data-tile={id}
        onClick={onClick}
        disabled={disabled}
        style={{
          position: 'relative',
          flex: 1,
          padding: '0.75rem',
          background: disabled ? '#1a1a2e' : isGazed ? color + '33' : '#16213e',
          border: `2px solid ${disabled ? '#333' : isGazed ? color : '#2a2a4a'}`,
          borderRadius: '12px',
          color: disabled ? '#555' : isGazed ? color : '#a0aec0',
          fontWeight: 'bold',
          fontSize: '1rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          overflow: 'hidden',
          transition: 'all 0.1s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          minHeight: '56px',
        }}
      >
        {/* Dwell fill */}
        {isGazed && !disabled && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${dwellProgress * 100}%`,
            background: color + '22',
            transition: 'height 0.05s linear',
            pointerEvents: 'none',
          }} />
        )}

        {/* Dwell ring */}
        {isGazed && !disabled && (
          <svg style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
          }} viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeDasharray={`${dwellProgress * 283} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}

        <span style={{ position: 'relative', zIndex: 1, fontSize: '1.2rem' }}>{emoji}</span>
        <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
      </button>
    );
  };

  // Confirmation state — show a big confirm/cancel prompt
  if (isConfirming) {
    return (
      <div style={{
        background: '#0d1f0d',
        border: '2px solid #16a34a',
        borderRadius: '16px',
        padding: '1rem',
        marginBottom: '0.75rem',
      }}>
        <div style={{
          color: '#4ade80',
          fontSize: '0.8rem',
          letterSpacing: '0.1em',
          marginBottom: '0.5rem',
        }}>
          CONFIRM — SPEAK THIS SENTENCE?
        </div>
        <div style={{
          color: 'white',
          fontSize: '1.1rem',
          marginBottom: '0.75rem',
          padding: '0.5rem',
          background: '#0a0a0f',
          borderRadius: '8px',
        }}>
          "{sentence}"
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ControlButton
            id="CONFIRM_SPEAK"
            label="Yes, Speak"
            emoji="🔊"
            color="#4ade80"
            onClick={onSpeak}
          />
          <ControlButton
            id="CANCEL_CONFIRM"
            label="Cancel"
            emoji="✕"
            color="#f87171"
            onClick={onCancelConfirm}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '0.75rem',
    }}>
      {/* Speaking indicator */}
      {isSpeaking && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          background: '#0d1f0d',
          border: '2px solid #16a34a',
          borderRadius: '12px',
          color: '#4ade80',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          flex: 1,
        }}>
          <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>🔊</span>
          Speaking...
        </div>
      )}

      {!isSpeaking && (
        <>
          <ControlButton
            id="SPEAK"
            label="Speak"
            emoji="🔊"
            color="#4ade80"
            disabled={!sentence.trim() && !currentWord.trim()}            
            onClick={onSpeak}
          />
          <ControlButton
            id="CLEAR"
            label="Clear"
            emoji="🗑"
            color="#f87171"
            disabled={!sentence.trim() && !currentWord.trim()}
            onClick={onClear}
          />
        </>
      )}
    </div>
  );
}