import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS_FSC, DEFAULT_RECOMMENDATION_THRESHOLDS } from '../constants';
import { calculateDistributionEconomics } from '../services/economics';
import { generateExecutiveRecommendation } from '../services/recommendations';
import { validateAndSanitizeInputs } from '../services/validation';
import { EconomicInputs } from '../types';

const evaluate = (
  patch: Partial<EconomicInputs>,
  thresholds = DEFAULT_RECOMMENDATION_THRESHOLDS
) => {
  const inputs: EconomicInputs = { ...DEFAULT_INPUTS_FSC, ...patch };
  const validation = validateAndSanitizeInputs(inputs);
  const results = calculateDistributionEconomics(inputs);
  return {
    results,
    recommendation: generateExecutiveRecommendation(inputs, results, validation, thresholds),
  };
};

describe('Executive Recommendation Engine', () => {
  it('returns insufficient_information when bookings or migration share is zero', () => {
    const zeroBookings = evaluate({ monthlyBookings: 0 });
    expect(zeroBookings.recommendation.status).toBe('insufficient_information');

    const zeroMigration = evaluate({ ndcMigrationPercent: 0 });
    expect(zeroMigration.recommendation.status).toBe('insufficient_information');
  });

  it('returns unfavorable when monthly steady-state impact is negative or payback is not achieved', () => {
    const { results, recommendation } = evaluate({
      ndcCostPerBooking: 22,
      ancillaryUpliftPercent: 0,
      continuousPricingUpliftPercent: 0,
    });
    expect(results.monthlySteadyStateImpact).toBeLessThan(0);
    expect(recommendation.status).toBe('unfavorable');
  });

  it('returns favorable when strong impact, acceptable payback, and downside resilience hold', () => {
    const { recommendation } = evaluate({
      ndcMigrationPercent: 60,
      ndcCostPerBooking: 3.0,
      ancillaryUpliftPercent: 5.0,
      oneTimeImplementationCapex: 500000,
    });
    expect(recommendation.status).toBe('favorable');
    expect(recommendation.keyValueDrivers.length).toBeGreaterThan(0);
    expect(recommendation.assumptionsRequiringValidation.length).toBeGreaterThan(0);
  });

  it('downgrades to hybrid_conditional when payback exceeds favorable threshold or scenario is fragile', () => {
    const longPayback = evaluate({
      ndcMigrationPercent: 35,
      oneTimeImplementationCapex: 15000000,
    });
    expect(longPayback.recommendation.status).toBe('hybrid_conditional');

    const customStrictThreshold = evaluate(
      {
        ndcMigrationPercent: 35,
      },
      {
        ...DEFAULT_RECOMMENDATION_THRESHOLDS,
        favorableMinMonthlyImpact: 5_000_000,
      }
    );
    expect(customStrictThreshold.recommendation.status).toBe('hybrid_conditional');
  });
});
