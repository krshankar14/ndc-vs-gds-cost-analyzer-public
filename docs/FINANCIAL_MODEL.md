# Financial Model Specification (Version 2.0)

This document explains every financial formula, unit, accounting convention, worked example, and boundary condition implemented in `services/economics.ts`.

---

## 1. Accounting Perspective & Terminology Discipline

All formulas are modeled strictly from the **airline's commercial P&L and cash-flow perspective** in `USD`. Terms are never used interchangeably:

- **Gross Incremental Revenue:** Top-line additional revenue from ancillary sales and continuous pricing on migrated NDC bookings before variable fulfilment or payment costs.
- **Incremental Contribution Margin:** Gross incremental revenue multiplied by each revenue stream's contribution margin percentage.
- **Distribution Cost Savings (or Increase):** Net Legacy GDS baseline cost minus Blended Future distribution cost (positive = savings; negative = cost increase).
- **Monthly Steady-State Impact:** Recurring post-transition monthly net incremental contribution (`Variable Cost Savings + Incremental Contribution - Incremental Monthly Fixed OPEX`).
- **Monthly Transition-Period Impact:** `Monthly Steady-State Impact - Monthly Transition Expense` during the active parallel-run transition window.
- **Annualized Steady-State Run Rate:** `Monthly Steady-State Impact * 12`. Explicitly labeled as a run rate, never a verified annual forecast.
- **Cumulative Cash Flow & Payback:** Month-by-month cash recovery starting at Month 0 (`-One-Time Implementation CAPEX`).

---

## 2. Variable Definitions & Units

| Category | Variable | Unit | Allowed Range |
|---|---|---|---|
| **Volume** | `monthlyBookings` | bookings/mo | `0` – `10,000,000` |
| | `ndcMigrationPercent` | `%` | `0` – `100` |
| | `avgSegments` | segments/booking | `0` – `10` |
| | `ticketsPerBooking` | tickets/booking | `0.1` – `10` |
| | `avgTicketValue` | USD/booking | `0` – `25,000` |
| **Legacy GDS** | `gdsCostPerSegment` | USD/segment | `0` – `50` |
| | `gdsAdditionalTransactionFee` | USD/booking | `0` – `50` |
| | `surchargeTreatment` | enum | `none` \| `airline_expense` \| `revenue_recovery` |
| | `gdsSurchargePerTicket` | USD/ticket | `0` – `100` |
| | `surchargeRecoveryPercent` | `%` | `0` – `100` |
| | `agencyIncentivePerBooking` | USD/booking | `0` – `100` |
| | `commercialRebatePerBooking` | USD/booking | `0` – `100` |
| | `gdsOtherServicingCost` | USD/booking | `0` – `50` |
| **NDC & L2B** | `ndcCostPerBooking` | USD/booking | `0` – `50` |
| | `ndcServicingCostPerBooking` | USD/booking | `0` – `50` |
| | `shoppingCostsIncludedInBase` | boolean | `true` / `false` |
| | `lookToBookRatio` | requests/booking | `0` – `50,000` |
| | `includedShoppingRequestsPerBooking` | requests/booking | `0` – `50,000` |
| | `ndcShoppingTrafficSharePercent` | `%` | `0` – `100` |
| | `shoppingApiCostPerRequest` | USD/request | `0` – `0.5` |
| **Offer Value** | `ancillaryUpliftPercent` | `% of ATV` (signed) | `-20` – `+30` |
| | `ancillaryContributionMarginPercent` | `%` | `0` – `100` |
| | `continuousPricingUpliftPercent` | `% of ATV` (signed) | `-10` – `+15` |
| | `pricingContributionMarginPercent` | `%` | `0` – `100` |
| **Investment** | `oneTimeImplementationCapex` | USD (Month 0) | `0` – `50,000,000` |
| | `incrementalMonthlyFixedOpex` | USD/mo | `0` – `5,000,000` |
| | `monthlyTransitionExpense` | USD/mo | `0` – `5,000,000` |
| | `transitionDurationMonths` | months | `0` – `36` |
| | `capexAllocationMonths` | months (P&L ref only) | `0` – `60` |

---

## 3. Step-by-Step Formulas

