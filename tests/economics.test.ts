import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS_FSC, DEFAULT_INPUTS_LCC } from '../constants';
import {
  buildSensitivityMatrix,
  calculateDistributionEconomics,
  calculateDriverSensitivities,
} from '../services/economics';
import { EconomicInputs, SurchargeTreatment } from '../types';

const makeCleanBase = (overrides: Partial<EconomicInputs> = {}): EconomicInputs => ({
  ...DEFAULT_INPUTS_FSC,
  monthlyBookings: 1000,
  avgSegments: 2,
  ticketsPerBooking: 1,
  avgTicketValue: 100,
  ndcMigrationPercent: 50,
  gdsCostPerSegment: 6,
  gdsAdditionalTransactionFee: 0,
  surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
  gdsSurchargePerTicket: 2,
  surchargeRecoveryPercent: 100,
  agencyIncentivePerBooking: 0,
  commercialRebatePerBooking: 0,
  gdsOtherServicingCost: 0,
  ndcCostPerBooking: 8,
  ndcServicingCostPerBooking: 1,
  shoppingCostsIncludedInBase: false,
  lookToBookRatio: 1000,
  includedShoppingRequestsPerBooking: 0,
  ndcShoppingTrafficSharePercent: 100,
  shoppingApiCostPerRequest: 0.001,
  ancillaryUpliftPercent: 4,
  ancillaryContributionMarginPercent: 50,
  continuousPricingUpliftPercent: 1,
  pricingContributionMarginPercent: 100,
  oneTimeImplementationCapex: 0,
  incrementalMonthlyFixedOpex: 100,
  monthlyTransitionExpense: 200,
  transitionDurationMonths: 6,
  capexAllocationMonths: 0,
  ...overrides,
});

