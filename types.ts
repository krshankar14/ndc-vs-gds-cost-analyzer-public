export enum AirlineType {
  FSC = 'Full-Service Carrier',
  LCC = 'Low-Cost Carrier',
}

export enum Region {
  NA = 'North America',
  EU = 'Europe',
  APAC = 'Asia Pacific',
}

export enum SurchargeTreatment {
  NONE = 'none',
  AIRLINE_EXPENSE = 'airline_expense',
  REVENUE_RECOVERY = 'revenue_recovery',
}

export type InputMode = 'basic' | 'advanced';

export type WorkspaceTab = 'simulator' | 'scenarios' | 'sensitivity' | 'assumptions';

export interface EconomicInputs {
  // Profile & Volume
  airlineType: AirlineType;
  monthlyBookings: number;
  avgSegments: number;
  ticketsPerBooking: number;
  avgTicketValue: number;
  ndcMigrationPercent: number;

  // Legacy GDS Commercials (Airline Perspective)
  gdsCostPerSegment: number;
  gdsAdditionalTransactionFee: number;
  surchargeTreatment: SurchargeTreatment;
  gdsSurchargePerTicket: number;
  surchargeRecoveryPercent: number;
  agencyIncentivePerBooking: number;
  commercialRebatePerBooking: number;
  gdsOtherServicingCost: number;

  // NDC Commercials & Look-to-Book
  ndcCostPerBooking: number;
  ndcServicingCostPerBooking: number;
  shoppingCostsIncludedInBase: boolean;
  lookToBookRatio: number;
  includedShoppingRequestsPerBooking: number;
  ndcShoppingTrafficSharePercent: number;
  shoppingApiCostPerRequest: number;

  // Offer Value Creation (Gross Revenue & Contribution Margin)
  ancillaryUpliftPercent: number; // Signed percentage (-20 to +30)
  ancillaryContributionMarginPercent: number; // 0 to 100
  continuousPricingUpliftPercent: number; // Signed percentage (-10 to +15)
  pricingContributionMarginPercent: number; // 0 to 100

  // Implementation CAPEX, Fixed OPEX & Transition
  oneTimeImplementationCapex: number;
  incrementalMonthlyFixedOpex: number;
  monthlyTransitionExpense: number;
  transitionDurationMonths: number;
  capexAllocationMonths: number;
}

export type BreakEvenStatus =
  | 'no_uplift_required'
  | 'uplift_required'
  | 'not_achievable'
  | 'insufficient_data';

export interface BreakEvenResult {
  status: BreakEvenStatus;
  requiredAncillaryUpliftPercent: number | null;
  label: string;
  explanation: string;
}

export type PaybackStatus = 'immediate' | 'achieved' | 'not_achieved' | 'not_applicable';

export interface PaybackResult {
  status: PaybackStatus;
  months: number | null;
  label: string;
  explanation: string;
}

export interface MonthlyCashFlowPoint {
  month: number;
  phase: 'capex' | 'transition' | 'steady_state';
  monthlyCashFlow: number;
  cumulativeCashFlow: number;
}

export interface EconomicResults {
  // Volume Split
  eligibleMonthlyBookings: number;
  ndcBookings: number;
  remainingGdsBookings: number;
  ndcMigrationPercent: number;

  // GDS Unit Economics (Airline Perspective)
  unitGdsSegmentFee: number;
  unitGdsSurchargeGross: number;
  unitGdsSurchargeExpense: number;
  unitGdsSurchargeRecovery: number;
  unitGdsGrossCost: number;
  unitGdsRecoveriesAndRebates: number;
  unitNetGdsCost: number;

  // NDC Unit Economics
  additionalLookToBookRequests: number;
  unitIncrementalShoppingCost: number;
  unitNdcBaseCost: number;
  unitNdcServicingCost: number;
  unitNdcVariableCost: number;

  // Offer Value Unit Economics (Migrated NDC Bookings)
  unitAncillaryRevenue: number;
  unitAncillaryContribution: number;
  unitPricingRevenue: number;
  unitPricingContribution: number;
  unitGrossIncrementalRevenue: number;
  unitIncrementalContribution: number;
  unitNdcNetContributionVsGds: number;

