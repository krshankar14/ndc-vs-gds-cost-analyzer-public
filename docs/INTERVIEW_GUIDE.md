# Product Manager Interview Preparation Guide

> **Honesty & Attribution Note:** This guide separates **verified facts about this project** (what is actually built, tested, and documented in this repository) from **suggested interview framing** (how Kumar Ravi Shankar can present his domain thinking, product trade-offs, and technical collaboration clearly in interviews). Never claim enterprise airline adoption, audited commercial savings, or runtime AI features that are not implemented in Version 2.0.

---

## 1. 30-Second Introduction

"I built the **NDC vs GDS Distribution Decision Assistant**, an interactive financial modeling prototype for airline commercial and distribution teams. Airlines migrating from legacy GDS distribution to IATA NDC often misjudge the business case because they only compare headline booking fees—ignoring GDS surcharge recovery, contribution margins, Look-to-Book API traffic, and transition costs. I designed Version 2.0 as a transparent, deterministic simulator with scenario comparison, sensitivity heatmaps, and cash-flow payback so commercial leaders can pressure-test hybrid strategies in minutes."

---

## 2. 90-Second Elevator Pitch

"In airline distribution, moving indirect bookings from legacy EDIFACT GDS channels to IATA NDC is one of the highest-stakes commercial decisions a carrier makes. Early spreadsheets—and even Version 1.0 of my own prototype—often overstate NDC benefits by treating GDS surcharges as an airline cost instead of revenue recovery, treating 100% of gross ancillary revenue as profit, and assuming an unrealistic overnight 100% migration.

In Version 2.0, I redesigned the entire financial engine from the airline's actual P&L perspective. It separates GDS gross fees from surcharge recovery and commercial rebates, distinguishes gross incremental revenue from contribution margin, models partial blended migration from 0% to 100%, prices in Look-to-Book shopping API traffic without double-counting, and tracks 36-month cumulative cash flow across upfront CAPEX, fixed OPEX, and parallel transition costs.

Technically, it's a zero-backend React and TypeScript static application deployed on Vercel with locally compiled Tailwind CSS, automated Vitest verification across 25+ financial edge cases, CSV formula-injection protection, and GitHub Actions CI. I deliberately kept the engine 100% deterministic rather than bolting on an LLM—because executives need auditable financial math, not AI-generated estimates."

---

## 3. Five-Minute Live Product Demonstration Script

1. **Minute 0:00–1:00 — Frame the Problem & Blended Baseline (`Simulator` tab):**
   - Point out the FSC default preset (`100,000` eligible bookings, `35%` NDC migration) and clarify that NDC is an IATA messaging standard, not exclusively a direct channel.
   - Show the **9 Executive KPI Cards** and highlight the distinction between *Gross Incremental Revenue*, *Incremental Contribution Margin*, *Monthly Steady-State Impact*, and *Implementation Payback*.
2. **Minute 1:00–2:15 — Demonstrate Commercial Modeling Rigor (`InputPanel` Basic → Advanced):**
   - Switch **GDS Distribution Surcharge Treatment** from *Airline revenue recovery* to *No surcharge* and show how net GDS cost changes immediately—explaining why v1.0's cost-only approach distorted European carrier economics.
   - Toggle **Advanced Model** and adjust **Look-to-Book Ratio** (e.g., `500` → `5,000`) to show how unmanaged shopping traffic erodes NDC unit economics, and show the *Shopping costs included in base fee* checkbox that prevents double-counting.
3. **Minute 2:15–3:15 — Walk Through Visual Reconciliation (`ResultsDashboard` & `ExecutiveSummary`):**
   - Show the **Monthly Financial Contribution Bridge** (positive savings/contribution vs. negative fixed OPEX—never stacked ambiguously) and the **36-Month Cumulative Cash Flow** curve showing Month 0 CAPEX, transition drag, and payback crossover.
   - Open **Thresholds** in the Executive Recommendation panel to show deterministic, configurable governance rules and the automatic downside stress check.
4. **Minute 3:15–4:15 — Strategic Trade-offs (`Scenarios` & `Sensitivity` tabs):**
   - Switch to **Scenarios** to compare *Conservative (20%)*, *Balanced (35%)*, and *Accelerated (65%)* side by side—explaining why higher steady-state contribution must be weighed against higher CAPEX and transition risk.
   - Switch to **Sensitivity** to show the 2D heatmap (*NDC Cost vs. Ancillary Uplift* and *Surcharge Recovery vs. NDC Cost*) and the **Highest-Influence Assumptions** ranking.
