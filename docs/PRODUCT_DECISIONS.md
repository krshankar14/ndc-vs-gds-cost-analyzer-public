# Product Decisions & Trade-offs (Version 2.0)

## 1. Business Problem & Discovery Context

During commercial evaluations of IATA NDC, airline teams frequently encounter misaligned spreadsheets: IT teams quote per-booking API/aggregator costs, distribution teams debate GDS segment fees and surcharge recovery, and revenue management projects gross ancillary uplift. When those inputs are combined carelessly—for example, counting GDS surcharges as an airline expense or treating 100% of gross ancillary revenue as profit—the resulting business case loses credibility with Finance and the CFO.

**Product Discovery Assumptions:**
- Airline commercial leaders need a transparent, directional simulator that exposes every commercial lever rather than a black-box score.
- Executive workshops benefit from quick defaults (Basic mode + synthetic FSC/LCC presets), while commercial analysts need full control over rebates, agency incentives, L2B ratios, contribution margins, and CAPEX/transition timelines (Advanced mode).
- Sensitivity to a few critical variables (surcharge recovery, ancillary uplift, NDC fee, and L2B ratio) often matters more than any single point estimate.

---

## 2. Target Users & Jobs-to-be-Done

| Persona | Core Job-to-be-Done |
|---|---|
| **VP / Head of Airline Distribution** | Frame a credible hybrid GDS + NDC commercial strategy for CFO and board discussions. |
| **Distribution Strategy Manager** | Test how GDS surcharge recovery, rebates, and aggregator fees shift break-even thresholds. |
| **Revenue Management Lead** | Quantify how ancillary contribution margins and continuous pricing uplift offset technical fees. |
| **Travel-Tech Product Manager** | Communicate domain-grounded trade-offs and build testable financial tooling. |

---

## 3. Key Scope & Architectural Decisions

### Decision 1: Deterministic Financial Engine Instead of LLM Calculations
- **Choice:** Implement 100% deterministic TypeScript functions in `services/economics.ts` backed by Vitest unit tests.
- **Why:** Financial modeling requires exact reproducibility, zero hallucination risk, and transparent auditability. Using an LLM to calculate P&L figures or payback periods would undermine executive trust and add recurring API costs.
- **Future Path:** An AI layer belongs only as a proposed future *natural-language interface* calling the deterministic engine as a controlled tool—never replacing the formulas.

### Decision 2: Pure Client-Side SPA (No Backend, No Database, No Auth)
- **Choice:** Keep all state, calculation, export, and optional persistence inside the browser.
- **Why:** Airline commercial executives will not paste sensitive fee structures into an unverified third-party web server. A static SPA guarantees zero server data retention, near-zero hosting cost on Vercel, and instant interaction latency.
- **Trade-off:** No multi-user cloud collaboration or server-side scenario sharing (mitigated via validated JSON export/import and CSV/print reports).

### Decision 3: Explicit GDS Surcharge Treatment Without Double-Counting
- **Choice:** Force an explicit selection among *None*, *Airline revenue recovery*, and *Additional airline expense*, paired with a surcharge retention % and tickets-per-booking factor.
- **Why:** Version 1.0 added the surcharge to GDS cost unconditionally, which can misstate airline P&L when the surcharge is collected by the airline to offset legacy GDS fees.

### Decision 4: Separate Cash Flow from Optional CAPEX Allocation
- **Choice:** Apply upfront CAPEX at Month 0 for cumulative cash flow, Year 1 cash flow, payback, and 3-year cash ROI; show optional straight-line CAPEX allocation separately for P&L reference only.
- **Why:** Mixing immediate cash CAPEX and monthly amortized CAPEX inside the same metric double-counts the investment.

### Decision 5: Neutral Framing on Scenario Comparison
- **Choice:** Present side-by-side reconciled metrics without auto-crowning a "Best Choice" badge.
- **Why:** An "Accelerated 65% NDC" scenario may show the highest modeled steady-state contribution while carrying unacceptable CAPEX risk or agency servicing friction. Strategic choice requires human executive judgment.

---

## 4. Product Trade-offs & Known Boundaries

| Trade-off | Chosen Approach (v2.0) | Deferred to Future Versions |
|---|---|---|
| Adoption curve | Constant blended migration % (`0%–100%`) | Multi-year phased S-curve migration ramp |
| Discounting / Tax | Undiscounted pre-tax incremental cash flow | WACC-discounted NPV / IRR / corporate tax |
| Agency mix | Blended average across eligible indirect bookings | Segment-level splits (TMC vs. OTA vs. Retail) |
| Styling & Fonts | Local compiled Tailwind CSS + `@fontsource` | Multi-theme / dark-mode toggle |

---

## 5. Success Metrics & Validation Requirements (If Evolved Beyond Prototype)

Because this is an independent portfolio prototype, no commercial airline adoption is claimed. If piloted with real airline commercial teams, validation would require:
1. **Model Calibration Accuracy:** Reconciling modeled net GDS cost within ±3% of actual historical BSP/ARC and GDS billing statements.
2. **Empirical Uplift Validation:** Measuring actual NDC vs. EDIFACT ancillary conversion delta in controlled A/B agency pilots.
3. **Infrastructure Telemetry:** Replacing estimated L2B marginal costs with measured cloud compute and caching telemetry from the airline's offer engine.
