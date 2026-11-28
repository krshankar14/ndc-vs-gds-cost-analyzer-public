import {
  AirlineType,
  EconomicInputs,
  RecommendationThresholds,
  Region,
  ScenarioItem,
  SurchargeTreatment,
} from './types';

export const APP_NAME = 'NDC vs GDS Distribution Decision Assistant';
export const APP_VERSION = '2.0.0';
export const CURRENCY_CODE = 'USD' as const;
export const EVALUATION_HORIZON_MONTHS = 36;
export const MAX_REALISTIC_ANCILLARY_UPLIFT_PERCENT = 100;

export const LOCAL_STORAGE_KEYS = {
  SCENARIOS: 'ndc_gds_v2_scenarios',
  PERSISTENCE_ENABLED: 'ndc_gds_v2_persistence_enabled',
  THRESHOLDS: 'ndc_gds_v2_thresholds',
} as const;

export const DEFAULT_RECOMMENDATION_THRESHOLDS: RecommendationThresholds = {
  favorableMinMonthlyImpact: 50000,
  unfavorableMaxMonthlyImpact: 0,
  favorableMaxPaybackMonths: 18,
  conditionalMaxPaybackMonths: 36,
};

/**
 * Synthetic, illustrative carrier profiles for early-stage scenario modeling.
 * These figures do not represent any specific airline's confidential contracts or commercial P&L.
 */
export const DEFAULT_INPUTS_FSC: EconomicInputs = {
  airlineType: AirlineType.FSC,
  monthlyBookings: 100000,
  avgSegments: 2.6,
  ticketsPerBooking: 1.15,
  avgTicketValue: 320,
  ndcMigrationPercent: 35,

  gdsCostPerSegment: 6.0,
  gdsAdditionalTransactionFee: 1.5,
  surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
  gdsSurchargePerTicket: 12.0,
  surchargeRecoveryPercent: 60,
  agencyIncentivePerBooking: 2.5,
  commercialRebatePerBooking: 1.0,
  gdsOtherServicingCost: 0.75,

  ndcCostPerBooking: 4.5,
  ndcServicingCostPerBooking: 1.25,
  shoppingCostsIncludedInBase: false,
  lookToBookRatio: 500,
  includedShoppingRequestsPerBooking: 100,
  ndcShoppingTrafficSharePercent: 100,
  shoppingApiCostPerRequest: 0.001,

  ancillaryUpliftPercent: 3.5,
  ancillaryContributionMarginPercent: 65,
  continuousPricingUpliftPercent: 1.2,
  pricingContributionMarginPercent: 90,

  oneTimeImplementationCapex: 1200000,
  incrementalMonthlyFixedOpex: 35000,
  monthlyTransitionExpense: 45000,
  transitionDurationMonths: 12,
  capexAllocationMonths: 36,
};

export const DEFAULT_INPUTS_LCC: EconomicInputs = {
  airlineType: AirlineType.LCC,
  monthlyBookings: 200000,
  avgSegments: 1.6,
  ticketsPerBooking: 1.1,
  avgTicketValue: 130,
  ndcMigrationPercent: 40,

  gdsCostPerSegment: 4.25,
  gdsAdditionalTransactionFee: 0.75,
  surchargeTreatment: SurchargeTreatment.NONE,
  gdsSurchargePerTicket: 0,
  surchargeRecoveryPercent: 0,
  agencyIncentivePerBooking: 0.5,
  commercialRebatePerBooking: 0,
  gdsOtherServicingCost: 0.5,

  ndcCostPerBooking: 3.0,
  ndcServicingCostPerBooking: 0.75,
  shoppingCostsIncludedInBase: false,
  lookToBookRatio: 700,
  includedShoppingRequestsPerBooking: 100,
  ndcShoppingTrafficSharePercent: 100,
  shoppingApiCostPerRequest: 0.001,

  ancillaryUpliftPercent: 1.2,
  ancillaryContributionMarginPercent: 75,
  continuousPricingUpliftPercent: 0.4,
  pricingContributionMarginPercent: 90,

  oneTimeImplementationCapex: 750000,
  incrementalMonthlyFixedOpex: 22000,
  monthlyTransitionExpense: 25000,
  transitionDurationMonths: 9,
  capexAllocationMonths: 36,
};

