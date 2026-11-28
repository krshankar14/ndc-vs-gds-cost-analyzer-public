import {
  EVALUATION_HORIZON_MONTHS,
  MAX_REALISTIC_ANCILLARY_UPLIFT_PERCENT,
} from '../constants';
import {
  BreakEvenResult,
  EconomicInputs,
  EconomicResults,
  MonthlyCashFlowPoint,
  PaybackResult,
  SensitivityCell,
  SensitivityDriverImpact,
  SensitivityMatrix,
  SensitivityPresetId,
  SurchargeTreatment,
} from '../types';
import { validateAndSanitizeInputs } from './validation';

const roundTo = (value: number, decimals = 6): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const calculateBreakEven = (params: {
  eligibleMonthlyBookings: number;
  ndcBookings: number;
  unitNetGdsCost: number;
  unitNdcVariableCost: number;
  unitPricingContribution: number;
  incrementalMonthlyFixedOpex: number;
  avgTicketValue: number;
  ancillaryContributionMarginPercent: number;
}): BreakEvenResult => {
  const {
    eligibleMonthlyBookings,
    ndcBookings,
    unitNetGdsCost,
    unitNdcVariableCost,
    unitPricingContribution,
    incrementalMonthlyFixedOpex,
    avgTicketValue,
    ancillaryContributionMarginPercent,
  } = params;

  if (eligibleMonthlyBookings <= 0 || ndcBookings <= 0) {
    return {
      status: 'insufficient_data',
      requiredAncillaryUpliftPercent: null,
      label: 'Insufficient data',
      explanation:
        'Break-even ancillary uplift requires positive eligible bookings and an NDC migration share above 0%.',
    };
  }

  // Steady-state break-even per migrated NDC booking:
  // (unitNetGdsCost - unitNdcVariableCost) + unitPricingContribution + requiredAncillaryContribution - (fixedOpex / ndcBookings) = 0
  const fixedOpexPerNdcBooking = incrementalMonthlyFixedOpex / ndcBookings;
  const requiredAncillaryContributionPerBooking =
    fixedOpexPerNdcBooking + (unitNdcVariableCost - unitNetGdsCost) - unitPricingContribution;

  if (requiredAncillaryContributionPerBooking <= 0) {
    return {
      status: 'no_uplift_required',
      requiredAncillaryUpliftPercent: 0,
      label: 'No additional uplift required',
      explanation:
        'Steady-state break-even is already achieved through distribution cost savings and continuous pricing contribution.',
    };
  }

  if (avgTicketValue <= 0 || ancillaryContributionMarginPercent <= 0) {
    return {
      status: 'not_achievable',
      requiredAncillaryUpliftPercent: null,
      label: 'Not achievable via ancillary uplift',
      explanation:
        'Positive ancillary contribution cannot be generated when Average Ticket Value or Ancillary Contribution Margin is 0%.',
    };
  }

  const contributionPerOnePercentUplift =
    avgTicketValue * 0.01 * (ancillaryContributionMarginPercent / 100);

  if (contributionPerOnePercentUplift <= 0 || !Number.isFinite(contributionPerOnePercentUplift)) {
    return {
      status: 'not_achievable',
      requiredAncillaryUpliftPercent: null,
      label: 'Not achievable via ancillary uplift',
      explanation: 'Ancillary contribution per percentage point of uplift is zero.',
    };
  }

  const requiredPercent = requiredAncillaryContributionPerBooking / contributionPerOnePercentUplift;

  if (!Number.isFinite(requiredPercent) || requiredPercent > MAX_REALISTIC_ANCILLARY_UPLIFT_PERCENT) {
    return {
      status: 'not_achievable',
      requiredAncillaryUpliftPercent: Number.isFinite(requiredPercent)
        ? roundTo(requiredPercent, 2)
        : null,
      label: 'Not achievable within realistic bounds',
      explanation: `Closing the steady-state gap requires more than ${MAX_REALISTIC_ANCILLARY_UPLIFT_PERCENT}% ancillary uplift on average ticket value.`,
    };
  }

  return {
    status: 'uplift_required',
    requiredAncillaryUpliftPercent: roundTo(requiredPercent, 2),
    label: `${requiredPercent.toFixed(2)}% uplift required`,
    explanation:
      'Minimum incremental ancillary revenue uplift (% of ATV) on migrated NDC bookings required to reach $0 monthly steady-state impact.',
  };
};

