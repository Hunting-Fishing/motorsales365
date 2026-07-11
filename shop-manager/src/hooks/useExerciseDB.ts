import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

const BASE_URL = 'https://exercisedb-api.vercel.app/api/v1';

export interface ExerciseDBResult {
  exerciseId: string;
  name: string;
  gifUrl: string;
  instructions: string[];
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
}

// Maps medical restriction keywords to body parts that should be AVOIDED
const RESTRICTION_TO_BODY_PARTS: Record<string, string[]> = {
  no_upper_body: ['upper arms', 'shoulders', 'chest', 'upper back'],
  no_lower_body: ['upper legs', 'lower legs'],
  avoid_overhead: ['shoulders'],
  no_impact: [],
  no_jumping: [],
  avoid_bending: ['waist', 'lower back'],
  no_weight_bearing: ['upper legs', 'lower legs'],
  avoid_twisting: ['waist'],
  no_heavy_lifting: [],
  limited_range_of_motion: [],
  no_grip_exercises: ['forearms'],
  avoid_chest_exercises: ['chest'],
  no_prone_exercises: [],
  no_running: ['cardio'],
  avoid_cold_exposure: [],
  avoid_high_intensity: [],
  no_contact_sports: [],
  avoid_straining: [],
  no_breath_holding: [],
  avoid_inverted_positions: [],
  no_abdominal_exercises: ['waist'],
  limit_standing: ['upper legs', 'lower legs'],
  no_spinal_loading: ['waist', 'lower back'],
  no_cervical_extension: ['neck'],
};

// Maps restriction keywords to SAFE body parts to suggest exercises for
const RESTRICTION_TO_SAFE_PARTS: Record<string, string[]> = {
  no_upper_body: ['upper legs', 'lower legs', 'waist'],
  no_lower_body: ['upper arms', 'shoulders', 'chest', 'back'],
  avoid_overhead: ['chest', 'upper arms', 'waist', 'upper legs'],
  no_impact: ['upper arms', 'shoulders', 'chest', 'back'],
  no_jumping: ['upper arms', 'shoulders', 'chest', 'back', 'waist'],
  avoid_bending: ['upper arms', 'shoulders', 'chest'],
  no_weight_bearing: ['upper arms', 'shoulders', 'chest'],
  no_heavy_lifting: ['waist', 'upper legs', 'lower legs'],
  no_grip_exercises: ['upper legs', 'lower legs', 'waist'],
  avoid_chest_exercises: ['upper arms', 'shoulders', 'back', 'upper legs'],
  no_abdominal_exercises: ['upper arms', 'shoulders', 'chest', 'upper legs'],
  no_spinal_loading: ['upper arms', 'chest', 'upper legs'],
};

export function getAvoidedBodyParts(restrictions: string[]): string[] {
  const avoided = new Set<string>();
  restrictions.forEach(r => {
    const parts = RESTRICTION_TO_BODY_PARTS[r];
    if (parts) parts.forEach(p => avoided.add(p));
  });
  return [...avoided];
}

export function getSafeBodyParts(restrictions: string[]): string[] {
  if (!restrictions.length) return ['chest', 'back', 'shoulders', 'upper arms', 'upper legs', 'lower legs', 'waist'];
  
  const avoided = new Set(getAvoidedBodyParts(restrictions));
  const safe = new Set<string>();
  
  restrictions.forEach(r => {
    const parts = RESTRICTION_TO_SAFE_PARTS[r];
    if (parts) parts.forEach(p => { if (!avoided.has(p)) safe.add(p); });
  });
  
  // If no specific safe parts found, add all non-avoided parts
  if (safe.size === 0) {
    const allParts = ['chest', 'back', 'shoulders', 'upper arms', 'upper legs', 'lower legs', 'waist', 'forearms', 'neck'];
    allParts.forEach(p => { if (!avoided.has(p)) safe.add(p); });
  }
  
  return [...safe];
}

export function useExerciseSearch(query: string) {
  const [results, setResults] = useState<ExerciseDBResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`${BASE_URL}/exercises/search?q=${encodeURIComponent(debouncedQuery)}&limit=15`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const exercises = data?.data?.exercises || data?.exercises || data?.data || [];
        setResults(Array.isArray(exercises) ? exercises : []);
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  return { results, isLoading };
}

export function useSafeExercises(bodyPart: string) {
  const [results, setResults] = useState<ExerciseDBResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!bodyPart) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`${BASE_URL}/bodyparts/${encodeURIComponent(bodyPart)}/exercises?limit=10`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const exercises = data?.data?.exercises || data?.exercises || data?.data || [];
        setResults(Array.isArray(exercises) ? exercises : []);
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [bodyPart]);

  return { results, isLoading };
}