/**
 * Explicitly illustrative regional commercial presets.
 * Commercial terms vary widely by airline, GDS contract, market, and agency channel.
 */
export const REGION_PRESETS: Record<
  Region,
  { label: string; note: string; patch: Partial<EconomicInputs> }
> = {
  [Region.EU]: {
    label: 'EU (Illustrative)',
    note: 'Illustrative pattern with an airline-imposed GDS distribution surcharge partially recovered.',
    patch: {
      gdsCostPerSegment: 6.0,
      surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
      gdsSurchargePerTicket: 14.0,
      surchargeRecoveryPercent: 65,
    },
  },
  [Region.NA]: {
    label: 'NA (Illustrative)',
    note: 'Illustrative pattern with no GDS surcharge and higher per-segment fees plus agency incentives.',
    patch: {
      gdsCostPerSegment: 7.25,
      surchargeTreatment: SurchargeTreatment.NONE,
      gdsSurchargePerTicket: 0,
      surchargeRecoveryPercent: 0,
      agencyIncentivePerBooking: 3.0,
    },
  },
  [Region.APAC]: {
    label: 'APAC (Illustrative)',
    note: 'Illustrative pattern with moderate GDS segment fees and lower partial surcharge recovery.',
    patch: {
      gdsCostPerSegment: 5.0,
      surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
      gdsSurchargePerTicket: 8.0,
      surchargeRecoveryPercent: 50,
    },
  },
};

export interface InputFieldSpec {
  min: number;
  max: number;
  step: number;
  unit: string;
  label: string;
  tooltip: string;
}

export const INPUT_FIELD_SPECS: Record<
  Exclude<
    keyof EconomicInputs,
    'airlineType' | 'surchargeTreatment' | 'shoppingCostsIncludedInBase'
  >,
  InputFieldSpec