const calculateCashFlowAndPayback = (params: {
  oneTimeImplementationCapex: number;
  monthlyTransitionImpact: number;
  monthlySteadyStateImpact: number;
  transitionDurationMonths: number;
}): {
  timeline: MonthlyCashFlowPoint[];
  firstYearCashFlow: number;
  firstYearOperatingCashFlow: number;
  threeYearCumulativeCashFlow: number;
  payback: PaybackResult;
} => {
  const {
    oneTimeImplementationCapex,
    monthlyTransitionImpact,
    monthlySteadyStateImpact,
    transitionDurationMonths,
  } = params;

  const roundedTransitionMonths = Math.max(0, Math.round(transitionDurationMonths));
  const timeline: MonthlyCashFlowPoint[] = [
    {
      month: 0,
      phase: 'capex',
      monthlyCashFlow: -oneTimeImplementationCapex,
      cumulativeCashFlow: -oneTimeImplementationCapex,
    },
  ];

  let cumulative = -oneTimeImplementationCapex;
  let firstYearOperatingCashFlow = 0;
  let paybackMonths: number | null = null;
  let everNegative = oneTimeImplementationCapex > 0;

  for (let month = 1; month <= EVALUATION_HORIZON_MONTHS; month += 1) {
    const isTransition = month <= roundedTransitionMonths;
    const monthlyCashFlow = isTransition ? monthlyTransitionImpact : monthlySteadyStateImpact;
    const prevCumulative = cumulative;
    cumulative = prevCumulative + monthlyCashFlow;

    if (cumulative < 0) {
      everNegative = true;
    }

    if (month <= 12) {
      firstYearOperatingCashFlow += monthlyCashFlow;
    }

    if (paybackMonths === null && everNegative && prevCumulative < 0 && cumulative >= 0 && monthlyCashFlow > 0) {
      paybackMonths = month - 1 + -prevCumulative / monthlyCashFlow;
    }

    timeline.push({
      month,
      phase: isTransition ? 'transition' : 'steady_state',
      monthlyCashFlow: roundTo(monthlyCashFlow, 2),
      cumulativeCashFlow: roundTo(cumulative, 2),
    });
  }

  // If still negative after Month 36, check whether positive steady-state cash flow recovers beyond 36 months
  if (paybackMonths === null && everNegative && cumulative < 0 && monthlySteadyStateImpact > 0) {
    paybackMonths = EVALUATION_HORIZON_MONTHS + -cumulative / monthlySteadyStateImpact;
  }

  const firstYearCashFlow = -oneTimeImplementationCapex + firstYearOperatingCashFlow;
  const threeYearCumulativeCashFlow = cumulative;

  let payback: PaybackResult;
  if (oneTimeImplementationCapex === 0 && !everNegative) {
    if (monthlySteadyStateImpact > 0) {
      payback = {
        status: 'immediate',
        months: 0,
        label: 'Immediate (No upfront CAPEX)',
        explanation: 'No upfront implementation investment or cumulative cash deficit to recover.',
      };
    } else if (monthlySteadyStateImpact === 0 && monthlyTransitionImpact === 0) {
      payback = {
        status: 'not_applicable',
        months: null,
        label: 'Not applicable',
        explanation: 'No upfront investment and zero net incremental cash flow.',
      };
    } else {
      payback = {
        status: 'not_achieved',
        months: null,
        label: 'Payback not achieved',
        explanation: 'Incremental cash flow is negative under the selected assumptions.',
      };
    }
  } else if (paybackMonths !== null && Number.isFinite(paybackMonths)) {
    const roundedMonths = roundTo(paybackMonths, 1);
    payback = {
      status: 'achieved',
      months: roundedMonths,
      label: `${roundedMonths.toFixed(1)} months`,
      explanation:
        roundedTransitionMonths > 0
          ? 'Calculated via month-by-month cumulative cash flow incorporating upfront CAPEX and transition-period expenses.'
          : 'Calculated as upfront implementation investment divided by constant positive monthly steady-state cash flow.',
    };
  } else {
    payback = {
      status: 'not_achieved',
      months: null,
      label: 'Payback not achieved',
      explanation:
        'Cumulative cash flow does not recover upfront CAPEX and/or transition deficits under current assumptions.',
    };
  }

  return {
    timeline,
    firstYearCashFlow: roundTo(firstYearCashFlow, 2),
    firstYearOperatingCashFlow: roundTo(firstYearOperatingCashFlow, 2),
    threeYearCumulativeCashFlow: roundTo(threeYearCumulativeCashFlow, 2),
    payback,
  };
};

