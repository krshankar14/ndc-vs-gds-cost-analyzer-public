import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS_FSC } from '../constants';
import {
  validateAndSanitizeInputs,
  validateImportedScenarioJson,
} from '../services/validation';
import { AirlineType, SurchargeTreatment } from '../types';

describe('Validation & Safe JSON Import Service', () => {
  it('flags non-finite and out-of-range inputs and clamps sanitized values safely', () => {
    const result = validateAndSanitizeInputs({
      ...DEFAULT_INPUTS_FSC,
      monthlyBookings: Number.NaN,
      ndcMigrationPercent: 150,
      ancillaryContributionMarginPercent: -10,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(Number.isFinite(result.sanitizedInputs.monthlyBookings)).toBe(true);
    expect(result.sanitizedInputs.ndcMigrationPercent).toBe(100);
    expect(result.sanitizedInputs.ancillaryContributionMarginPercent).toBe(0);
  });

  it('rejects invalid enums cleanly', () => {
    const result = validateAndSanitizeInputs({
      ...DEFAULT_INPUTS_FSC,
      airlineType: 'INVALID' as AirlineType,
      surchargeTreatment: 'BOTH' as SurchargeTreatment,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === 'airlineType')).toBe(true);
    expect(result.errors.some((e) => e.field === 'surchargeTreatment')).toBe(true);
  });

  it('rejects malformed, empty, prototype-polluting, and non-matching JSON imports', () => {
    expect(validateImportedScenarioJson('').valid).toBe(false);
    expect(validateImportedScenarioJson('{bad json').valid).toBe(false);
    expect(validateImportedScenarioJson('{"foo":"bar"}').valid).toBe(false);
    expect(
      validateImportedScenarioJson(
        '{"__proto__":{"polluted":true},"inputs":{"monthlyBookings":1000}}'
      ).valid
    ).toBe(false);
  });

  it('accepts valid exported JSON scenario payloads', () => {
    const payload = JSON.stringify({
      scenarioName: 'Board Review Case',
      scenarioDescription: 'Synthetic test case',
      inputs: DEFAULT_INPUTS_FSC,
    });
    const validated = validateImportedScenarioJson(payload);
    expect(validated.valid).toBe(true);
    expect(validated.scenarioName).toBe('Board Review Case');
    expect(validated.inputs?.monthlyBookings).toBe(DEFAULT_INPUTS_FSC.monthlyBookings);
  });
});