5. **Minute 4:15–5:00 — Security, Export & Engineering Maturity (`Assumptions` tab):**
   - Show **Export CSV / Export JSON / Import JSON / Print Report**, note that zero data leaves the browser, explain CSV formula-injection defense and opt-in local storage, and wrap with the proposed future AI tool-calling architecture (honestly stating v2.0 has no runtime LLM).

---

## 4. End-to-End Development Journey

- **V1.0 (Concept Prototype):** Built an initial React/Recharts calculator comparing 100% GDS vs. 100% NDC unit fees and gross ancillary lift.
- **Critical Domain Review:** Audited v1.0 as an airline commercial specialist and uncovered four structural weaknesses: surcharge misclassified as cost, gross revenue treated as contribution, all-or-nothing migration, and missing L2B/CAPEX/transition economics.
- **V2.0 Transformation:** Refactored into a clean service-layer architecture (`economics`, `validation`, `recommendations`, `scenarioService`, `exportService`), eliminated runtime CDNs in favor of compiled Tailwind CSS and bundled fonts, built 5 Vitest test suites anchored by an independent hand-calculated Mandatory Reference Scenario, added GitHub CI and Vercel security headers, and documented everything transparently.

---

## 5. Plain-English Walkthrough of Every Important File

- `types.ts` — The strict contract for all 29 inputs, outputs, break-even states, payback states, scenarios, and sensitivity grids.
- `constants.ts` — Neutral synthetic FSC/LCC and regional presets, field min/max/tooltip specs, and the 3 default scenario templates.
- `services/economics.ts` — The single source of truth for all financial math, 36-month cash flow, payback, break-even, and sensitivity grids.
- `services/validation.ts` — Guards against `NaN`, out-of-range inputs, commercial edge cases, and unsafe JSON imports.
- `services/recommendations.ts` — Deterministic executive posture logic (`favorable`, `hybrid_conditional`, `unfavorable`, `insufficient_information`) with downside stress testing.
- `services/scenarioService.ts` — Immutable create/duplicate/rename/delete/reset operations and opt-in browser `localStorage`.
- `services/exportService.ts` — Generates metadata-rich JSON and spreadsheet-safe CSV exports (blocking formula injection).
- `components/InputPanel.tsx` — Basic/Advanced sidebar with tooltips and validation notices.
- `components/ResultsDashboard.tsx` — Executive KPI strip, signed bridge chart, blended cost chart, 36-month cash flow chart, and per-booking unit table.
- `components/ScenarioComparison.tsx` & `SensitivityAnalysis.tsx` — Multi-scenario side-by-side matrix and 2D sensitivity heatmaps calling the exact same central engine.
- `tests/*.test.ts` — Automated Vitest verification proving financial correctness and security protections.
- `.github/workflows/ci.yml` & `vercel.json` — Automated PR verification and hardened static deployment.

---

## 6. Technology Selection Rationale