export const calculateDistributionEconomics = (rawInputs: EconomicInputs): EconomicResults => {
  const { sanitizedInputs: inputs } = validateAndSanitizeInputs(rawInputs);

  // 1. Blended Volume Split
  const eligibleMonthlyBookings = inputs.monthlyBookings;
  const ndcMigrationPercent = inputs.ndcMigrationPercent;
  const ndcBookings = eligibleMonthlyBookings * (ndcMigrationPercent / 100);
  const remainingGdsBookings = eligibleMonthlyBookings - ndcBookings;

  // 2. GDS Unit Economics (Airline Perspective — explicit surcharge treatment, no double-counting)
  const unitGdsSegmentFee = inputs.avgSegments * inputs.gdsCostPerSegment;
  const unitGdsSurchargeGross = inputs.gdsSurchargePerTicket * inputs.ticketsPerBooking;

  let unitGdsSurchargeExpense = 0;
  let unitGdsSurchargeRecovery = 0;

  if (inputs.surchargeTreatment === SurchargeTreatment.AIRLINE_EXPENSE) {
    unitGdsSurchargeExpense = unitGdsSurchargeGross;
  } else if (inputs.surchargeTreatment === SurchargeTreatment.REVENUE_RECOVERY) {
    unitGdsSurchargeRecovery = unitGdsSurchargeGross * (inputs.surchargeRecoveryPercent / 100);
  }

  const unitGdsGrossCost =
    unitGdsSegmentFee +
    inputs.gdsAdditionalTransactionFee +
    unitGdsSurchargeExpense +
    inputs.agencyIncentivePerBooking +
    inputs.gdsOtherServicingCost;

  const unitGdsRecoveriesAndRebates =
    unitGdsSurchargeRecovery + inputs.commercialRebatePerBooking;

  const unitNetGdsCost = unitGdsGrossCost - unitGdsRecoveriesAndRebates;

  // 3. NDC Unit Variable Economics (including Look-to-Book without double-counting)
  const attributableShoppingRequests =
    inputs.lookToBookRatio * (inputs.ndcShoppingTrafficSharePercent / 100);
  const additionalLookToBookRequests = inputs.shoppingCostsIncludedInBase
    ? 0
    : Math.max(0, attributableShoppingRequests - inputs.includedShoppingRequestsPerBooking);

  const unitIncrementalShoppingCost =
    additionalLookToBookRequests * inputs.shoppingApiCostPerRequest;
  const unitNdcBaseCost = inputs.ndcCostPerBooking;
  const unitNdcServicingCost = inputs.ndcServicingCostPerBooking;
  const unitNdcVariableCost =
    unitNdcBaseCost + unitIncrementalShoppingCost + unitNdcServicingCost;

  // 4. Incremental Revenue & Contribution Margin (Migrated NDC Bookings ONLY)
  const unitAncillaryRevenue = inputs.avgTicketValue * (inputs.ancillaryUpliftPercent / 100);
  const unitAncillaryContribution =
    unitAncillaryRevenue * (inputs.ancillaryContributionMarginPercent / 100);

  const unitPricingRevenue =
    inputs.avgTicketValue * (inputs.continuousPricingUpliftPercent / 100);
  const unitPricingContribution =
    unitPricingRevenue * (inputs.pricingContributionMarginPercent / 100);

  const unitGrossIncrementalRevenue = unitAncillaryRevenue + unitPricingRevenue;
  const unitIncrementalContribution = unitAncillaryContribution + unitPricingContribution;
  const unitNdcNetContributionVsGds =
    unitNetGdsCost - unitNdcVariableCost + unitIncrementalContribution;

  // 5. Monthly Distribution Costs (Baseline 100% Legacy vs. Future Blended)
  const baselineMonthlyNetGdsCost = eligibleMonthlyBookings * unitNetGdsCost;
  const futureRemainingGdsCostMonthly = remainingGdsBookings * unitNetGdsCost;
  const futureNdcVariableCostMonthly = ndcBookings * unitNdcVariableCost;
  const blendedVariableDistributionCostMonthly =
    futureRemainingGdsCostMonthly + futureNdcVariableCostMonthly;

  const blendedSteadyStateDistributionCostMonthly =
    blendedVariableDistributionCostMonthly + inputs.incrementalMonthlyFixedOpex;
  const blendedTransitionDistributionCostMonthly =
    blendedSteadyStateDistributionCostMonthly + inputs.monthlyTransitionExpense;

  const variableDistributionCostSavingsMonthly =
    baselineMonthlyNetGdsCost - blendedVariableDistributionCostMonthly;
  const steadyStateDistributionCostSavingsMonthly =
    baselineMonthlyNetGdsCost - blendedSteadyStateDistributionCostMonthly;

  // 6. Monthly Value Creation Totals
  const grossAncillaryRevenueMonthly = ndcBookings * unitAncillaryRevenue;
  const grossPricingRevenueMonthly = ndcBookings * unitPricingRevenue;
  const grossIncrementalRevenueMonthly = ndcBookings * unitGrossIncrementalRevenue;

  const ancillaryContributionMonthly = ndcBookings * unitAncillaryContribution;
  const pricingContributionMonthly = ndcBookings * unitPricingContribution;
  const incrementalContributionMonthly = ndcBookings * unitIncrementalContribution;

  // 7. Net Monthly Financial Impact (Steady-State vs. Transition-Period)
  const monthlySteadyStateImpact =
    variableDistributionCostSavingsMonthly +
    incrementalContributionMonthly -
    inputs.incrementalMonthlyFixedOpex;

  const monthlyTransitionImpact = monthlySteadyStateImpact - inputs.monthlyTransitionExpense;
  const annualizedSteadyStateImpact = monthlySteadyStateImpact * 12;

  // Optional allocated CAPEX P&L view (strictly separated from cash flow)
  const monthlyAllocatedCapex =
    inputs.capexAllocationMonths > 0
      ? inputs.oneTimeImplementationCapex / inputs.capexAllocationMonths
      : 0;
  const monthlySteadyStateNetOfAllocatedCapex =
    monthlySteadyStateImpact - monthlyAllocatedCapex;

  // Relative Impact vs. Baseline (only defined when baseline net GDS cost > 0)
  const netImpactPercentOfBaseline =
    baselineMonthlyNetGdsCost > 0
      ? roundTo((monthlySteadyStateImpact / baselineMonthlyNetGdsCost) * 100, 2)
      : null;

  // 8. Cash Flow, Payback & 3-Year ROI
  const {
    timeline,
    firstYearCashFlow,
    firstYearOperatingCashFlow,
    threeYearCumulativeCashFlow,
    payback,
  } = calculateCashFlowAndPayback({
    oneTimeImplementationCapex: inputs.oneTimeImplementationCapex,
    monthlyTransitionImpact,
    monthlySteadyStateImpact,
    transitionDurationMonths: inputs.transitionDurationMonths,
  });

  const threeYearRoiPercent =
    inputs.oneTimeImplementationCapex > 0
      ? roundTo((threeYearCumulativeCashFlow / inputs.oneTimeImplementationCapex) * 100, 1)
      : null;

  // 9. Break-Even Ancillary Uplift
  const breakEven = calculateBreakEven({
    eligibleMonthlyBookings,
    ndcBookings,
    unitNetGdsCost,
    unitNdcVariableCost,
    unitPricingContribution,
    incrementalMonthlyFixedOpex: inputs.incrementalMonthlyFixedOpex,
    avgTicketValue: inputs.avgTicketValue,
    ancillaryContributionMarginPercent: inputs.ancillaryContributionMarginPercent,
  });

  return {
    eligibleMonthlyBookings,
    ndcBookings,
    remainingGdsBookings,
    ndcMigrationPercent,

    unitGdsSegmentFee,
    unitGdsSurchargeGross,
    unitGdsSurchargeExpense,
    unitGdsSurchargeRecovery,
    unitGdsGrossCost,
    unitGdsRecoveriesAndRebates,
    unitNetGdsCost,

    additionalLookToBookRequests,
    unitIncrementalShoppingCost,
    unitNdcBaseCost,
    unitNdcServicingCost,
    unitNdcVariableCost,

    unitAncillaryRevenue,
    unitAncillaryContribution,
    unitPricingRevenue,
    unitPricingContribution,
    unitGrossIncrementalRevenue,
    unitIncrementalContribution,
    unitNdcNetContributionVsGds,

    baselineMonthlyNetGdsCost,
    futureRemainingGdsCostMonthly,
    futureNdcVariableCostMonthly,
    blendedVariableDistributionCostMonthly,
    blendedSteadyStateDistributionCostMonthly,
    blendedTransitionDistributionCostMonthly,
    variableDistributionCostSavingsMonthly,
    steadyStateDistributionCostSavingsMonthly,

    grossAncillaryRevenueMonthly,
    grossPricingRevenueMonthly,
    grossIncrementalRevenueMonthly,
    ancillaryContributionMonthly,
    pricingContributionMonthly,
    incrementalContributionMonthly,

    incrementalMonthlyFixedOpex: inputs.incrementalMonthlyFixedOpex,
    monthlyTransitionExpense: inputs.monthlyTransitionExpense,
    monthlySteadyStateImpact,
    monthlyTransitionImpact,
    annualizedSteadyStateImpact,
    monthlyAllocatedCapex,
    monthlySteadyStateNetOfAllocatedCapex,

    netImpactPercentOfBaseline,
    firstYearCashFlow,
    firstYearOperatingCashFlow,
    threeYearCumulativeCashFlow,
    threeYearRoiPercent,
    payback,
    breakEven,
    cashFlowTimeline: timeline,
  };
};