> = {
  monthlyBookings: {
    min: 0,
    max: 10000000,
    step: 1000,
    unit: 'bookings/mo',
    label: 'Eligible Monthly Indirect Bookings',
    tooltip:
      'Indirect channel booking volume in scope for legacy GDS vs. NDC channel modeling (excludes direct airline web/app bookings).',
  },
  avgSegments: {
    min: 0,
    max: 10,
    step: 0.1,
    unit: 'segments',
    label: 'Average Segments per Booking',
    tooltip: 'Average flight coupons/segments booked per PNR. Multiplies the per-segment GDS fee.',
  },
  ticketsPerBooking: {
    min: 0.1,
    max: 10,
    step: 0.05,
    unit: 'tickets/booking',
    label: 'Average Tickets per Booking',
    tooltip:
      'Conversion factor from per-ticket charges (such as a per-ticket distribution surcharge) to a per-booking basis.',
  },
  avgTicketValue: {
    min: 0,
    max: 25000,
    step: 10,
    unit: 'USD',
    label: 'Average Ticket Value (Base + YQ)',
    tooltip:
      'Average base ticket revenue per booking used as the denominator for incremental ancillary and continuous pricing uplift percentages.',
  },
  ndcMigrationPercent: {
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    label: 'NDC Migration Share',
    tooltip:
      'Percentage of eligible indirect bookings transitioned to the modeled NDC commercial channel (0% = full legacy baseline; 100% = full eligible migration).',
  },
  gdsCostPerSegment: {
    min: 0,
    max: 50,
    step: 0.25,
    unit: 'USD/segment',
    label: 'GDS Segment Booking Fee',
    tooltip: 'Booking fee paid by the airline to the GDS per flight segment under legacy EDIFACT agreements.',
  },
  gdsAdditionalTransactionFee: {
    min: 0,
    max: 50,
    step: 0.25,
    unit: 'USD/booking',
    label: 'Additional GDS Transaction Charges',
    tooltip: 'Additional passive, ticketing, or messaging transaction charges paid by the airline per GDS booking.',
  },
  gdsSurchargePerTicket: {
    min: 0,
    max: 100,
    step: 1,
    unit: 'USD/ticket',
    label: 'Distribution Surcharge Amount',
    tooltip:
      'Per-ticket GDS distribution surcharge (DTC). Treated strictly as either None, Additional Airline Expense, or Airline Revenue Recovery — never both.',
  },
  surchargeRecoveryPercent: {
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    label: 'Surcharge Retention / Recovery Rate',
    tooltip:
      'Share of the billed distribution surcharge actually retained by the airline net of corporate waivers, exemptions, and competitive fare discounting.',
  },
  agencyIncentivePerBooking: {
    min: 0,
    max: 100,
    step: 0.5,
    unit: 'USD/booking',
    label: 'Agency Incentives Paid (GDS)',
    tooltip: 'Override commissions or agency incentives paid by the airline on legacy GDS bookings.',
  },
  commercialRebatePerBooking: {
    min: 0,
    max: 100,
    step: 0.5,
    unit: 'USD/booking',
    label: 'Commercial Rebates Received (GDS)',
    tooltip: 'Contractual volume rebates or fee credits received by the airline on GDS bookings, reducing net GDS expense.',
  },
  gdsOtherServicingCost: {
    min: 0,
    max: 50,
    step: 0.25,
    unit: 'USD/booking',
    label: 'Other GDS Servicing Cost',
    tooltip: 'Airline back-office settlement, BSP/ARC reconciliation, or servicing cost specific to legacy GDS bookings.',
  },
  ndcCostPerBooking: {
    min: 0,
    max: 50,
    step: 0.25,
    unit: 'USD/booking',
    label: 'Base NDC Technology / Aggregator Fee',
    tooltip: 'Recurring per-booking technology, NDC gateway, or aggregator fee incurred on migrated NDC bookings.',
  },
  ndcServicingCostPerBooking: {
    min: 0,
    max: 50,
    step: 0.25,
    unit: 'USD/booking',
    label: 'Incremental NDC Fulfilment / Servicing Cost',
    tooltip:
      'Additional servicing, re-accommodation, exchange/refund support, or payment handling cost per NDC booking not already included in the base fee.',
  },
  lookToBookRatio: {
    min: 0,
    max: 50000,
    step: 50,
    unit: 'req/booking',
    label: 'Look-to-Book (L2B) Ratio',
    tooltip:
      'Number of shopping API requests per confirmed NDC booking. High L2B ratios from metasearch or multi-aggregator shopping can significantly raise infrastructure costs.',
  },
  includedShoppingRequestsPerBooking: {
    min: 0,
    max: 50000,
    step: 50,
    unit: 'req/booking',
    label: 'Shopping Requests Included in Base Fee',
    tooltip:
      'Shopping API requests already bundled inside the base NDC technology fee to prevent double-counting shopping infrastructure costs.',
  },
  ndcShoppingTrafficSharePercent: {
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    label: 'Shopping Traffic Attributable to NDC',
    tooltip:
      'Percentage of total L2B shopping API traffic incrementally generated by the NDC channel rather than shifted from existing API capacity.',
  },
  shoppingApiCostPerRequest: {
    min: 0,
    max: 0.5,
    step: 0.0005,
    unit: 'USD/request',
    label: 'Marginal Cost per Shopping API Request',
    tooltip:
      'Estimated marginal cloud compute, caching, pricing engine, and bandwidth cost per additional shopping API call. Must be validated with IT benchmarks.',
  },
  ancillaryUpliftPercent: {
    min: -20,
    max: 30,
    step: 0.5,
    unit: '% of ATV',
    label: 'Incremental Ancillary Revenue Uplift',
    tooltip:
      'New ancillary revenue per migrated NDC booking as a signed percentage of Average Ticket Value (can be negative if conversion degrades). Excludes existing baseline ancillary revenue.',
  },
  ancillaryContributionMarginPercent: {
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    label: 'Ancillary Contribution Margin',
    tooltip:
      'Share of incremental ancillary revenue retained as contribution margin after direct fulfilment, catering, lounge, or payment costs.',
  },
  continuousPricingUpliftPercent: {
    min: -10,
    max: 15,
    step: 0.2,
    unit: '% of ATV',
    label: 'Continuous Pricing Revenue Uplift',
    tooltip:
      'Incremental fare yield uplift from dynamic/continuous pricing over 26-letter RBD filing on migrated NDC bookings (signed percentage of Average Ticket Value).',
  },
  pricingContributionMarginPercent: {
    min: 0,
    max: 100,
    step: 5,
    unit: '%',
    label: 'Pricing Contribution Margin',
    tooltip:
      'Share of incremental fare pricing revenue flowing through to contribution margin after variable payment fees or commissions.',
  },
  oneTimeImplementationCapex: {
    min: 0,
    max: 50000000,
    step: 50000,
    unit: 'USD',
    label: 'One-Time NDC Implementation CAPEX',
    tooltip:
      'Upfront software build, PSS integration, certification, and agency onboarding investment. Applied at Month 0 in cash flow and payback calculations.',
  },
  incrementalMonthlyFixedOpex: {
    min: 0,
    max: 5000000,
    step: 5000,
    unit: 'USD/mo',
    label: 'Incremental Monthly Fixed OPEX',
    tooltip:
      'Ongoing monthly fixed NDC platform licensing, SRE/DevOps support, and commercial team costs incurred regardless of booking volume.',
  },
  monthlyTransitionExpense: {
    min: 0,
    max: 5000000,
    step: 5000,
    unit: 'USD/mo',
    label: 'Monthly Transition / Parallel-Run Cost',
    tooltip:
      'Temporary monthly expenses during dual-channel operation, agency training, migration incentives, and parallel servicing.',
  },
  transitionDurationMonths: {
    min: 0,
    max: 36,
    step: 1,
    unit: 'months',
    label: 'Transition Period Duration',
    tooltip: 'Number of months during which temporary monthly transition expenses are incurred.',
  },
  capexAllocationMonths: {
    min: 0,
    max: 60,
    step: 6,
    unit: 'months',
    label: 'Optional CAPEX Allocation Horizon (P&L View)',
    tooltip:
      'Optional straight-line allocation period shown separately for P&L reference only. Never double-counted alongside Month 0 cash CAPEX.',
  },
};