### 3.1 Blended Volume Split
```text
ndcBookings           = monthlyBookings * (ndcMigrationPercent / 100)
remainingGdsBookings  = monthlyBookings - ndcBookings
```

### 3.2 GDS Distribution Surcharge & Net GDS Cost per Booking
Per-ticket surcharge is converted to per-booking using `ticketsPerBooking`:
```text
unitGdsSurchargeGross = gdsSurchargePerTicket * ticketsPerBooking
```
Depending strictly on `surchargeTreatment` (preventing double-counting):
- **`none`:** `unitGdsSurchargeExpense = 0`, `unitGdsSurchargeRecovery = 0`
- **`airline_expense`:** `unitGdsSurchargeExpense = unitGdsSurchargeGross`, `unitGdsSurchargeRecovery = 0`
- **`revenue_recovery`:** `unitGdsSurchargeExpense = 0`, `unitGdsSurchargeRecovery = unitGdsSurchargeGross * (surchargeRecoveryPercent / 100)`

Then:
```text
unitGdsGrossCost            = (avgSegments * gdsCostPerSegment)
                              + gdsAdditionalTransactionFee
                              + unitGdsSurchargeExpense
                              + agencyIncentivePerBooking
                              + gdsOtherServicingCost

unitGdsRecoveriesAndRebates = unitGdsSurchargeRecovery + commercialRebatePerBooking
unitNetGdsCost              = unitGdsGrossCost - unitGdsRecoveriesAndRebates
```
*(Note: `unitNetGdsCost` may be negative if surcharge recoveries and rebates exceed gross GDS fees. In that case, relative `% of baseline` is returned as `null` to prevent sign-inversion confusion.)*

### 3.3 NDC Variable Cost & Look-to-Book Shopping Cost
```text
additionalLookToBookRequests =
  if shoppingCostsIncludedInBase then 0
  else max(0, lookToBookRatio * (ndcShoppingTrafficSharePercent / 100) - includedShoppingRequestsPerBooking)

unitIncrementalShoppingCost = additionalLookToBookRequests * shoppingApiCostPerRequest
unitNdcVariableCost         = ndcCostPerBooking + unitIncrementalShoppingCost + ndcServicingCostPerBooking
```

### 3.4 Gross Incremental Revenue vs. Incremental Contribution Margin
Applied strictly to `ndcBookings` (migrated volume only; excludes existing baseline ancillary sales):
```text
unitAncillaryRevenue        = avgTicketValue * (ancillaryUpliftPercent / 100)
unitAncillaryContribution   = unitAncillaryRevenue * (ancillaryContributionMarginPercent / 100)

unitPricingRevenue          = avgTicketValue * (continuousPricingUpliftPercent / 100)
unitPricingContribution     = unitPricingRevenue * (pricingContributionMarginPercent / 100)

grossIncrementalRevenueMo   = ndcBookings * (unitAncillaryRevenue + unitPricingRevenue)
incrementalContributionMo   = ndcBookings * (unitAncillaryContribution + unitPricingContribution)
```

### 3.5 Blended Distribution Costs & Net Monthly Impact
```text
baselineMonthlyNetGdsCost          = monthlyBookings * unitNetGdsCost
blendedVariableDistributionCostMo  = (remainingGdsBookings * unitNetGdsCost) + (ndcBookings * unitNdcVariableCost)
variableDistributionCostSavingsMo  = baselineMonthlyNetGdsCost - blendedVariableDistributionCostMo

monthlySteadyStateImpact           = variableDistributionCostSavingsMo + incrementalContributionMo - incrementalMonthlyFixedOpex
monthlyTransitionImpact            = monthlySteadyStateImpact - monthlyTransitionExpense
annualizedSteadyStateImpact        = monthlySteadyStateImpact * 12
```