/**
 * Generates a 2D sensitivity matrix exclusively via the central calculateDistributionEconomics engine.
 */
export const buildSensitivityMatrix = (
  baseInputs: EconomicInputs,
  presetId: SensitivityPresetId
): SensitivityMatrix => {
  const classifyZone = (val: number): SensitivityCell['zone'] => {
    if (Math.abs(val) < 1500) return 'breakeven';
    return val > 0 ? 'positive' : 'negative';
  };

  if (presetId === 'ndc_cost_vs_ancillary') {
    const rowValues = [2, 4, 6, 8, 10, 12];
    const colValues = [-2, 0, 2, 4, 6, 8];
    const cells = rowValues.map((ndcCost) =>
      colValues.map((ancillaryUplift) => {
        const res = calculateDistributionEconomics({
          ...baseInputs,
          ndcCostPerBooking: ndcCost,
          ancillaryUpliftPercent: ancillaryUplift,
        });
        return {
          rowValue: ndcCost,
          colValue: ancillaryUplift,
          monthlySteadyStateImpact: res.monthlySteadyStateImpact,
          paybackMonths: res.payback.months,
          zone: classifyZone(res.monthlySteadyStateImpact),
        };
      })
    );
    return {
      presetId,
      title: 'NDC Base Cost vs. Ancillary Revenue Uplift',
      subtitle: 'Monthly steady-state net financial impact across NDC technology cost and ancillary uplift assumptions.',
      rowLabel: 'NDC Base Cost',
      rowUnit: '$',
      colLabel: 'Ancillary Uplift',
      colUnit: '%',
      rowValues,
      colValues,
      cells,
    };
  }

  if (presetId === 'migration_vs_ndc_cost') {
    const rowValues = [10, 25, 40, 60, 80, 100];
    const colValues = [2, 4, 6, 8, 10, 12];
    const cells = rowValues.map((migrationPct) =>
      colValues.map((ndcCost) => {
        const res = calculateDistributionEconomics({
          ...baseInputs,
          ndcMigrationPercent: migrationPct,
          ndcCostPerBooking: ndcCost,
        });
        return {
          rowValue: migrationPct,
          colValue: ndcCost,
          monthlySteadyStateImpact: res.monthlySteadyStateImpact,
          paybackMonths: res.payback.months,
          zone: classifyZone(res.monthlySteadyStateImpact),
        };
      })
    );
    return {
      presetId,
      title: 'NDC Migration Share vs. NDC Base Cost',
      subtitle: 'Shows how scaling migration amplifies either positive unit contribution or unit cost deficits against fixed OPEX.',
      rowLabel: 'Migration Share',
      rowUnit: '%',
      colLabel: 'NDC Base Cost',
      colUnit: '$',
      rowValues,
      colValues,
      cells,
    };
  }

  if (presetId === 'surcharge_recovery_vs_ndc_cost') {
    const rowValues = [0, 20, 40, 60, 80, 100];
    const colValues = [2, 4, 6, 8, 10, 12];
    const effectiveSurcharge =
      baseInputs.gdsSurchargePerTicket > 0 ? baseInputs.gdsSurchargePerTicket : 12;
    const cells = rowValues.map((recoveryPct) =>
      colValues.map((ndcCost) => {
        const res = calculateDistributionEconomics({
          ...baseInputs,
          surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
          gdsSurchargePerTicket: effectiveSurcharge,
          surchargeRecoveryPercent: recoveryPct,
          ndcCostPerBooking: ndcCost,
        });
        return {
          rowValue: recoveryPct,
          colValue: ndcCost,
          monthlySteadyStateImpact: res.monthlySteadyStateImpact,
          paybackMonths: res.payback.months,
          zone: classifyZone(res.monthlySteadyStateImpact),
        };
      })
    );
    return {
      presetId,
      title: `GDS Surcharge Recovery % (at $${effectiveSurcharge.toFixed(0)}/ticket) vs. NDC Base Cost`,
      subtitle:
        'Higher GDS surcharge recovery lowers the airline’s net legacy GDS cost, tightening the hurdle NDC must clear.',
      rowLabel: 'Surcharge Recovery',
      rowUnit: '%',
      colLabel: 'NDC Base Cost',
      colUnit: '$',
      rowValues,
      colValues,
      cells,
    };
  }

  // l2b_vs_ndc_cost
  const rowValues = [100, 500, 1000, 2500, 5000, 10000];
  const colValues = [2, 4, 6, 8, 10, 12];
  const effectiveApiCost =
    baseInputs.shoppingApiCostPerRequest > 0 ? baseInputs.shoppingApiCostPerRequest : 0.001;
  const cells = rowValues.map((l2b) =>
    colValues.map((ndcCost) => {
      const res = calculateDistributionEconomics({
        ...baseInputs,
        shoppingCostsIncludedInBase: false,
        lookToBookRatio: l2b,
        shoppingApiCostPerRequest: effectiveApiCost,
        ndcCostPerBooking: ndcCost,
      });
      return {
        rowValue: l2b,
        colValue: ndcCost,
        monthlySteadyStateImpact: res.monthlySteadyStateImpact,
        paybackMonths: res.payback.months,
        zone: classifyZone(res.monthlySteadyStateImpact),
      };
    })
  );
  return {
    presetId: 'l2b_vs_ndc_cost',
    title: `Look-to-Book Ratio (at $${effectiveApiCost.toFixed(4)}/req) vs. NDC Base Cost`,
    subtitle: 'Evaluates how high shopping API traffic erodes NDC unit economics when not bundled in base fees.',
    rowLabel: 'Look-to-Book Ratio',
    rowUnit: ':1',
    colLabel: 'NDC Base Cost',
    colUnit: '$',
    rowValues,
    colValues,
    cells,
  };
};

