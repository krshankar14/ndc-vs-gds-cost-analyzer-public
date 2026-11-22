import assert from 'node:assert/strict';
import { calculateDistributionEconomics } from './economics';
import { DEFAULT_INPUTS_FSC, DEFAULT_INPUTS_LCC } from '../constants';

// 1. Default Full-Service Carrier (FSC) baseline verification
const fsc = calculateDistributionEconomics(DEFAULT_INPUTS_FSC);
assert.equal(Number(fsc.unitGDS.toFixed(2)), 33.6);
assert.equal(fsc.gdsMonthlyCost, 3360000);
assert.equal(fsc.ndcMonthlyCost, 450000);
assert.equal(fsc.ancillaryRevenueMonthly, 1200000);
assert.equal(fsc.pricingRevenueMonthly, 450000);
assert.equal(fsc.totalNDCValueMonthly, 1650000);
assert.equal(fsc.netDeltaMonthly, 4560000);
assert.equal(Number(fsc.netDeltaPercent.toFixed(2)), 135.71);
assert.equal(fsc.unitNDCCost, 4.5);
assert.equal(fsc.unitNDCValue, 16.5);
assert.ok(fsc.breakEvenAncillaryPercent < 0);

// 2. Default Low-Cost Carrier (LCC) baseline verification
const lcc = calculateDistributionEconomics(DEFAULT_INPUTS_LCC);
assert.equal(Number(lcc.unitGDS.toFixed(2)), 7.2);
assert.equal(lcc.gdsMonthlyCost, 1800000);
assert.equal(lcc.ndcMonthlyCost, 625000);
assert.equal(lcc.totalNDCValueMonthly, 450000);
assert.equal(lcc.netDeltaMonthly, 1625000);

// 3. Unfavorable NDC scenario verification (high NDC cost, zero ancillary uplift)
const unfavorable = calculateDistributionEconomics({
  ...DEFAULT_INPUTS_LCC,
  ndcCostPerBooking: 15.0,
  ancillaryUpliftPercent: 0,
});
assert.ok(unfavorable.netDeltaPercent < -10);
assert.equal(Number(unfavorable.breakEvenAncillaryPercent.toFixed(2)), 6.0);

// 4. Zero-booking and negative-input edge cases (must never return NaN or Infinity)
const zeroCase = calculateDistributionEconomics({
  ...DEFAULT_INPUTS_FSC,
  monthlyBookings: 0,
  avgSegments: 0,
  gdsSurcharge: 0,
});
for (const [key, value] of Object.entries(zeroCase)) {
  assert.ok(Number.isFinite(value), `Expected finite value for ${key}, got ${value}`);
}
assert.equal(zeroCase.gdsMonthlyCost, 0);
assert.equal(zeroCase.netDeltaPercent, 0);

const negativeCase = calculateDistributionEconomics({
  ...DEFAULT_INPUTS_FSC,
  monthlyBookings: -500,
  avgSegments: -2,
});
assert.equal(negativeCase.gdsMonthlyCost, 0);
assert.equal(negativeCase.ndcMonthlyCost, 0);

console.log('All distribution economics verification assertions passed.');