- **React + TypeScript + Vite:** Industry-standard SPA stack enabling strong compile-time type safety on complex financial objects and fast static builds for Vercel.
- **Local Tailwind CSS v4 + Bundled `@fontsource` Fonts:** Eliminates external runtime CDNs, improves load reliability, and allows a tight Content Security Policy (`vercel.json`).
- **Recharts:** Composable React charting for signed bar bridges, stacked cost bars, and cumulative cash-flow area charts without heavy charting overhead.
- **Vitest:** Native Vite compatibility for fast, zero-friction TypeScript unit testing in CI.
- **No Backend / No LLM:** Keeps the product free to operate, privacy-safe (airline figures never leave the user's browser), and 100% deterministic.

---

## 7. 30 Probable PM & Technical Interview Questions and Answers

### Domain & Airline Distribution (Q1–Q8)
1. **Why is treating a GDS surcharge as an airline cost often wrong?**
   *Answer:* When an airline imposes a Distribution Technology Charge (DTC) on GDS tickets, the retained portion offsets the GDS booking fee as revenue recovery—lowering net GDS cost. Treating it as an expense double-penalizes GDS and artificially inflates NDC savings.
2. **Isn't NDC mutually exclusive with GDSs?**
   *Answer:* No. NDC is an IATA XML/JSON data standard. Major GDSs (Amadeus, Sabre, Travelport) also distribute NDC content. The model compares *legacy EDIFACT GDS commercial terms* against a *target NDC commercial arrangement* regardless of whether the pipe is direct, aggregator, or GDS-NDC.
3. **Why did you add `ticketsPerBooking`?**
   *Answer:* GDS segment fees scale by flight segments, NDC aggregator fees are typically per booking/order, while distribution surcharges are often assessed per ticket. Multiplying per-ticket surcharge by `ticketsPerBooking` reconciles everything cleanly to a per-booking basis.
4. **Why separate gross incremental revenue from contribution margin?**
   *Answer:* Selling $12 of extra bags, lounge access, or seats does not equal $12 of profit—variable fulfilment, catering, lounge fees, and payment processing eat into gross revenue. Applying contribution margin percentages gives a realistic P&L figure.
5. **What is Look-to-Book (L2B) and why does it matter for NDC?**
   *Answer:* L2B is the ratio of shopping API requests to confirmed bookings. Moving from cached legacy EDIFACT availability to dynamic real-time NDC offer creation can dramatically increase compute and bandwidth costs—potentially wiping out booking-fee savings if caching or aggregator allowances aren't managed.
6. **Why model blended migration instead of 100% NDC?**
   *Answer:* Airlines rarely switch 100% of indirect bookings overnight due to corporate TMC readiness, interline/codeshare complexity, and multi-year GDS contracts. Blended modeling captures both partial value creation and fixed-cost absorption across smaller migrated volumes.
7. **How can net GDS cost ever be negative?**
   *Answer:* If an airline's retained distribution surcharge plus commercial GDS rebates exceed its gross segment, transaction, incentive, and servicing fees, the net GDS unit cost is negative—meaning legacy GDS actually generates net fee recovery, raising the commercial bar for NDC.
8. **What important airline distribution costs are still outside v2.0?**
   *Answer:* WACC/NPV discounting, corporate taxes, involuntary re-accommodation servicing spikes during irregular operations (IROPs), fare-class cannibalization, and segment-by-segment agency mix (TMC vs. OTA).

### Product Strategy & Design (Q9–Q16)
9. **How did you decide what to put in Basic vs. Advanced mode?**
   *Answer:* Basic mode surfaces the 10–12 levers executives debate first (volume, migration %, ticket value, GDS fee/surcharge treatment, NDC cost, ancillary/pricing uplift & margin, CAPEX/OPEX). Advanced mode exposes specialist variables (rebates, agency incentives, L2B parameters, transition duration) without cluttering the initial screen.
10. **Why not automatically crown a "Best Scenario" in Scenario Comparison?**
    *Answer:* Financial modeling alone doesn't capture organizational execution risk, agency readiness, or capital constraints. Highlighting one scenario as "Best" could encourage over-reliance on optimistic assumptions.
11. **Why make recommendation thresholds configurable?**
    *Answer:* Every airline has different capital hurdle rates and payback policies (e.g., 12-month vs. 24-month payback). Configurable thresholds make it explicit that governance criteria are policy choices, not universal truths.
12. **How did you prevent misleading visualizations?**
    *Answer:* In v1.0, stacking cost and revenue on one chart could be misread. In v2.0, costs appear strictly in the Distribution Cost Comparison chart, while positive savings/contribution and negative OPEX/transition appear as signed bars in the Contribution Bridge.
13. **How did you prioritize P0 vs. P1 vs. P2 work?**
    *Answer:* P0 fixed commercial math accuracy first (surcharge treatment, contribution margin, blended migration, break-even edge cases). P1 added deeper commercial economics and decision workflows (L2B, CAPEX/transition, scenarios, sensitivity, tests). P2 hardened export, security headers, SEO, documentation, and Vercel readiness.
14. **Why did you allow negative ancillary and continuous pricing uplift?**
    *Answer:* Poor NDC shopping UX, missing corporate bundles, or incomplete servicing can cause conversion or ancillary attachment to *drop* during early rollout. Supporting signed uplifts lets executives model realistic downside risk.
15. **What is your next highest-priority feature if you were to build v3.0?**
    *Answer:* Multi-year phased migration ramps (e.g., Year 1 15% → Year 3 60%) combined with agency-segment weighting (Corporate TMC vs. Leisure OTA), because corporate and leisure bookings have completely different ticket values, segment counts, and servicing costs.
16. **How would you validate this tool with real airline customers?**
    *Answer:* Calibrate the baseline against one airline's audited historical GDS invoice and BSP/ARC data to check unit-cost accuracy within ±3%, then run a pilot workshop with Distribution and Revenue Management teams to observe which assumptions generate the most debate.

### Architecture, AI Boundary & Engineering (Q17–Q24)
17. **Why didn't you add an LLM or AI chatbot to v2.0?**
    *Answer:* Adding an LLM just for a buzzword adds latency, cost, API-key management, and calculation hallucination risk. Deterministic TypeScript functions are faster, free, auditable, and testable.
18. **If you *did* add AI in v3.0, how would you architect it safely?**
    *Answer:* As a natural-language front end using structured tool-calling against `calculateDistributionEconomics`. The LLM extracts scenario parameters and explains verified engine outputs; it never performs math itself, keeps assumptions visible, and requires human approval.
19. **How do you guarantee the Dashboard, Scenario table, and Sensitivity heatmap never show conflicting numbers?**
    *Answer:* All three import and call the exact same pure function `calculateDistributionEconomics` in `services/economics.ts`. No component duplicates any financial formula.
20. **How did you handle CAPEX without double-counting?**
    *Answer:* Upfront CAPEX is recorded once at Month 0 in the cumulative cash-flow array for Year 1 cash flow, payback, and 3-year ROI. Optional straight-line monthly CAPEX allocation is computed separately as an informational P&L line and never subtracted from cash flow.
21. **How does payback work when transition costs vary over time?**
    *Answer:* Instead of using a naive `CAPEX / steadyStateImpact` formula that ignores transition losses, the engine simulates cumulative cash flow month by month across the transition period and interpolates the exact month cumulative cash flow turns non-negative. If it never recovers, it displays `"Payback not achieved"`.
22. **Why replace Tailwind Play CDN and Google Fonts CDN?**
    *Answer:* Runtime CDNs add external network dependencies, hurt performance, and force relaxed Content Security Policies. Local Tailwind CSS v4 + `@fontsource` fonts compile into static assets served from `'self'`.
23. **How did you use AI-assisted development while maintaining engineering accountability?**
    *Answer:* I owned the airline domain specification, P0/P1/P2 requirements, financial edge-case definitions, and acceptance criteria, while using AI coding tools to accelerate React/TypeScript implementation and test scaffolding—verifying every formula with independent hand-calculated Vitest assertions.
24. **How do you prevent `NaN` or `Infinity` in break-even calculations?**
    *Answer:* `calculateBreakEven` guards every denominator (`monthlyBookings`, `ndcBookings`, `avgTicketValue`, `ancillaryContributionMarginPercent`) and returns one of four explicit status enums rather than raw floating-point division.

### Testing, Security & Deployment (Q25–Q30)
25. **How do you know the financial engine is actually right, not just self-consistent?**
    *Answer:* `tests/economics.test.ts` encodes independent hand-calculated reference cases—including the Mandatory Reference Scenario (`1,000` bookings, `50%` migration, `$12` gross GDS, `$2` recovery, `$10` NDC, `$1,500` contribution, `$1,400` steady-state, `$1,200` transition)—plus 25+ boundary and stress cases.
26. **What security risks exist in a pure client-side calculator?**
    *Answer:* Even without a backend, three real risks exist: CSV formula injection (when exported CSVs open in Excel), malicious/prototype-polluting JSON imports, and overly permissive CSP or third-party script loading. We mitigated all three with dedicated sanitization, schema validation, and `vercel.json` headers.
27. **Why make browser `localStorage` opt-in instead of automatic?**
    *Answer:* Airlines treat distribution contracts as sensitive commercial data. Making persistence opt-in with an explicit warning that browser storage is not enterprise-encrypted protects users on shared machines.
28. **How does your CI pipeline prevent regressions?**
    *Answer:* `.github/workflows/ci.yml` runs `npm ci`, `tsc --noEmit`, `eslint`, `vitest run`, and `vite build` on every pull request with least-privilege `contents: read` permissions.
29. **How is the app deployed on Vercel safely without affecting your personal site?**
    *Answer:* As an independent Vercel project linked to `ndc-vs-gds-cost-analyzer-public`, using Vite's static output (`dist/`) and preview deployments per PR before merging to `main`—completely separate from `curiouskumar.com`.
30. **What are the biggest honest limitations you'd share with a hiring manager?**
    *Answer:* It is an illustrative prototype using synthetic defaults rather than audited airline P&L data; it uses a step-change migration share rather than a multi-year ramp; and production airline deployment would require contract-specific calibration and agency-segment modeling.
