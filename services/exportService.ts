import { APP_NAME, APP_VERSION, CURRENCY_CODE } from '../constants';
import {
  EconomicInputs,
  EconomicResults,
  ExportPayloadV2,
  RecommendationResult,
  ScenarioItem,
} from '../types';

const FORMULA_TRIGGER_PATTERN = /^[\t\r ]*[=+\-@\t\r]/;

/**
 * Neutralizes spreadsheet formula injection (CSV Injection) for string cells
 * while preserving pure finite numeric literals cleanly.
 */
export const sanitizeCsvCell = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '""';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  let text = String(value);
  if (FORMULA_TRIGGER_PATTERN.test(text)) {
    text = `'${text}`;
  }

  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const buildExportPayload = (
  scenario: ScenarioItem,
  results: EconomicResults,
  recommendation: RecommendationResult,
  exportedAt = new Date().toISOString()
): ExportPayloadV2 => ({
  schemaVersion: '2.0.0',
  appName: APP_NAME,
  appVersion: APP_VERSION,
  currency: CURRENCY_CODE,
  exportedAt,
  scenarioName: scenario.name,
  scenarioDescription: scenario.description,
  inputs: scenario.inputs,
  results,
  recommendation,
});

export const generateScenarioJson = (
  scenario: ScenarioItem,
  results: EconomicResults,
  recommendation: RecommendationResult,
  exportedAt = new Date().toISOString()
): string => {
  const payload = buildExportPayload(scenario, results, recommendation, exportedAt);
  return JSON.stringify(payload, null, 2);
};