/**
 * One-at-a-time sensitivity swing ranking (Tornado analysis) using the central engine.
 */
export const calculateDriverSensitivities = (
  baseInputs: EconomicInputs
): SensitivityDriverImpact[] => {
  const baseImpact = calculateDistributionEconomics(baseInputs).monthlySteadyStateImpact;

  const drivers: Array<{
    id: string;
    label: string;
    lowLabel: string;
    highLabel: string;
    lowPatch: Partial<EconomicInputs>;
    highPatch: Partial<EconomicInputs>;
  }> = [
    {
      id: 'ancillaryUplift',
      label: 'Ancillary Revenue Uplift',
      lowLabel: `${Math.max(-20, baseInputs.ancillaryUpliftPercent - 2).toFixed(1)}%`,
      highLabel: `${Math.min(30, baseInputs.ancillaryUpliftPercent + 2).toFixed(1)}%`,
      lowPatch: { ancillaryUpliftPercent: Math.max(-20, baseInputs.ancillaryUpliftPercent - 2) },
      highPatch: { ancillaryUpliftPercent: Math.min(30, baseInputs.ancillaryUpliftPercent + 2) },
    },
    {
      id: 'ndcCost',
      label: 'NDC Base Technology Cost',
      lowLabel: `$${Math.min(50, baseInputs.ndcCostPerBooking + 2.5).toFixed(2)}`,
      highLabel: `$${Math.max(0, baseInputs.ndcCostPerBooking - 2.5).toFixed(2)}`,
      lowPatch: { ndcCostPerBooking: Math.min(50, baseInputs.ndcCostPerBooking + 2.5) },
      highPatch: { ndcCostPerBooking: Math.max(0, baseInputs.ndcCostPerBooking - 2.5) },
    },
    {
      id: 'migrationShare',
      label: 'NDC Migration Share',
      lowLabel: `${Math.max(0, baseInputs.ndcMigrationPercent - 20).toFixed(0)}%`,
      highLabel: `${Math.min(100, baseInputs.ndcMigrationPercent + 20).toFixed(0)}%`,
      lowPatch: { ndcMigrationPercent: Math.max(0, baseInputs.ndcMigrationPercent - 20) },
      highPatch: { ndcMigrationPercent: Math.min(100, baseInputs.ndcMigrationPercent + 20) },
    },
    {
      id: 'surchargeRecovery',
      label: 'GDS Surcharge Recovery %',
      lowLabel: '100% retained',
      highLabel: '0% retained',
      lowPatch:
        baseInputs.surchargeTreatment === SurchargeTreatment.REVENUE_RECOVERY
          ? { surchargeRecoveryPercent: 100 }
          : {
              surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
              gdsSurchargePerTicket: baseInputs.gdsSurchargePerTicket || 12,
              surchargeRecoveryPercent: 100,
            },
      highPatch:
        baseInputs.surchargeTreatment === SurchargeTreatment.REVENUE_RECOVERY
          ? { surchargeRecoveryPercent: 0 }
          : {
              surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
              gdsSurchargePerTicket: baseInputs.gdsSurchargePerTicket || 12,
              surchargeRecoveryPercent: 0,
            },
    },
    {
      id: 'lookToBook',
      label: 'Look-to-Book Ratio',
      lowLabel: `${Math.min(50000, Math.max(2000, baseInputs.lookToBookRatio * 3)).toLocaleString()}:1`,
      highLabel: `${Math.max(0, Math.round(baseInputs.lookToBookRatio * 0.25)).toLocaleString()}:1`,
      lowPatch: {
        shoppingCostsIncludedInBase: false,
        lookToBookRatio: Math.min(50000, Math.max(2000, baseInputs.lookToBookRatio * 3)),
      },
      highPatch: {
        shoppingCostsIncludedInBase: false,
        lookToBookRatio: Math.max(0, Math.round(baseInputs.lookToBookRatio * 0.25)),
      },
    },
    {
      id: 'pricingUplift',
      label: 'Continuous Pricing Uplift',
      lowLabel: `${Math.max(-10, baseInputs.continuousPricingUpliftPercent - 1).toFixed(1)}%`,
      highLabel: `${Math.min(15, baseInputs.continuousPricingUpliftPercent + 1).toFixed(1)}%`,
      lowPatch: {
        continuousPricingUpliftPercent: Math.max(-10, baseInputs.continuousPricingUpliftPercent - 1),
      },
      highPatch: {
        continuousPricingUpliftPercent: Math.min(15, baseInputs.continuousPricingUpliftPercent + 1),
      },
    },
  ];

  return drivers
    .map((d) => {
      const lowImpact = calculateDistributionEconomics({
        ...baseInputs,
        ...d.lowPatch,
      }).monthlySteadyStateImpact;
      const highImpact = calculateDistributionEconomics({
        ...baseInputs,
        ...d.highPatch,
      }).monthlySteadyStateImpact;
      return {
        id: d.id,
        label: d.label,
        lowScenarioLabel: d.lowLabel,
        highScenarioLabel: d.highLabel,
        lowImpact,
        baseImpact,
        highImpact,
        swing: Math.abs(highImpact - lowImpact),
      };
    })
    .sort((a, b) => b.swing - a.swing);
};

