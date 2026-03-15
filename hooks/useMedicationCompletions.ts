import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pawlogix_med_completions';

const PRN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for PRN/as-needed

interface CompletionMap {
  [key: string]: string; // key = `${petId}_${medNameLower}`, value = ISO timestamp
}

function makeKey(petId: string, medName: string): string {
  return `${petId}_${medName.toLowerCase().trim()}`;
}

/** Returns true if the frequency represents a PRN / "as needed" medication. */
function isPrnFrequency(frequency: string): boolean {
  return /\bprn\b|as\s*needed|when\s*necessary/i.test((frequency || '').toLowerCase());
}

/** Parse medication frequency into a reset interval in milliseconds.
 *  Returns PRN_INTERVAL_MS (7 days) for as-needed medications. */
function getResetIntervalMs(frequency: string): number {
  if (isPrnFrequency(frequency)) return PRN_INTERVAL_MS;
  const lower = (frequency || '').toLowerCase();
  if (/twice|2x|bid|every\s*12/i.test(lower)) return 12 * 60 * 60 * 1000;
  if (/three|tid|3x|every\s*8/i.test(lower)) return 8 * 60 * 60 * 1000;
  if (/weekly|once\s*a?\s*week|every\s*(7|seven)/i.test(lower)) return 7 * 24 * 60 * 60 * 1000;
  if (/every\s*(2|two)\s*week|biweekly/i.test(lower)) return 14 * 24 * 60 * 60 * 1000;
  if (/monthly|once\s*a?\s*month/i.test(lower)) return 30 * 24 * 60 * 60 * 1000;
  // Default: once daily
  return 24 * 60 * 60 * 1000;
}

// --- Standalone async utilities (for use in useNotificationItems) ---

export async function loadMedCompletions(): Promise<CompletionMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function checkMedCompleted(
  completions: CompletionMap,
  petId: string,
  medName: string,
  frequency: string,
): boolean {
  const key = makeKey(petId, medName);
  const lastDone = completions[key];
  if (!lastDone) return false;
  const resetInterval = getResetIntervalMs(frequency);
  return (Date.now() - new Date(lastDone).getTime()) < resetInterval;
}

// --- Exported interval parser (used by getEffectiveNextDue in record-filters) ---

export { getResetIntervalMs };

// --- Persist helper ---

async function persistCompletions(data: CompletionMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- React hook ---

export function useMedicationCompletions() {
  const [completions, setCompletions] = useState<CompletionMap>({});
  const completionsRef = useRef<CompletionMap>(completions);

  // Keep ref in sync so async callbacks always see latest state
  useEffect(() => {
    completionsRef.current = completions;
  }, [completions]);

  const load = useCallback(async () => {
    const data = await loadMedCompletions();
    setCompletions(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload from AsyncStorage whenever the consuming screen gains focus
  // This ensures cross-screen state sync since each hook instance is independent
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markDone = useCallback(async (petId: string, medName: string): Promise<void> => {
    const key = makeKey(petId, medName);
    const prev = completionsRef.current;
    const updated = { ...prev, [key]: new Date().toISOString() };

    // Optimistic state update
    setCompletions(updated);

    try {
      await persistCompletions(updated);
    } catch {
      // Revert on storage failure
      setCompletions(prev);
    }
  }, []);

  const markUndone = useCallback(async (petId: string, medName: string): Promise<void> => {
    const key = makeKey(petId, medName);
    const prev = completionsRef.current;

    if (!(key in prev)) return;

    const updated = { ...prev };
    delete updated[key];

    setCompletions(updated);

    try {
      await persistCompletions(updated);
    } catch {
      setCompletions(prev);
    }
  }, []);

  const cleanupCompletionsForPet = useCallback(async (petId: string): Promise<void> => {
    const prev = completionsRef.current;
    const prefix = `${petId}_`;
    const updated: CompletionMap = {};

    for (const k of Object.keys(prev)) {
      if (!k.startsWith(prefix)) {
        updated[k] = prev[k];
      }
    }

    setCompletions(updated);

    try {
      await persistCompletions(updated);
    } catch {
      setCompletions(prev);
    }
  }, []);

  const isCompleted = useCallback((petId: string, medName: string, frequency: string): boolean => {
    return checkMedCompleted(completions, petId, medName, frequency);
  }, [completions]);

  const getLastCompletedAt = useCallback((petId: string, medName: string): string | null => {
    const key = makeKey(petId, medName);
    return completions[key] ?? null;
  }, [completions]);

  return { markDone, markUndone, isCompleted, getLastCompletedAt, cleanupCompletionsForPet, refresh: load };
}