export const generateScenarioCsv = (
  scenario: ScenarioItem,
  results: EconomicResults,
  recommendation: RecommendationResult,
  exportedAt = new Date().toISOString()
): string => {
  const rows: Array<[string, string, string | number | boolean | null, string]> = [
    ['Metadata', 'Application', APP_NAME, ''],
    ['Metadata', 'Application Version', APP_VERSION, ''],
    ['Metadata', 'Currency', CURRENCY_CODE, ''],
    ['Metadata', 'Export Date (UTC)', exportedAt, 'ISO-8601'],
    ['Metadata', 'Scenario Name', scenario.name, ''],
    ['Metadata', 'Scenario Description', scenario.description, ''],

    // Inputs
    ['Inputs', 'Airline Profile', scenario.inputs.airlineType, ''],
    ['Inputs', 'Eligible Monthly Indirect Bookings', scenario.inputs.monthlyBookings, 'bookings/mo'],
    ['Inputs', 'NDC Migration Share', scenario.inputs.ndcMigrationPercent, '%'],
    ['Inputs', 'Average Segments per Booking', scenario.inputs.avgSegments, 'segments'],
    ['Inputs', 'Average Tickets per Booking', scenario.inputs.ticketsPerBooking, 'tickets'],
    ['Inputs', 'Average Ticket Value', scenario.inputs.avgTicketValue, 'USD'],
    ['Inputs', 'GDS Segment Booking Fee', scenario.inputs.gdsCostPerSegment, 'USD/segment'],
    ['Inputs', 'Additional GDS Transaction Fee', scenario.inputs.gdsAdditionalTransactionFee, 'USD/booking'],
    ['Inputs', 'GDS Surcharge Treatment', scenario.inputs.surchargeTreatment, ''],
    ['Inputs', 'GDS Surcharge Amount', scenario.inputs.gdsSurchargePerTicket, 'USD/ticket'],
    ['Inputs', 'Surcharge Recovery Rate', scenario.inputs.surchargeRecoveryPercent, '%'],
    ['Inputs', 'Agency Incentives Paid (GDS)', scenario.inputs.agencyIncentivePerBooking, 'USD/booking'],
    ['Inputs', 'Commercial Rebates Received (GDS)', scenario.inputs.commercialRebatePerBooking, 'USD/booking'],
    ['Inputs', 'Other GDS Servicing Cost', scenario.inputs.gdsOtherServicingCost, 'USD/booking'],
    ['Inputs', 'Base NDC Technology Fee', scenario.inputs.ndcCostPerBooking, 'USD/booking'],
    ['Inputs', 'Incremental NDC Servicing Cost', scenario.inputs.ndcServicingCostPerBooking, 'USD/booking'],
    ['Inputs', 'Shopping Costs Included in Base Fee', scenario.inputs.shoppingCostsIncludedInBase, 'boolean'],
    ['Inputs', 'Look-to-Book Ratio', scenario.inputs.lookToBookRatio, 'req/booking'],
    ['Inputs', 'Included Shopping Requests', scenario.inputs.includedShoppingRequestsPerBooking, 'req/booking'],
    ['Inputs', 'NDC Shopping Traffic Share', scenario.inputs.ndcShoppingTrafficSharePercent, '%'],
    ['Inputs', 'Marginal Shopping API Cost', scenario.inputs.shoppingApiCostPerRequest, 'USD/request'],
    ['Inputs', 'Ancillary Revenue Uplift', scenario.inputs.ancillaryUpliftPercent, '% of ATV'],
    ['Inputs', 'Ancillary Contribution Margin', scenario.inputs.ancillaryContributionMarginPercent, '%'],
    ['Inputs', 'Continuous Pricing Uplift', scenario.inputs.continuousPricingUpliftPercent, '% of ATV'],
    ['Inputs', 'Pricing Contribution Margin', scenario.inputs.pricingContributionMarginPercent, '%'],
    ['Inputs', 'One-Time Implementation CAPEX', scenario.inputs.oneTimeImplementationCapex, 'USD'],
    ['Inputs', 'Incremental Monthly Fixed OPEX', scenario.inputs.incrementalMonthlyFixedOpex, 'USD/mo'],
    ['Inputs', 'Monthly Transition Expense', scenario.inputs.monthlyTransitionExpense, 'USD/mo'],
    ['Inputs', 'Transition Period Duration', scenario.inputs.transitionDurationMonths, 'months'],
    ['Inputs', 'Optional CAPEX Allocation Horizon', scenario.inputs.capexAllocationMonths, 'months'],

    // Outputs
    ['Results', 'Migrated NDC Bookings', results.ndcBookings, 'bookings/mo'],
    ['Results', 'Remaining Legacy GDS Bookings', results.remainingGdsBookings, 'bookings/mo'],
    ['Results', 'Unit Net GDS Cost', Number(results.unitNetGdsCost.toFixed(2)), 'USD/booking'],
    ['Results', 'Unit NDC Variable Cost', Number(results.unitNdcVariableCost.toFixed(2)), 'USD/booking'],
    ['Results', 'Unit Incremental Shopping Cost', Number(results.unitIncrementalShoppingCost.toFixed(2)), 'USD/booking'],
    ['Results', 'Baseline Monthly Net GDS Cost', Number(results.baselineMonthlyNetGdsCost.toFixed(2)), 'USD/mo'],
    ['Results', 'Future Blended Variable Cost', Number(results.blendedVariableDistributionCostMonthly.toFixed(2)), 'USD/mo'],
    ['Results', 'Future Blended Steady-State Cost', Number(results.blendedSteadyStateDistributionCostMonthly.toFixed(2)), 'USD/mo'],
    ['Results', 'Variable Distribution Cost Savings', Number(results.variableDistributionCostSavingsMonthly.toFixed(2)), 'USD/mo'],
    ['Results', 'Gross Incremental Revenue (Monthly)', Number(results.grossIncrementalRevenueMonthly.toFixed(2)), 'USD/mo'],
    ['Results', 'Incremental Contribution Margin (Monthly)', Number(results.incrementalContributionMonthly.toFixed(2)), 'USD/mo'],
    ['Results', 'Monthly Steady-State Financial Impact', Number(results.monthlySteadyStateImpact.toFixed(2)), 'USD/mo'],
    ['Results', 'Monthly Transition-Period Financial Impact', Number(results.monthlyTransitionImpact.toFixed(2)), 'USD/mo'],
    ['Results', 'Annualized Steady-State Run Rate', Number(results.annualizedSteadyStateImpact.toFixed(2)), 'USD/yr'],
    ['Results', 'First-Year Incremental Cash Flow (incl. CAPEX)', Number(results.firstYearCashFlow.toFixed(2)), 'USD'],
    ['Results', '3-Year Cumulative Cash Flow', Number(results.threeYearCumulativeCashFlow.toFixed(2)), 'USD'],
    ['Results', '3-Year Cash ROI on CAPEX', results.threeYearRoiPercent ?? 'N/A', '%'],
    ['Results', 'Implementation Payback Period', results.payback.label, ''],
    ['Results', 'Break-Even Ancillary Uplift', results.breakEven.label, ''],
    ['Recommendation', 'Status', recommendation.status, ''],
    ['Recommendation', 'Primary Finding', recommendation.primaryFinding, ''],
  ];

  const header = ['Section', 'Metric', 'Value', 'Unit'].map(sanitizeCsvCell).join(',');
  const body = rows.map((row) => row.map(sanitizeCsvCell).join(',')).join('\n');
  return `${header}\n${body}\n`;
};

export const triggerTextDownload = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const buildSafeFilename = (scenarioName: string, ext: 'csv' | 'json'): string => {
  const slug = scenarioName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `ndc-gds-${slug || 'scenario'}-${dateStamp}.${ext}`;
};

export type ExportInputSnapshot = EconomicInputs;