describe('Distribution Economics Engine (v2.0)', () => {
  it('reproduces the Mandatory Reference Scenario with exact independent hand-calculated values', () => {
    const inputs = makeCleanBase();
    const res = calculateDistributionEconomics(inputs);

    expect(res.ndcBookings).toBe(500);
    expect(res.remainingGdsBookings).toBe(500);
    expect(res.unitGdsGrossCost).toBeCloseTo(12, 6);
    expect(res.unitGdsRecoveriesAndRebates).toBeCloseTo(2, 6);
    expect(res.unitNetGdsCost).toBeCloseTo(10, 6);
    expect(res.unitIncrementalShoppingCost).toBeCloseTo(1, 6);
    expect(res.unitNdcVariableCost).toBeCloseTo(10, 6);
    expect(res.baselineMonthlyNetGdsCost).toBeCloseTo(10000, 6);
    expect(res.blendedVariableDistributionCostMonthly).toBeCloseTo(10000, 6);
    expect(res.grossIncrementalRevenueMonthly).toBeCloseTo(2500, 6);
    expect(res.incrementalContributionMonthly).toBeCloseTo(1500, 6);
    expect(res.monthlySteadyStateImpact).toBeCloseTo(1400, 6);
    expect(res.monthlyTransitionImpact).toBeCloseTo(1200, 6);
  });

  it('evaluates Default FSC and Default LCC scenarios cleanly with finite reconciled metrics', () => {
    const fsc = calculateDistributionEconomics(DEFAULT_INPUTS_FSC);
    const lcc = calculateDistributionEconomics(DEFAULT_INPUTS_LCC);

    // FSC independent verification:
    // unitGdsSegmentFee = 2.6 * 6 = 15.60; + 1.50 + 2.50 + 0.75 = 20.35 gross
    // recovery = 12 * 1.15 * 0.60 = 8.28; + 1.00 rebate = 9.28 => unitNetGdsCost = 11.07
    expect(fsc.unitGdsGrossCost).toBeCloseTo(20.35, 2);
    expect(fsc.unitGdsRecoveriesAndRebates).toBeCloseTo(9.28, 2);
    expect(fsc.unitNetGdsCost).toBeCloseTo(11.07, 2);
    expect(fsc.ndcBookings).toBe(35000);
    expect(fsc.remainingGdsBookings).toBe(65000);
    // NDC variable = 4.50 + 1.25 + (400 * 0.001 = 0.40) = 6.15
    expect(fsc.unitNdcVariableCost).toBeCloseTo(6.15, 2);

    // LCC independent verification:
    // unitGdsGrossCost = (1.6 * 4.25) + 0.75 + 0.50 + 0.50 = 8.55; recovery = 0 => 8.55
    expect(lcc.unitNetGdsCost).toBeCloseTo(8.55, 2);
    expect(lcc.ndcBookings).toBe(80000);
  });

  it('handles all three GDS surcharge treatments without double-counting', () => {
    const asNone = calculateDistributionEconomics(
      makeCleanBase({
        surchargeTreatment: SurchargeTreatment.NONE,
        gdsSurchargePerTicket: 15,
        ticketsPerBooking: 1.2,
      })
    );
    expect(asNone.unitGdsSurchargeExpense).toBe(0);
    expect(asNone.unitGdsSurchargeRecovery).toBe(0);
    expect(asNone.unitNetGdsCost).toBeCloseTo(12, 6);

    const asExpense = calculateDistributionEconomics(
      makeCleanBase({
        surchargeTreatment: SurchargeTreatment.AIRLINE_EXPENSE,
        gdsSurchargePerTicket: 10,
        ticketsPerBooking: 1.2,
        surchargeRecoveryPercent: 80,
      })
    );
    expect(asExpense.unitGdsSurchargeExpense).toBeCloseTo(12, 6);
    expect(asExpense.unitGdsSurchargeRecovery).toBe(0);
    expect(asExpense.unitNetGdsCost).toBeCloseTo(24, 6);

    const asRecovery = calculateDistributionEconomics(
      makeCleanBase({
        surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
        gdsSurchargePerTicket: 10,
        ticketsPerBooking: 1.2,
        surchargeRecoveryPercent: 50,
      })
    );
    expect(asRecovery.unitGdsSurchargeExpense).toBe(0);
    expect(asRecovery.unitGdsSurchargeRecovery).toBeCloseTo(6, 6);
    expect(asRecovery.unitNetGdsCost).toBeCloseTo(6, 6);
  });

  it('accounts for agency incentives, commercial rebates, and negative net GDS cost after recoveries', () => {
    const res = calculateDistributionEconomics(
      makeCleanBase({
        avgSegments: 1,
        gdsCostPerSegment: 4,
        agencyIncentivePerBooking: 2,
        commercialRebatePerBooking: 3,
        surchargeTreatment: SurchargeTreatment.REVENUE_RECOVERY,
        gdsSurchargePerTicket: 10,
        ticketsPerBooking: 1,
        surchargeRecoveryPercent: 80,
      })
    );
    // Gross = 4 + 2 = 6; Recoveries + rebates = 8 + 3 = 11 => Net GDS = -5
    expect(res.unitGdsGrossCost).toBeCloseTo(6, 6);
    expect(res.unitGdsRecoveriesAndRebates).toBeCloseTo(11, 6);
    expect(res.unitNetGdsCost).toBeCloseTo(-5, 6);
    expect(res.baselineMonthlyNetGdsCost).toBeCloseTo(-5000, 6);
    expect(res.netImpactPercentOfBaseline).toBeNull();
  });

  it('separates gross revenue from contribution margin and supports negative revenue uplift', () => {
    const negative = calculateDistributionEconomics(
      makeCleanBase({
        ancillaryUpliftPercent: -5,
        ancillaryContributionMarginPercent: 60,
        continuousPricingUpliftPercent: -2,
        pricingContributionMarginPercent: 80,
      })
    );
    // Per booking: ancillary rev = -5, contrib = -3; pricing rev = -2, contrib = -1.6 => total contrib = -4.6
    expect(negative.unitGrossIncrementalRevenue).toBeCloseTo(-7, 6);
    expect(negative.unitIncrementalContribution).toBeCloseTo(-4.6, 6);
    expect(negative.grossIncrementalRevenueMonthly).toBeCloseTo(-3500, 6);
    expect(negative.incrementalContributionMonthly).toBeCloseTo(-2300, 6);
    expect(negative.monthlySteadyStateImpact).toBeCloseTo(-2400, 6);
  });

  it('handles zero bookings, zero migration, partial migration, and full 100% migration', () => {
    const zeroBookings = calculateDistributionEconomics(makeCleanBase({ monthlyBookings: 0 }));
    expect(zeroBookings.ndcBookings).toBe(0);
    expect(zeroBookings.baselineMonthlyNetGdsCost).toBe(0);
    expect(zeroBookings.monthlySteadyStateImpact).toBe(-100);
    expect(zeroBookings.breakEven.status).toBe('insufficient_data');

    const zeroMigration = calculateDistributionEconomics(makeCleanBase({ ndcMigrationPercent: 0 }));
    expect(zeroMigration.ndcBookings).toBe(0);
    expect(zeroMigration.remainingGdsBookings).toBe(1000);
    expect(zeroMigration.grossIncrementalRevenueMonthly).toBe(0);
    expect(zeroMigration.monthlySteadyStateImpact).toBe(-100);
    expect(zeroMigration.breakEven.status).toBe('insufficient_data');

    const fullMigration = calculateDistributionEconomics(makeCleanBase({ ndcMigrationPercent: 100 }));
    expect(fullMigration.ndcBookings).toBe(1000);
    expect(fullMigration.remainingGdsBookings).toBe(0);
    expect(fullMigration.incrementalContributionMonthly).toBeCloseTo(3000, 6);
    expect(fullMigration.monthlySteadyStateImpact).toBeCloseTo(2900, 6);
  });

  it('prevents double-counting Look-to-Book shopping costs and models high L2B stress', () => {
    const bundled = calculateDistributionEconomics(
      makeCleanBase({
        shoppingCostsIncludedInBase: true,
        lookToBookRatio: 10000,
        shoppingApiCostPerRequest: 0.002,
      })
    );
    expect(bundled.additionalLookToBookRequests).toBe(0);
    expect(bundled.unitIncrementalShoppingCost).toBe(0);

    const highL2b = calculateDistributionEconomics(
      makeCleanBase({
        shoppingCostsIncludedInBase: false,
        lookToBookRatio: 10000,
        includedShoppingRequestsPerBooking: 500,
        ndcShoppingTrafficSharePercent: 100,
        shoppingApiCostPerRequest: 0.001,
      })
    );
    // (10000 - 500) * 0.001 = $9.50 shopping cost => NDC variable = 8 + 1 + 9.50 = 18.50
    expect(highL2b.unitIncrementalShoppingCost).toBeCloseTo(9.5, 6);
    expect(highL2b.unitNdcVariableCost).toBeCloseTo(18.5, 6);
    // Variable savings = 500 * (10 - 18.50) = -4250; +1500 contrib - 100 OPEX = -2850 (unfavorable!)
    expect(highL2b.monthlySteadyStateImpact).toBeCloseTo(-2850, 6);
  });

  it('calculates payback accurately for constant cash flow, varying transition expenses, and unachievable payback', () => {
    // Constant positive cash flow: CAPEX 14,000 / 1,400/mo = exact 10.0 months
    const constant = calculateDistributionEconomics(
      makeCleanBase({
        oneTimeImplementationCapex: 14000,
        monthlyTransitionExpense: 0,
        transitionDurationMonths: 0,
      })
    );
    expect(constant.payback.status).toBe('achieved');
    expect(constant.payback.months).toBeCloseTo(10.0, 1);

    // Transition period 6 months @ 1,200/mo = 7,200 recovered; remaining 6,800 / 1,400 = 4.857 => 10.9 months
    const withTransition = calculateDistributionEconomics(
      makeCleanBase({
        oneTimeImplementationCapex: 14000,
        monthlyTransitionExpense: 200,
        transitionDurationMonths: 6,
      })
    );
    expect(withTransition.payback.status).toBe('achieved');
    expect(withTransition.payback.months).toBeCloseTo(10.9, 1);
    // First-year cash flow = -14000 + (6 * 1200) + (6 * 1400) = -14000 + 7200 + 8400 = +1600
    expect(withTransition.firstYearCashFlow).toBeCloseTo(1600, 6);

    // Negative cash flow => Payback not achieved
    const unachievable = calculateDistributionEconomics(
      makeCleanBase({
        oneTimeImplementationCapex: 50000,
        ndcCostPerBooking: 25,
      })
    );
    expect(unachievable.payback.status).toBe('not_achieved');
    expect(unachievable.payback.months).toBeNull();
    expect(unachievable.payback.label).toBe('Payback not achieved');
  });

  it('handles break-even edge cases cleanly (achieved, required, zero ATV, zero margin, >100%)', () => {
    // Already achieved via pricing + cost savings
    const achieved = calculateDistributionEconomics(
      makeCleanBase({
        ndcCostPerBooking: 2,
      })
    );
    expect(achieved.breakEven.status).toBe('no_uplift_required');
    expect(achieved.breakEven.requiredAncillaryUpliftPercent).toBe(0);

    // Exact break-even uplift required:
    // unitNetGdsCost = 10, unitNdcVariableCost = 10, unitPricingContribution = 1.00, fixedOpex/ndcBookings = 100/500 = 0.20
    // With continuousPricingUpliftPercent = 0 and ndcCostPerBooking = 11:
    // gap per NDC booking = 0.20 + (13 - 10) - 0 = 3.20; 1% uplift on $100 @ 50% margin = $0.50 => 6.40%
    const exactRequired = calculateDistributionEconomics(
      makeCleanBase({
        ndcCostPerBooking: 11,
        continuousPricingUpliftPercent: 0,
      })
    );
    expect(exactRequired.breakEven.status).toBe('uplift_required');
    expect(exactRequired.breakEven.requiredAncillaryUpliftPercent).toBeCloseTo(6.4, 2);

    // Zero average ticket value
    const zeroAtv = calculateDistributionEconomics(
      makeCleanBase({
        avgTicketValue: 0,
        ndcCostPerBooking: 15,
      })
    );
    expect(zeroAtv.breakEven.status).toBe('not_achievable');
    expect(zeroAtv.breakEven.requiredAncillaryUpliftPercent).toBeNull();

    // Zero ancillary contribution margin
    const zeroMargin = calculateDistributionEconomics(
      makeCleanBase({
        ancillaryContributionMarginPercent: 0,
        continuousPricingUpliftPercent: 0,
        ndcCostPerBooking: 15,
      })
    );
    expect(zeroMargin.breakEven.status).toBe('not_achievable');

    // Zero GDS cost
    const zeroGds = calculateDistributionEconomics(
      makeCleanBase({
        avgSegments: 0,
        gdsCostPerSegment: 0,
        surchargeTreatment: SurchargeTreatment.NONE,
      })
    );
    expect(zeroGds.unitNetGdsCost).toBe(0);
    expect(zeroGds.netImpactPercentOfBaseline).toBeNull();
  });

  it('generates sensitivity matrices and driver rankings strictly via the central engine', () => {
    const matrix = buildSensitivityMatrix(DEFAULT_INPUTS_FSC, 'ndc_cost_vs_ancillary');
    expect(matrix.cells).toHaveLength(matrix.rowValues.length);
    expect(matrix.cells[0]).toHaveLength(matrix.colValues.length);

    // Verify spot cell matches direct call to calculateDistributionEconomics
    const direct = calculateDistributionEconomics({
      ...DEFAULT_INPUTS_FSC,
      ndcCostPerBooking: matrix.rowValues[2],
      ancillaryUpliftPercent: matrix.colValues[3],
    });
    expect(matrix.cells[2][3].monthlySteadyStateImpact).toBeCloseTo(
      direct.monthlySteadyStateImpact,
      6
    );

    const drivers = calculateDriverSensitivities(DEFAULT_INPUTS_FSC);
    expect(drivers.length).toBeGreaterThanOrEqual(5);
    expect(drivers[0].swing).toBeGreaterThanOrEqual(drivers[drivers.length - 1].swing);
  });
});
