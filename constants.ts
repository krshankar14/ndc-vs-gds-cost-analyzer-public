import { AirlineType, EconomicInputs, GDSCostLevel, GDSSurcharge, Region } from './types';

/**
 * Synthetic, illustrative airline distribution presets for scenario modeling.
 * Values represent generalized industry ranges rather than any specific carrier's actual commercial terms.
 */
export const DEFAULT_INPUTS_FSC: EconomicInputs = {
  airlineType: AirlineType.FSC,
  monthlyBookings: 100000,
  avgSegments: 2.6,
  gdsCostPerSegment: GDSCostLevel.MEDIUM,
  gdsSurcharge: GDSSurcharge.MEDIUM,
  ndcCostPerBooking: 4.5,
  ancillaryUpliftPercent: 4.0,
  avgTicketValue: 300,
  ancillaryMargin: 30,
  continuousPricingUpliftPercent: 1.5,
};

export const DEFAULT_INPUTS_LCC: EconomicInputs = {
  airlineType: AirlineType.LCC,
  monthlyBookings: 250000,
  avgSegments: 1.8,
  gdsCostPerSegment: GDSCostLevel.LOW,
  gdsSurcharge: GDSSurcharge.NONE,
  ndcCostPerBooking: 2.5,
  ancillaryUpliftPercent: 1.0,
  avgTicketValue: 120,
  ancillaryMargin: 20,
  continuousPricingUpliftPercent: 0.5,
};

export const REGION_PRESETS: Record<Region, Partial<EconomicInputs>> = {
  [Region.EU]: {
    gdsSurcharge: GDSSurcharge.HIGH, // Illustrative European market benchmark with active GDS surcharges
    gdsCostPerSegment: GDSCostLevel.MEDIUM,
  },
  [Region.NA]: {
    gdsSurcharge: GDSSurcharge.NONE, // Illustrative North American domestic benchmark
    gdsCostPerSegment: GDSCostLevel.HIGH,
  },
  [Region.APAC]: {
    gdsSurcharge: GDSSurcharge.LOW, // Illustrative Asia-Pacific benchmark
    gdsCostPerSegment: GDSCostLevel.LOW,
  },
};