  // Monthly Distribution Cost Totals
  baselineMonthlyNetGdsCost: number;
  futureRemainingGdsCostMonthly: number;
  futureNdcVariableCostMonthly: number;
  blendedVariableDistributionCostMonthly: number;
  blendedSteadyStateDistributionCostMonthly: number;
  blendedTransitionDistributionCostMonthly: number;
  variableDistributionCostSavingsMonthly: number;
  steadyStateDistributionCostSavingsMonthly: number;

  // Monthly Value Creation Totals (Migrated Volume Only)
  grossAncillaryRevenueMonthly: number;
  grossPricingRevenueMonthly: number;
  grossIncrementalRevenueMonthly: number;
  ancillaryContributionMonthly: number;
  pricingContributionMonthly: number;
  incrementalContributionMonthly: number;

  // Monthly & Annualized Net Financial Impacts (Strict CAPEX/OPEX separation)
  incrementalMonthlyFixedOpex: number;
  monthlyTransitionExpense: number;
  monthlySteadyStateImpact: number;
  monthlyTransitionImpact: number;
  annualizedSteadyStateImpact: number; // Run-rate only; not a verified forecast
  monthlyAllocatedCapex: number; // Optional P&L allocation view only (never combined with cash CAPEX)
  monthlySteadyStateNetOfAllocatedCapex: number;

  // Relative Impact & Cash Flow Metrics
  netImpactPercentOfBaseline: number | null; // Null when baseline net GDS cost <= 0
  firstYearCashFlow: number; // Includes Month 0 CAPEX + Months 1–12 cash flow
  firstYearOperatingCashFlow: number; // Months 1–12 cash flow excluding Month 0 CAPEX
  threeYearCumulativeCashFlow: number; // Month 0 CAPEX + Months 1–36 cash flow
  threeYearRoiPercent: number | null; // Defined strictly over 36-month cash horizon when CAPEX > 0
  payback: PaybackResult;
  breakEven: BreakEvenResult;
  cashFlowTimeline: MonthlyCashFlowPoint[];
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  field: keyof EconomicInputs | 'general';
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationSummary {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  sanitizedInputs: EconomicInputs;
}

export type RecommendationStatus =
  | 'favorable'
  | 'hybrid_conditional'
  | 'unfavorable'
  | 'insufficient_information';

export interface RecommendationThresholds {
  favorableMinMonthlyImpact: number;
  unfavorableMaxMonthlyImpact: number;
  favorableMaxPaybackMonths: number;
  conditionalMaxPaybackMonths: number;
}

export interface RecommendationResult {
  status: RecommendationStatus;
  title: string;
  primaryFinding: string;
  keyValueDrivers: string[];
  criticalRisks: string[];
  recommendedNextInvestigations: string[];
  assumptionsRequiringValidation: string[];
  sensitivityNote: string;
}

export interface ScenarioItem {
  id: string;
  name: string;
  description: string;
  inputs: EconomicInputs;
  updatedAt: string;
}

export type SensitivityPresetId =
  | 'ndc_cost_vs_ancillary'
  | 'migration_vs_ndc_cost'
  | 'surcharge_recovery_vs_ndc_cost'
  | 'l2b_vs_ndc_cost';

export interface SensitivityCell {
  rowValue: number;
  colValue: number;
  monthlySteadyStateImpact: number;
  paybackMonths: number | null;
  zone: 'positive' | 'breakeven' | 'negative';
}

export interface SensitivityMatrix {
  presetId: SensitivityPresetId;
  title: string;
  subtitle: string;
  rowLabel: string;
  rowUnit: string;
  colLabel: string;
  colUnit: string;
  rowValues: number[];
  colValues: number[];
  cells: SensitivityCell[][];
}

export interface SensitivityDriverImpact {
  id: string;
  label: string;
  lowScenarioLabel: string;
  highScenarioLabel: string;
  lowImpact: number;
  baseImpact: number;
  highImpact: number;
  swing: number;
}

export interface ExportPayloadV2 {
  schemaVersion: '2.0.0';
  appName: string;
  appVersion: string;
  currency: 'USD';
  exportedAt: string;
  scenarioName: string;
  scenarioDescription: string;
  inputs: EconomicInputs;
  results: EconomicResults;
  recommendation: RecommendationResult;
}
