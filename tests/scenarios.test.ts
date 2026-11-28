import { describe, expect, it } from 'vitest';
import { createDefaultScenarios } from '../constants';
import {
  duplicateScenario,
  removeScenario,
  renameScenario,
  resetAllScenarios,
  updateScenarioInputs,
} from '../services/scenarioService';

describe('Scenario Management Service', () => {
  it('provides three distinct default scenario templates', () => {
    const defaults = createDefaultScenarios();
    expect(defaults).toHaveLength(3);
    expect(defaults.map((s) => s.name)).toEqual([
      'Conservative NDC Adoption',
      'Balanced / Hybrid Adoption',
      'Accelerated NDC Adoption',
    ]);
  });

  it('duplicates, renames, updates independently, removes, and resets scenarios safely', () => {
    const initial = createDefaultScenarios();
    const { scenarios: withCopy, createdId } = duplicateScenario(initial, initial[0].id);
    expect(withCopy).toHaveLength(4);
    expect(createdId).toBeTruthy();

    const renamed = renameScenario(withCopy, createdId!, 'EU Pilot 2026');
    expect(renamed.find((s) => s.id === createdId)?.name).toBe('EU Pilot 2026');

    const updated = updateScenarioInputs(renamed, createdId!, {
      ...initial[0].inputs,
      ndcMigrationPercent: 75,
    });
    // Ensure source scenario was not mutated
    expect(updated.find((s) => s.id === initial[0].id)?.inputs.ndcMigrationPercent).toBe(20);
    expect(updated.find((s) => s.id === createdId)?.inputs.ndcMigrationPercent).toBe(75);

    const { scenarios: afterRemove } = removeScenario(updated, createdId!);
    expect(afterRemove).toHaveLength(3);

    // Prevent removing the last remaining scenario
    const single = [afterRemove[0]];
    const { scenarios: stillSingle } = removeScenario(single, single[0].id);
    expect(stillSingle).toHaveLength(1);

    const reset = resetAllScenarios();
    expect(reset).toHaveLength(3);
  });
});
