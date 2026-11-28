import { describe, expect, it } from 'vitest';
import { APP_VERSION, createDefaultScenarios } from '../constants';
import { calculateDistributionEconomics } from '../services/economics';
import {
  generateScenarioCsv,
  generateScenarioJson,
  sanitizeCsvCell,
} from '../services/exportService';
import { generateExecutiveRecommendation } from '../services/recommendations';
import { validateAndSanitizeInputs, validateImportedScenarioJson } from '../services/validation';

describe('Export & CSV Formula Injection Defense Service', () => {
  it('neutralizes spreadsheet formula injection prefixes on string cells while preserving numeric literals', () => {
    expect(sanitizeCsvCell('=CMD|\' /C calc\'!A0')).toBe(`"'=CMD|' /C calc'!A0"`);
    expect(sanitizeCsvCell('+1+1')).toBe(`"'+1+1"`);
    expect(sanitizeCsvCell('-2+3')).toBe(`"'-2+3"`);
    expect(sanitizeCsvCell('@SUM(A1:A5)')).toBe(`"'@SUM(A1:A5)"`);
    expect(sanitizeCsvCell('\t=1+1')).toBe(`"'\t=1+1"`);
    // Pure finite negative numbers remain numeric
    expect(sanitizeCsvCell(-1200)).toBe('-1200');
  });

  it('includes required metadata and neutralizes malicious scenario names in CSV export', () => {
    const baseScenario = {
      ...createDefaultScenarios()[1],
      name: '=HYPERLINK("http://evil.example","Click")',
    };
    const validation = validateAndSanitizeInputs(baseScenario.inputs);
    const results = calculateDistributionEconomics(baseScenario.inputs);
    const recommendation = generateExecutiveRecommendation(
      baseScenario.inputs,
      results,
      validation
    );

    const csv = generateScenarioCsv(
      baseScenario,
      results,
      recommendation,
      '2026-11-28T00:00:00.000Z'
    );

    expect(csv).toContain(`"${APP_VERSION}"`);
    expect(csv).toContain('"USD"');
    expect(csv).toContain('"2026-11-28T00:00:00.000Z"');
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""Click"")"`);
  });

  it('round-trips JSON export through validateImportedScenarioJson without data loss', () => {
    const scenario = createDefaultScenarios()[2];
    const validation = validateAndSanitizeInputs(scenario.inputs);
    const results = calculateDistributionEconomics(scenario.inputs);
    const recommendation = generateExecutiveRecommendation(
      scenario.inputs,
      results,
      validation
    );

    const json = generateScenarioJson(scenario, results, recommendation);
    const imported = validateImportedScenarioJson(json);

    expect(imported.valid).toBe(true);
    expect(imported.scenarioName).toBe(scenario.name);
    expect(imported.inputs).toEqual(scenario.inputs);
  });
});
