import { createDefaultScenarios, LOCAL_STORAGE_KEYS } from '../constants';
import { EconomicInputs, ScenarioItem } from '../types';
import { validateAndSanitizeInputs } from './validation';

export const MAX_SCENARIOS = 8;

export const createScenario = (
  name: string,
  inputs: EconomicInputs,
  description = 'Custom distribution scenario'
): ScenarioItem => ({
  id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: name.trim().slice(0, 80) || 'Untitled Scenario',
  description: description.trim().slice(0, 240),
  inputs: { ...inputs },
  updatedAt: new Date().toISOString(),
});

export const duplicateScenario = (
  scenarios: ScenarioItem[],
  sourceId: string
): { scenarios: ScenarioItem[]; createdId: string | null } => {
  if (scenarios.length >= MAX_SCENARIOS) {
    return { scenarios, createdId: null };
  }
  const source = scenarios.find((s) => s.id === sourceId);
  if (!source) {
    return { scenarios, createdId: null };
  }
  const copy = createScenario(
    `${source.name} (Copy)`,
    source.inputs,
    source.description
  );
  return { scenarios: [...scenarios, copy], createdId: copy.id };
};

export const renameScenario = (
  scenarios: ScenarioItem[],
  id: string,
  newName: string
): ScenarioItem[] => {
  const trimmed = newName.trim().slice(0, 80);
  if (!trimmed) return scenarios;
  return scenarios.map((s) =>
    s.id === id ? { ...s, name: trimmed, updatedAt: new Date().toISOString() } : s
  );
};

export const updateScenarioInputs = (
  scenarios: ScenarioItem[],
  id: string,
  inputs: EconomicInputs
): ScenarioItem[] => {
  return scenarios.map((s) =>
    s.id === id ? { ...s, inputs: { ...inputs }, updatedAt: new Date().toISOString() } : s
  );
};

export const removeScenario = (
  scenarios: ScenarioItem[],
  id: string
): { scenarios: ScenarioItem[]; nextActiveId: string } => {
  if (scenarios.length <= 1) {
    return { scenarios, nextActiveId: scenarios[0].id };
  }
  const filtered = scenarios.filter((s) => s.id !== id);
  return {
    scenarios: filtered,
    nextActiveId: filtered[0].id,
  };
};

export const resetAllScenarios = (): ScenarioItem[] => createDefaultScenarios();

// Optional Local Browser Persistence (strictly opt-in)
export const isPersistenceEnabled = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(LOCAL_STORAGE_KEYS.PERSISTENCE_ENABLED) === 'true';
  } catch {
    return false;
  }
};

export const setPersistenceEnabled = (enabled: boolean): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (enabled) {
      window.localStorage.setItem(LOCAL_STORAGE_KEYS.PERSISTENCE_ENABLED, 'true');
    } else {
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.PERSISTENCE_ENABLED);
      window.localStorage.removeItem(LOCAL_STORAGE_KEYS.SCENARIOS);
    }
  } catch {
    // Ignore storage quota or sandbox access errors gracefully
  }
};

export const saveScenariosToStorage = (scenarios: ScenarioItem[]): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.PERSISTENCE_ENABLED, 'true');
    return true;
  } catch {
    return false;
  }
};

export const loadScenariosFromStorage = (): ScenarioItem[] | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    if (!isPersistenceEnabled()) return null;
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEYS.SCENARIOS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const restored: ScenarioItem[] = [];
    for (const item of parsed.slice(0, MAX_SCENARIOS)) {
      if (typeof item !== 'object' || item === null) continue;
      const validation = validateAndSanitizeInputs(item.inputs ?? {});
      restored.push({
        id: typeof item.id === 'string' && item.id.trim() ? item.id : `scenario-${restored.length + 1}`,
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 80) : `Scenario ${restored.length + 1}`,
        description: typeof item.description === 'string' ? item.description.slice(0, 240) : '',
        inputs: validation.sanitizedInputs,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      });
    }
    return restored.length > 0 ? restored : null;
  } catch {
    return null;
  }
};

export const clearSavedStorage = (): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(LOCAL_STORAGE_KEYS.SCENARIOS);
    window.localStorage.removeItem(LOCAL_STORAGE_KEYS.PERSISTENCE_ENABLED);
    window.localStorage.removeItem(LOCAL_STORAGE_KEYS.THRESHOLDS);
  } catch {
    // Ignore storage access errors
  }
};
