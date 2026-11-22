export enum AirlineType {
  FSC = 'Full-Service Carrier',
  LCC = 'Low-Cost Carrier',
}

export enum Region {
  NA = 'North America',
  EU = 'Europe',
  APAC = 'Asia Pacific',
}

export enum GDSCostLevel {
  LOW = 4.0,
  MEDIUM = 6.0,
  HIGH = 8.0,
}

export enum GDSSurcharge {
  NONE = 0,
  LOW = 15,
  MEDIUM = 18,
  HIGH = 21,
  ULTRA = 25,
}

export interface EconomicInputs {
  airlineType: AirlineType;
  monthlyBookings: number;
  avgSegments: number;
  gdsCostPerSegment: number;
  gdsSurcharge: number;
  ndcCostPerBooking: number;
  ancillaryUpliftPercent: number;

  // Synthetic illustrative defaults (associated with carrier profile)
  avgTicketValue: number;
  ancillaryMargin: number; // Reference benchmark only; not applied in the top-line revenue formula
  continuousPricingUpliftPercent: number;
}

export interface EconomicResults {
  gdsMonthlyCost: number;
  gdsAnnualCost: number;
  ndcMonthlyCost: number;
  ndcAnnualCost: number;

  ancillaryRevenueMonthly: number;
  pricingRevenueMonthly: number;
  totalNDCValueMonthly: number;

  netDeltaMonthly: number;
  netDeltaAnnual: number;
  netDeltaPercent: number; // Relative to GDS baseline

  breakEvenAncillaryPercent: number; // Ancillary uplift % needed to match GDS baseline

  unitGDS: number; // Gross GDS distribution cost per booking
  unitNDCCost: number; // Gross NDC distribution cost per booking
  unitNDCValue: number; // Gross incremental NDC revenue (ancillary + pricing) per booking
  unitNDC: number; // Net unit cost per booking (unitNDCCost - unitNDCValue)
}
