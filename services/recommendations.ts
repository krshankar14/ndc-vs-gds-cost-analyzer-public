import { DEFAULT_RECOMMENDATION_THRESHOLDS } from '../constants';
import {
  EconomicInputs,
  EconomicResults,
  RecommendationResult,
  RecommendationStatus,
  RecommendationThresholds,
  SurchargeTreatment,
  ValidationSummary,
} from '../types';
import { calculateDistributionEconomics, formatCurrency, formatSignedCurrency } from './economics';

export const generateExecutiveRecommendation = (
  inputs: EconomicInputs,
  results: EconomicResults,
  validation: ValidationSummary,
  thresholds: RecommendationThresholds = DEFAULT_RECOMMENDATION_THRESHOLDS
): RecommendationResult => {
  const assumptionsRequiringValidation: string[] = [
    'Contractual GDS segment fees, agency incentive overrides, and actual surcharge recovery net of waivers.',
    'Marginal Look-to-Book shopping API infrastructure cost and caching hit rates across aggregators.',
    'Empirical NDC ancillary attachment lift and true variable fulfilment margins (distinct from existing baseline ancillary sales).',
    'Agency/TMC servicing readiness and actual parallel-run transition duration.',
  ];

  // 1. Insufficient Information Check
  if (!validation.isValid || results.eligibleMonthlyBookings <= 0 || results.ndcBookings <= 0) {
    return {
      status: 'insufficient_information',
      title: 'Insufficient Information for Directional Evaluation',
      primaryFinding:
        !validation.isValid
          ? 'One or more commercial inputs failed validation and must be corrected before evaluating channel economics.'
          : 'Eligible indirect booking volume or NDC migration share is 0%, so no migrated NDC volume is being evaluated.',
      keyValueDrivers: [
        'Enter positive eligible monthly indirect bookings and a migration share above 0% to model blended channel economics.',
      ],
      criticalRisks: [
        'Zero-volume or invalid assumptions prevent meaningful break-even, sensitivity, and payback evaluation.',
      ],
      recommendedNextInvestigations: [
        'Confirm in-scope indirect booking volumes by agency segment (corporate TMC, leisure OTA, traditional retail).',
        'Set a realistic pilot migration share (for example, 10%–25%) to test initial commercial viability.',
      ],
      assumptionsRequiringValidation,
      sensitivityNote: 'Sensitivity check deferred until valid migrated booking volume is modeled.',
    };
  }

  // 2. Downside Sensitivity Probe (using the central engine — zero duplicated math)
  const downsideProbe = calculateDistributionEconomics({
    ...inputs,
    ancillaryUpliftPercent: inputs.ancillaryUpliftPercent - 1.5,
    ndcCostPerBooking: inputs.ndcCostPerBooking + 1.5,
  });
  const fragileToDownside =
    results.monthlySteadyStateImpact > 0 && downsideProbe.monthlySteadyStateImpact <= 0;

  const sensitivityNote = fragileToDownside
    ? `Sensitive to assumptions: a -1.5 pp drop in ancillary uplift combined with +$1.50 NDC cost swings monthly steady-state impact to ${formatSignedCurrency(downsideProbe.monthlySteadyStateImpact)}.`
    : `Under a combined downside stress (-1.5 pp ancillary uplift and +$1.50 NDC cost), monthly steady-state impact remains ${formatSignedCurrency(downsideProbe.monthlySteadyStateImpact)}.`;

  // 3. Deterministic Classification (using configurable illustrative thresholds)
  const impact = results.monthlySteadyStateImpact;
  const paybackMonths = results.payback.months;
  const paybackAchieved =
    results.payback.status === 'immediate' || results.payback.status === 'achieved';

  let status: RecommendationStatus;

  if (
    impact <= thresholds.unfavorableMaxMonthlyImpact ||
    results.payback.status === 'not_achieved'
  ) {
    status = 'unfavorable';
  } else if (
    impact >= thresholds.favorableMinMonthlyImpact &&
    paybackAchieved &&
    (paybackMonths === null || paybackMonths <= thresholds.favorableMaxPaybackMonths) &&
    !fragileToDownside
  ) {
    status = 'favorable';
  } else {
    status = 'hybrid_conditional';
  }

  // 4. Value Drivers (reconciled strictly against actual results)
  const keyValueDrivers: string[] = [];
  if (results.variableDistributionCostSavingsMonthly > 0) {
    keyValueDrivers.push(
      `Variable channel cost avoidance contributes ${formatCurrency(results.variableDistributionCostSavingsMonthly)}/mo across ${results.ndcBookings.toLocaleString()} migrated bookings.`
    );
  } else if (results.variableDistributionCostSavingsMonthly < 0) {
    keyValueDrivers.push(
      `Variable NDC channel cost exceeds net legacy GDS cost by ${formatCurrency(Math.abs(results.variableDistributionCostSavingsMonthly))}/mo (net GDS cost is ${results.unitNetGdsCost.toFixed(2)} vs. NDC variable cost ${results.unitNdcVariableCost.toFixed(2)}).`
    );
  } else {
    keyValueDrivers.push(
      'Variable distribution cost is neutral between legacy GDS and NDC on a per-booking basis.'
    );
  }

  if (results.incrementalContributionMonthly !== 0) {
    keyValueDrivers.push(
      `Offer value creates ${formatSignedCurrency(results.grossIncrementalRevenueMonthly)}/mo gross revenue, translating to ${formatSignedCurrency(results.incrementalContributionMonthly)}/mo in incremental contribution margin.`
    );
  }

  if (inputs.oneTimeImplementationCapex > 0) {
    keyValueDrivers.push(
      `Upfront CAPEX of ${formatCurrency(inputs.oneTimeImplementationCapex)} reaches cash payback in: ${results.payback.label}.`
    );
  }

  // 5. Critical Risks
  const criticalRisks: string[] = [];
  if (results.monthlyTransitionImpact < 0 && inputs.transitionDurationMonths > 0) {
    criticalRisks.push(
      `Negative transition-period cash flow of ${formatSignedCurrency(results.monthlyTransitionImpact)}/mo for ${inputs.transitionDurationMonths} months while parallel costs run.`
    );
  }
  if (results.unitIncrementalShoppingCost > 0.75) {
    criticalRisks.push(
      `Look-to-Book shopping API expense adds $${results.unitIncrementalShoppingCost.toFixed(2)} per NDC booking; unmanaged shopping traffic could compress margins further.`
    );
  }
  if (inputs.surchargeTreatment === SurchargeTreatment.REVENUE_RECOVERY && results.unitGdsSurchargeRecovery > 0) {
    criticalRisks.push(
      `Because GDS surcharge recovery offsets $${results.unitGdsSurchargeRecovery.toFixed(2)}/booking of legacy GDS cost, migrating bookings reduces surcharge recovery unless compensated by offer value.`
    );
  }
  if (fragileToDownside) {
    criticalRisks.push(
      'Positive steady-state economics reverse under moderate combined stress on ancillary uplift and NDC unit cost.'
    );
  }
  if (criticalRisks.length === 0) {
    criticalRisks.push(
      'Execution risk remains concentrated in agency servicing workflows (involuntary changes, refunds) and actual ancillary conversion.'
    );
  }

  // 6. Status-specific titles, findings, and measured next steps
  if (status === 'favorable') {
    return {
      status,
      title: 'Favorable Economics Under Current Illustrative Assumptions',
      primaryFinding: `Modeled steady-state incremental contribution is ${formatSignedCurrency(impact)}/mo (${formatSignedCurrency(results.annualizedSteadyStateImpact)}/yr annualized run rate) with payback of ${results.payback.label}.`,
      keyValueDrivers,
      criticalRisks,
      recommendedNextInvestigations: [
        'Validate modeled GDS net fee schedules, waiver rates, and aggregator pricing against live vendor quotes.',
        'Run a controlled pilot on selected O&Ds or agency partners to empirically measure ancillary attachment and servicing costs before committing to broader migration targets.',
        'Stress-test Look-to-Book caching architecture under peak metasearch and TMC shopping loads.',
      ],
      assumptionsRequiringValidation,
      sensitivityNote,
    };
  }

  if (status === 'hybrid_conditional') {
    return {
      status,
      title: 'Hybrid / Conditional Case — Validate Key Drivers Before Scaling',
      primaryFinding: `Modeled steady-state impact is ${formatSignedCurrency(impact)}/mo, but payback (${results.payback.label}), transition drag, or downside sensitivity warrants a selective hybrid posture.`,
      keyValueDrivers,
      criticalRisks,
      recommendedNextInvestigations: [
        'Target specific point-of-sale markets and agency segments where continuous pricing and ancillary attachment are highest.',
        'Evaluate aggregator fee tiers, bundled shopping allowances, and GDS-distributed NDC agreements to lower unit costs.',
        'Verify whether fixed OPEX and transition overlap can be phased to improve payback within governance thresholds.',
      ],
      assumptionsRequiringValidation,
      sensitivityNote,
    };
  }

  return {
    status: 'unfavorable',
    title: 'Unfavorable Economics Under Current Assumptions',
    primaryFinding: `Modeled steady-state financial impact is ${formatSignedCurrency(impact)}/mo with payback status "${results.payback.label}". Transitioning under these terms is dilutive to contribution.`,
    keyValueDrivers,
    criticalRisks,
    recommendedNextInvestigations: [
      'Quantify the gap via Break-Even analysis: evaluate whether NDC unit fees, Look-to-Book costs, or fixed OPEX can be structurally reduced.',
      'Re-examine legacy GDS commercial terms and surcharge recovery economics before shifting volume away from current agreements.',
      'Defer broad NDC migration until empirical offer-value pilots demonstrate sufficient incremental contribution margin.',
    ],
    assumptionsRequiringValidation,
    sensitivityNote,
  };
};
