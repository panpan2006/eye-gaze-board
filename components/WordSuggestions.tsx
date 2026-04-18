'use client';

interface Suggestion {
  word: string;
  score: number;
}

interface WordSuggestionsProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  gazedSuggestion: string | null;
  dwellProgress: number;
  onSelect: (word: string) => void;
}

export default function WordSuggestions({
  suggestions,
  isLoading,
  gazedSuggestion,
  dwellProgress,
  onSelect,
}: WordSuggestionsProps) {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        minHeight: '56px',
        alignItems: 'center',
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1,
            height: '52px',
            background: '#1a1a2e',
            borderRadius: '10px',
            border: '2px solid #333',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    return <div style={{ minHeight: '64px', marginBottom: '0.75rem' }} />;
  }

  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '0.75rem',
      minHeight: '64px',
    }}>
      {suggestions.map((suggestion) => {
        const isGazed = gazedSuggestion === suggestion.word;
        return (
          <button
            key={suggestion.word}
            data-tile={`SUGGESTION_${suggestion.word}`}
            onClick={() => onSelect(suggestion.word)}
            style={{
              flex: 1,
              position: 'relative',
              padding: '0.5rem',
              background: isGazed ? '#1e3a5f' : '#16213e',
              border: isGazed ? '2px solid #4fc3f7' : '2px solid #2a2a4a',
              borderRadius: '10px',
              color: isGazed ? '#4fc3f7' : '#a0aec0',
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textTransform: 'lowercase',
            }}
          >
            {/* Dwell fill */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: isGazed ? `${dwellProgress * 100}%` : '0%',
              background: 'rgba(79, 195, 247, 0.2)',
              transition: 'height 0.05s linear',
              pointerEvents: 'none',
            }} />

            {/* Dwell ring */}
            {isGazed && (
              <svg style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                pointerEvents: 'none',
              }} viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="#4fc3f7"
                  strokeWidth="4"
                  strokeDasharray={`${dwellProgress * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
            )}

            <span style={{ position: 'relative', zIndex: 1 }}>
              {suggestion.word}
            </span>
          </button>
        );
      })}
    </div>
  );
}