// Consistent Formatting Helpers
export const formatCurrency = (val: number): string => {
  if (!Number.isFinite(val)) return '—';
  const normalized = Object.is(val, -0) ? 0 : val;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(normalized);
};

export const formatSignedCurrency = (val: number): string => {
  if (!Number.isFinite(val)) return '—';
  const normalized = Object.is(val, -0) ? 0 : val;
  const formatted = formatCurrency(Math.abs(normalized));
  if (normalized > 0) return `+${formatted}`;
  if (normalized < 0) return `-${formatted}`;
  return formatted;
};

export const formatCurrencyPrecise = (val: number): string => {
  if (!Number.isFinite(val)) return '—';
  const normalized = Object.is(val, -0) ? 0 : val;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
};

export const formatSignedCurrencyPrecise = (val: number): string => {
  if (!Number.isFinite(val)) return '—';
  const normalized = Object.is(val, -0) ? 0 : val;
  const formatted = formatCurrencyPrecise(Math.abs(normalized));
  if (normalized > 0) return `+${formatted}`;
  if (normalized < 0) return `-${formatted}`;
  return formatted;
};

export const formatPercent = (val: number, decimals = 1): string => {
  if (!Number.isFinite(val)) return '—';
  return `${val.toFixed(decimals)}%`;
};

export const formatNumber = (val: number): string => {
  if (!Number.isFinite(val)) return '—';
  return new Intl.NumberFormat('en-US').format(val);
};
