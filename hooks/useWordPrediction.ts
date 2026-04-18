'use client';

import { useState, useEffect, useRef } from 'react';

interface WordSuggestion {
  word: string;
  score: number;
}

export function useWordPrediction(prefix: string, context: string = '') {
  const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!prefix || prefix.length < 1) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const prefix_lower = prefix.toLowerCase();
        const context_lower = context.toLowerCase().trim();

        // Build two queries in parallel:
        // 1. Prefix match with left context (words that follow the sentence so far)
        // 2. Plain prefix match as fallback
        const [contextRes, prefixRes] = await Promise.all([
          context_lower
            ? fetch(`https://api.datamuse.com/words?sp=${prefix_lower}*&lc=${encodeURIComponent(context_lower.split(' ').slice(-2).join(' '))}&max=8&md=f`)
            : Promise.resolve(null),
          fetch(`https://api.datamuse.com/words?sp=${prefix_lower}*&max=8&md=f`),
        ]);

        const prefixData: any[] = await prefixRes.json();

        let contextData: any[] = [];
        if (contextRes) {
          contextData = await contextRes.json();
        }

        // Merge results — prioritize context-aware words
        // Filter out uncommon words using frequency metadata
        const seen = new Set<string>();
        const merged: WordSuggestion[] = [];

        const addWords = (words: any[]) => {
          for (const w of words) {
            const word = w.word as string;
            // Skip multi-word results, proper nouns, very uncommon words
            if (seen.has(word)) continue;
            if (word.includes(' ')) continue;
            if (word.includes('-')) continue;

            // Use frequency tags to filter out obscure words
            // Datamuse returns tags like "f:123.45" for frequency
            const freqTag = w.tags?.find((t: string) => t.startsWith('f:'));
            const freq = freqTag ? parseFloat(freqTag.replace('f:', '')) : 0;
            if (freq < 1 && merged.length > 2) continue; // skip rare words if we have enough

            seen.add(word);
            merged.push({ word, score: w.score ?? 0 });
            if (merged.length >= 4) break;
          }
        };

        // Context-aware words first, then fill with prefix matches
        addWords(contextData);
        addWords(prefixData);

        setSuggestions(merged.slice(0, 4));
      } catch (e) {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [prefix, context]);

  return { suggestions, isLoading };
}