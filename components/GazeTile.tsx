'use client';

interface GazeTileProps {
  label: string;
  isGazed: boolean;
  dwellProgress: number; // 0 to 1
  onSelect: (label: string) => void;
}

export default function GazeTile({ label, isGazed, dwellProgress, onSelect }: GazeTileProps) {
  return (
<button
  onClick={() => onSelect(label)}
  style={{
    position: 'relative',
    width: '100%',
    minHeight: '60px',        // add this
    aspectRatio: '1',
    background: isGazed ? '#1e3a5f' : '#1a1a2e',
    border: isGazed ? '2px solid #4fc3f7' : '2px solid #333',
    borderRadius: '12px',
    color: 'white',
    fontSize: 'clamp(1rem, 2vw, 1.75rem)',
    fontWeight: 'bold',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'border 0.1s, background 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}

    >
      {/* Dwell fill animation */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: `${dwellProgress * 100}%`,
          background: 'rgba(79, 195, 247, 0.25)',
          transition: 'height 0.05s linear',
          pointerEvents: 'none',
        }}
      />

      {/* Dwell ring */}
      {isGazed && (
        <svg
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
          }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="#4fc3f7"
            strokeWidth="4"
            strokeDasharray={`${dwellProgress * 283} 283`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.05s linear' }}
          />
        </svg>
      )}

      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
    </button>
  );
}