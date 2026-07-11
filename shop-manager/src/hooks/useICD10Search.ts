import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export interface ICD10Result {
  code: string;
  name: string;
}

const ICD10_CATEGORY_MAP: Record<string, string> = {
  A: 'Infectious', B: 'Infectious',
  C: 'Other', D: 'Other',
  E: 'Metabolic',
  F: 'Mental Health',
  G: 'Neurological',
  I: 'Cardiovascular',
  J: 'Respiratory',
  K: 'Other',
  M: 'Musculoskeletal',
  O: 'Pregnancy & Postpartum',
  R: 'Other',
  S: 'Musculoskeletal', T: 'Musculoskeletal',
};

export function mapICD10Category(code: string): string {
  const prefix = code.charAt(0).toUpperCase();
  return ICD10_CATEGORY_MAP[prefix] || 'Other';
}

export function useICD10Search(query: string) {
  const [results, setResults] = useState<ICD10Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(
      `https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms=${encodeURIComponent(debouncedQuery)}&maxList=25`
    )
      .then(res => res.json())
      .then((data: [number, string[], null, string[][]]) => {
        if (cancelled) return;
        const pairs = data[3] || [];
        setResults(pairs.map(([code, name]) => ({ code, name })));
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  return { results, isLoading };
}