### 3.6 CAPEX, Cumulative Cash Flow, Payback & ROI
- **Month 0:** `cumulativeCashFlow[0] = -oneTimeImplementationCapex`.
- **Months `1 .. transitionDurationMonths`:** adds `monthlyTransitionImpact`.
- **Months `(transitionDurationMonths + 1) .. 36`:** adds `monthlySteadyStateImpact`.
- **No CAPEX Double-Counting:** Optional straight-line `monthlyAllocatedCapex = oneTimeImplementationCapex / capexAllocationMonths` is reported strictly as a separate P&L reference figure and never subtracted inside cash flow or payback.
- **Payback Period:** Found by interpolating the exact month where cumulative cash flow crosses from `< 0` to `>= 0`. When `monthlyTransitionExpense = 0` and steady-state cash flow is positive, this equals `oneTimeImplementationCapex / monthlySteadyStateImpact`. If cumulative cash flow never recovers, status is `not_achieved` (*"Payback not achieved"*).
- **3-Year Cash ROI on CAPEX:** `(threeYearCumulativeCashFlow / oneTimeImplementationCapex) * 100` when `oneTimeImplementationCapex > 0`; otherwise `null` (*N/A*).

### 3.7 Redesigned Break-Even Ancillary Uplift
Solving `monthlySteadyStateImpact = 0` for ancillary revenue uplift `%`:
```text
requiredAncillaryContributionPerNdcBooking =
  (incrementalMonthlyFixedOpex / ndcBookings)
  + (unitNdcVariableCost - unitNetGdsCost)
  - unitPricingContribution
```
Four mutually exclusive statuses:
1. **`insufficient_data`:** `monthlyBookings <= 0` or `ndcBookings <= 0`.
2. **`no_uplift_required`:** `requiredAncillaryContributionPerNdcBooking <= 0`.
3. **`not_achievable`:** `avgTicketValue <= 0`, `ancillaryContributionMarginPercent <= 0`, or required uplift exceeds `100%` of average ticket value.
4. **`uplift_required`:** `requiredAncillaryContributionPerNdcBooking / (avgTicketValue * 0.01 * ancillaryContributionMarginPercent / 100)`.

---

## 4. Worked Independent Verification Example (Mandatory Reference Scenario)

| Input | Value |
|---|---|
| Eligible Monthly Bookings | `1,000` |
| NDC Migration Share | `50%` |
| Gross GDS Cost / Booking | `$12.00` (`2` segments × `$6.00`) |
| GDS Revenue Recovery / Booking | `$2.00` (`$2.00/ticket` × `1` ticket × `100%` recovery) |
| NDC Base Cost / Booking | `$8.00` |
| Additional Shopping Cost / NDC Booking | `$1.00` (`1,000` L2B × `$0.001/req`) |
| Additional Servicing Cost / NDC Booking | `$1.00` |
| Average Ticket Value | `$100.00` |
| Ancillary Uplift / Margin | `4%` / `50%` |
| Continuous Pricing Uplift / Margin | `1%` / `100%` |
| Incremental Monthly Fixed OPEX | `$100` |
| Monthly Transition Expense | `$200` |

**Independent Hand Calculation:**
1. Migrated NDC Bookings = `1,000 × 50% = 500`; Remaining GDS Bookings = `500`.
2. Net GDS Cost / Booking = `$12.00 - $2.00 = $10.00`.
3. NDC Variable Cost / Booking = `$8.00 + $1.00 + $1.00 = $10.00`.
4. Baseline Monthly Net GDS Cost = `1,000 × $10.00 = $10,000`.
5. Blended Variable Distribution Cost = `(500 × $10.00) + (500 × $10.00) = $10,000` (`$0` variable cost savings).
6. Incremental Revenue = `500 × ($100 × 4% + $100 × 1%) = 500 × $5.00 = $2,500`.
7. Incremental Contribution = `500 × ($4.00 × 50% + $1.00 × 100%) = 500 × $3.00 = $1,500`.
8. Monthly Steady-State Financial Impact = `$0 + $1,500 - $100 = $1,400`.
9. Monthly Transition-Period Financial Impact = `$1,400 - $200 = $1,200`.

This exact test case is locked inside `tests/economics.test.ts`.

---

## 5. Model Limitations

- Uses a step-change migration share rather than a month-by-month S-curve adoption ramp.
- Does not model income taxes, weighted average cost of capital (WACC) / NPV discounting, or fare-class cannibalization elasticities.
- Assumes uniform ticket values and segment counts across migrated and remaining GDS bookings (whereas in practice, corporate multi-segment itineraries often migrate later than simple point-to-point leisure bookings).
