import { EconomicInputs, EconomicResults } from '../types';

const clampNonNegative = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 0;

export const calculateDistributionEconomics = (inputs: EconomicInputs): EconomicResults => {
  const monthlyBookings = clampNonNegative(inputs.monthlyBookings);
  const avgSegments = clampNonNegative(inputs.avgSegments);
  const gdsCostPerSegment = clampNonNegative(inputs.gdsCostPerSegment);
  const gdsSurcharge = clampNonNegative(inputs.gdsSurcharge);
  const ndcCostPerBooking = clampNonNegative(inputs.ndcCostPerBooking);
  const ancillaryUpliftPercent = clampNonNegative(inputs.ancillaryUpliftPercent);
  const avgTicketValue = clampNonNegative(inputs.avgTicketValue);
  const continuousPricingUpliftPercent = clampNonNegative(inputs.continuousPricingUpliftPercent);

  // 1. GDS Cost Baseline
  // Formula: (Avg Segments * Cost/Segment) + GDS Surcharge
  const unitGDSCost = avgSegments * gdsCostPerSegment + gdsSurcharge;
  const gdsMonthlyCost = monthlyBookings * unitGDSCost;
  const gdsAnnualCost = gdsMonthlyCost * 12;

  // 2. NDC Cost Estimate
  const unitNDCCost = ndcCostPerBooking;
  const ndcMonthlyCost = monthlyBookings * unitNDCCost;
  const ndcAnnualCost = ndcMonthlyCost * 12;

  // 3. Incremental Revenue (Total Value of Offer uplift)
  const unitAncillaryLift = avgTicketValue * (ancillaryUpliftPercent / 100);
  const ancillaryRevenueMonthly = monthlyBookings * unitAncillaryLift;

  const unitPricingLift = avgTicketValue * (continuousPricingUpliftPercent / 100);
  const pricingRevenueMonthly = monthlyBookings * unitPricingLift;

  const unitNDCValue = unitAncillaryLift + unitPricingLift;
  const totalNDCValueMonthly = ancillaryRevenueMonthly + pricingRevenueMonthly;

  // 4. Net Financial Delta
  // (GDS Cost Avoided - NDC Cost Incurred) + Incremental Revenue Gained
  const netDeltaMonthly = gdsMonthlyCost - ndcMonthlyCost + totalNDCValueMonthly;
  const netDeltaAnnual = netDeltaMonthly * 12;

  // 5. Percent Impact relative to GDS Baseline
  const netDeltaPercent = gdsMonthlyCost > 0 ? (netDeltaMonthly / gdsMonthlyCost) * 100 : 0;

  // 6. Break-even Ancillary Uplift %
  // Ancillary uplift % required for Net Delta = 0 (holding Continuous Pricing Lift constant)
  // A <= 0% value indicates NDC is already cost/value favorable without ancillary uplift.
  const costGap = unitNDCCost - unitGDSCost;
  const neededAncillaryValue = costGap - unitPricingLift;
  const breakEvenAncillaryPercent =
    avgTicketValue > 0 ? (neededAncillaryValue / avgTicketValue) * 100 : 0;

  // 7. Net Unit Position (Cost minus Revenue; negative indicates net unit contribution)
  const unitNDCNet = unitNDCCost - unitNDCValue;

  return {
    gdsMonthlyCost,
    gdsAnnualCost,
    ndcMonthlyCost,
    ndcAnnualCost,
    ancillaryRevenueMonthly,
    pricingRevenueMonthly,
    totalNDCValueMonthly,
    netDeltaMonthly,
    netDeltaAnnual,
    netDeltaPercent,
    breakEvenAncillaryPercent,
    unitGDS: unitGDSCost,
    unitNDCCost,
    unitNDCValue,
    unitNDC: unitNDCNet,
  };
};

export const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatCurrencyPrecise = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('en-US').format(val);
};