export const createDefaultScenarios = (): ScenarioItem[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'scenario-conservative',
      name: 'Conservative NDC Adoption',
      description:
        'Targeted 20% migration with cautious ancillary uplift, higher servicing friction, and longer transition overlap.',
      inputs: {
        ...DEFAULT_INPUTS_FSC,
        ndcMigrationPercent: 20,
        ndcCostPerBooking: 5.5,
        ndcServicingCostPerBooking: 1.75,
        lookToBookRatio: 900,
        ancillaryUpliftPercent: 1.5,
        ancillaryContributionMarginPercent: 55,
        continuousPricingUpliftPercent: 0.5,
        monthlyTransitionExpense: 55000,
        transitionDurationMonths: 15,
      },
      updatedAt: now,
    },
    {
      id: 'scenario-balanced',
      name: 'Balanced / Hybrid Adoption',
      description:
        'Illustrative 35% hybrid migration retaining legacy GDS where agency readiness or corporate contracts require it.',
      inputs: {
        ...DEFAULT_INPUTS_FSC,
      },
      updatedAt: now,
    },
    {
      id: 'scenario-accelerated',
      name: 'Accelerated NDC Adoption',
      description:
        'Ambitious 65% eligible migration assuming mature aggregator workflows, stronger ancillary attachment, and higher CAPEX.',
      inputs: {
        ...DEFAULT_INPUTS_FSC,
        ndcMigrationPercent: 65,
        ndcCostPerBooking: 3.75,
        ndcServicingCostPerBooking: 1.0,
        lookToBookRatio: 400,
        ancillaryUpliftPercent: 5.0,
        ancillaryContributionMarginPercent: 70,
        continuousPricingUpliftPercent: 1.8,
        oneTimeImplementationCapex: 1800000,
        incrementalMonthlyFixedOpex: 50000,
        monthlyTransitionExpense: 65000,
        transitionDurationMonths: 12,
      },
      updatedAt: now,
    },
  ];
};
