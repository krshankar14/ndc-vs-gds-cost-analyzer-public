import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EconomicInputs, EconomicResults } from '../types';
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatNumber,
  formatSignedCurrency,
  formatSignedCurrencyPrecise,
} from '../services/economics';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface Props {
  inputs: EconomicInputs;
  results: EconomicResults;
}

const TrendMarker: React.FC<{ value: number; positiveIsGood?: boolean }> = ({
  value,
  positiveIsGood = true,
}) => {
  if (value === 0) return <Minus className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />;
  const favorable = positiveIsGood ? value > 0 : value < 0;
  return value > 0 ? (
    <ArrowUpRight
      className={`w-4 h-4 shrink-0 ${favorable ? 'text-emerald-700' : 'text-rose-700'}`}
      aria-hidden="true"
    />
  ) : (
    <ArrowDownRight
      className={`w-4 h-4 shrink-0 ${favorable ? 'text-emerald-700' : 'text-rose-700'}`}
      aria-hidden="true"
    />
  );
};

export const ResultsDashboard: React.FC<Props> = ({ inputs, results }) => {
  const steadyStatePositive = results.monthlySteadyStateImpact > 0;
  const steadyStateNegative = results.monthlySteadyStateImpact < 0;

  // 1. Signed Financial Contribution Bridge (never stacks expenses and revenues into one misleading positive total)
  const bridgeData = [
    {
      name: 'Var. Cost Savings',
      value: Math.round(results.variableDistributionCostSavingsMonthly),
    },
    {
      name: 'Ancillary Contrib.',
      value: Math.round(results.ancillaryContributionMonthly),
    },
    {
      name: 'Pricing Contrib.',
      value: Math.round(results.pricingContributionMonthly),
    },
    {
      name: 'Fixed OPEX',
      value: -Math.round(results.incrementalMonthlyFixedOpex),
    },
    {
      name: 'Steady-State Net',
      value: Math.round(results.monthlySteadyStateImpact),
      isTotal: true,
    },
    {
      name: 'Transition Net',
      value: Math.round(results.monthlyTransitionImpact),
      isTotal: true,
    },
  ];

  // 2. Baseline vs Blended Monthly Distribution Cost Breakdown
  const channelCostData = [
    {
      name: '100% Legacy GDS',
      remainingGds: Math.round(results.baselineMonthlyNetGdsCost),
      ndcVariable: 0,
      fixedOpex: 0,
      transition: 0,
    },
    {
      name: 'Blended Steady-State',
      remainingGds: Math.round(results.futureRemainingGdsCostMonthly),
      ndcVariable: Math.round(results.futureNdcVariableCostMonthly),
      fixedOpex: Math.round(results.incrementalMonthlyFixedOpex),
      transition: 0,
    },
    {
      name: 'Blended Transition',
      remainingGds: Math.round(results.futureRemainingGdsCostMonthly),
      ndcVariable: Math.round(results.futureNdcVariableCostMonthly),
      fixedOpex: Math.round(results.incrementalMonthlyFixedOpex),
      transition: Math.round(results.monthlyTransitionExpense),
    },
  ];

  const kpiCards = [
    {
      label: 'Current Net GDS Cost',
      value: formatCurrency(results.baselineMonthlyNetGdsCost),
      sub: `${formatCurrencyPrecise(results.unitNetGdsCost)} / booking · ${formatNumber(results.eligibleMonthlyBookings)}/mo`,
      tone: 'neutral' as const,
    },
    {
      label: 'Future Blended Cost (Steady-State)',
      value: formatCurrency(results.blendedSteadyStateDistributionCostMonthly),
      sub: `${formatNumber(Math.round(results.remainingGdsBookings))} GDS · ${formatNumber(Math.round(results.ndcBookings))} NDC`,
      tone: 'neutral' as const,
    },
    {
      label: 'Distribution Cost Savings',
      value: formatSignedCurrency(results.steadyStateDistributionCostSavingsMonthly),
      sub: `Variable delta: ${formatSignedCurrency(results.variableDistributionCostSavingsMonthly)}/mo`,
      tone:
        results.steadyStateDistributionCostSavingsMonthly > 0
          ? ('positive' as const)
          : results.steadyStateDistributionCostSavingsMonthly < 0
            ? ('negative' as const)
            : ('neutral' as const),
      trend: results.steadyStateDistributionCostSavingsMonthly,
    },
    {
      label: 'Gross Incremental Revenue',
      value: formatSignedCurrency(results.grossIncrementalRevenueMonthly),
      sub: `Ancillary ${formatSignedCurrency(results.grossAncillaryRevenueMonthly)} · Pricing ${formatSignedCurrency(results.grossPricingRevenueMonthly)}`,
      tone: 'neutral' as const,
    },
    {
      label: 'Incremental Contribution Margin',
      value: formatSignedCurrency(results.incrementalContributionMonthly),
      sub: `After fulfilment & variable margin (${inputs.ancillaryContributionMarginPercent}% / ${inputs.pricingContributionMarginPercent}%)`,
      tone:
        results.incrementalContributionMonthly > 0
          ? ('positive' as const)
          : results.incrementalContributionMonthly < 0
            ? ('negative' as const)
            : ('neutral' as const),
    },
    {
      label: 'Net Monthly Impact (Steady-State)',
      value: formatSignedCurrency(results.monthlySteadyStateImpact),
      sub: `Transition period: ${formatSignedCurrency(results.monthlyTransitionImpact)}/mo`,
      tone: steadyStatePositive
        ? ('positive' as const)
        : steadyStateNegative
          ? ('negative' as const)
          : ('neutral' as const),
      trend: results.monthlySteadyStateImpact,
      featured: true,
    },
    {
      label: 'Annualized Steady-State Run Rate',
      value: formatSignedCurrency(results.annualizedSteadyStateImpact),
      sub: `Year 1 Cash Flow (incl. CAPEX): ${formatSignedCurrency(results.firstYearCashFlow)}`,
      tone: steadyStatePositive
        ? ('positive' as const)
        : steadyStateNegative
          ? ('negative' as const)
          : ('neutral' as const),
    },
    {
      label: 'Break-Even Ancillary Uplift',
      value: results.breakEven.label,
      sub:
        results.breakEven.status === 'no_uplift_required'
          ? 'Steady-state break-even achieved'
          : results.breakEven.status === 'uplift_required'
            ? `Current assumption: ${inputs.ancillaryUpliftPercent.toFixed(1)}%`
            : 'See break-even details below',
      tone:
        results.breakEven.status === 'no_uplift_required'
          ? ('positive' as const)
          : results.breakEven.status === 'not_achievable'
            ? ('negative' as const)
            : ('neutral' as const),
    },
    {
      label: 'Implementation Payback Period',
      value: results.payback.label,
      sub:
        results.threeYearRoiPercent !== null
          ? `3-Yr Cash ROI on CAPEX: ${results.threeYearRoiPercent.toFixed(1)}%`
          : `3-Yr Cumulative Cash: ${formatSignedCurrency(results.threeYearCumulativeCashFlow)}`,
      tone:
        results.payback.status === 'immediate' ||
        (results.payback.status === 'achieved' && (results.payback.months ?? 99) <= 24)
          ? ('positive' as const)
          : results.payback.status === 'not_achieved'
            ? ('negative' as const)
            : ('neutral' as const),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Executive KPI Grid (9 Reconciled Cards) */}
      <section aria-label="Executive financial KPIs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiCards.map((card) => {
            const valueColor =
              card.tone === 'positive'
                ? 'text-emerald-800'
                : card.tone === 'negative'
                  ? 'text-rose-800'
                  : 'text-slate-900';
            const cardBorder = card.featured
              ? card.tone === 'positive'
                ? 'border-emerald-300 bg-emerald-50/50'
                : card.tone === 'negative'
                  ? 'border-rose-300 bg-rose-50/50'
                  : 'border-slate-300 bg-white'
              : 'border-slate-200 bg-white';

            return (
              <div key={card.label} className={`rounded-xl border p-4 ${cardBorder} print-break-avoid`}>
                <p className="text-xs font-medium text-slate-600">{card.label}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  {card.trend !== undefined && <TrendMarker value={card.trend} />}
                  <p className={`text-xl font-bold font-mono tabular-nums tracking-tight ${valueColor}`}>
                    {card.value}
                  </p>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed font-mono tabular-nums">
                  {card.sub}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Primary Financial Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart A: Signed Cost & Contribution Bridge */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 print-break-avoid">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Monthly Financial Contribution Bridge
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Separates variable cost savings, contribution margin, fixed OPEX, and net impact (USD/mo).
            </p>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bridgeData} margin={{ top: 12, right: 12, left: 4, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={46}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    Math.abs(v) >= 1_000_000
                      ? `$${(v / 1_000_000).toFixed(1)}M`
                      : Math.abs(v) >= 1_000
                        ? `$${(v / 1_000).toFixed(0)}k`
                        : `$${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number | string) => [
                    formatSignedCurrency(Number(value) || 0),
                    'Monthly Impact',
                  ]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine y={0} stroke="#64748b" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {bridgeData.map((entry, idx) => {
                    let fill = entry.value >= 0 ? '#059669' : '#dc2626';
                    if (entry.isTotal) {
                      fill = entry.value >= 0 ? '#1d4ed8' : '#9f1239';
                    }
                    return <Cell key={idx} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart B: Blended Channel Distribution Cost */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 print-break-avoid">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Monthly Distribution Cost Comparison
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              100% legacy net GDS baseline vs. blended channel cost components (expenses only, USD/mo).
            </p>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelCostData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    Math.abs(v) >= 1_000_000
                      ? `$${(v / 1_000_000).toFixed(1)}M`
                      : Math.abs(v) >= 1_000
                        ? `$${(v / 1_000).toFixed(0)}k`
                        : `$${v}`
                  }
                />
                <Tooltip
                  formatter={(value: number | string) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine y={0} stroke="#64748b" />
                <Bar dataKey="remainingGds" name="Net Legacy GDS" stackId="cost" fill="#475569" />
                <Bar dataKey="ndcVariable" name="NDC Variable" stackId="cost" fill="#2563eb" />
                <Bar dataKey="fixedOpex" name="Fixed OPEX" stackId="cost" fill="#d97706" />
                <Bar dataKey="transition" name="Transition Cost" stackId="cost" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* 3. 36-Month Cumulative Cash Flow Chart */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 print-break-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              36-Month Cumulative Incremental Cash Flow
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Starts at Month 0 upfront CAPEX ({formatCurrency(-inputs.oneTimeImplementationCapex)}),
              applies transition costs for {inputs.transitionDurationMonths} months, then steady-state cash flow.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-600">
            Payback: <span className="font-semibold text-slate-900">{results.payback.label}</span>
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={results.cashFlowTimeline}
              margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#475569', fontSize: 11 }}
                tickFormatter={(m: number) => `M${m}`}
                interval={5}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1_000_000
                    ? `$${(v / 1_000_000).toFixed(1)}M`
                    : Math.abs(v) >= 1_000
                      ? `$${(v / 1_000).toFixed(0)}k`
                      : `$${v}`
                }
              />
              <Tooltip
                labelFormatter={(label) => `Month ${label}`}
                formatter={(value: number | string) => [
                  formatSignedCurrency(Number(value) || 0),
                  'Cumulative Cash Flow',
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine y={0} stroke="#0f172a" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="cumulativeCashFlow"
                stroke="#1d4ed8"
                strokeWidth={2}
                fill="#dbeafe"
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4. Per-Booking Unit Economics & Channel Reconciliation Table */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden print-break-avoid">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Unit Economics Reconciliation (Per Booking)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Airline P&amp;L perspective comparing legacy GDS unit cost vs. migrated NDC channel economics.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Migration: {results.ndcMigrationPercent}% ({formatNumber(Math.round(results.ndcBookings))} NDC /{' '}
            {formatNumber(Math.round(results.remainingGdsBookings))} GDS)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <th className="px-5 py-3 font-semibold">Line Item (USD per Booking)</th>
                <th className="px-5 py-3 font-semibold text-right">Legacy GDS</th>
                <th className="px-5 py-3 font-semibold text-right">Migrated NDC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums text-xs sm:text-sm">
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">
                  Gross Booking, Transaction, Incentive &amp; Servicing Fees
                </td>
                <td className="px-5 py-2.5 text-right text-rose-700">
                  {formatCurrencyPrecise(results.unitGdsGrossCost)}
                </td>
                <td className="px-5 py-2.5 text-right text-rose-700">
                  {formatCurrencyPrecise(results.unitNdcBaseCost + results.unitNdcServicingCost)}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">
                  Incremental Look-to-Book Shopping API Cost (
                  {formatNumber(Math.round(results.additionalLookToBookRequests))} req)
                </td>
                <td className="px-5 py-2.5 text-right text-slate-400">$0.00</td>
                <td className="px-5 py-2.5 text-right text-rose-700">
                  {formatCurrencyPrecise(results.unitIncrementalShoppingCost)}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">
                  Less: Surcharge Recovery &amp; Commercial Rebates Retained
                </td>
                <td className="px-5 py-2.5 text-right text-emerald-700">
                  -{formatCurrencyPrecise(results.unitGdsRecoveriesAndRebates)}
                </td>
                <td className="px-5 py-2.5 text-right text-slate-400">$0.00</td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-5 py-2.5 font-sans text-slate-900">
                  Net Variable Distribution Cost per Booking
                </td>
                <td className="px-5 py-2.5 text-right text-slate-900">
                  {formatCurrencyPrecise(results.unitNetGdsCost)}
                </td>
                <td className="px-5 py-2.5 text-right text-slate-900">
                  {formatCurrencyPrecise(results.unitNdcVariableCost)}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">
                  Gross Incremental Offer Revenue (Ancillary + Continuous Pricing)
                </td>
                <td className="px-5 py-2.5 text-right text-slate-400">Baseline ($0.00)</td>
                <td className="px-5 py-2.5 text-right text-slate-700">
                  {formatSignedCurrencyPrecise(results.unitGrossIncrementalRevenue)}
                </td>
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">
                  Incremental Contribution Margin (Post-Fulfilment Margin)
                </td>
                <td className="px-5 py-2.5 text-right text-slate-400">Baseline ($0.00)</td>
                <td
                  className={`px-5 py-2.5 text-right font-medium ${
                    results.unitIncrementalContribution >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {formatSignedCurrencyPrecise(results.unitIncrementalContribution)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-5 py-3 font-sans text-slate-900">
                  Net Unit Variable Advantage (NDC vs. Net GDS)
                </td>
                <td className="px-5 py-3 text-right text-slate-500">Baseline</td>
                <td
                  className={`px-5 py-3 text-right ${
                    results.unitNdcNetContributionVsGds >= 0 ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {formatSignedCurrencyPrecise(results.unitNdcNetContributionVsGds)} / booking
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
          <span>
            <strong className="text-slate-800">Break-Even Note:</strong> {results.breakEven.explanation}
          </span>
          {inputs.capexAllocationMonths > 0 && inputs.oneTimeImplementationCapex > 0 && (
            <span className="font-mono tabular-nums text-slate-700 shrink-0">
              Allocated CAPEX P&amp;L View ({inputs.capexAllocationMonths} mo):{' '}
              {formatSignedCurrency(results.monthlySteadyStateNetOfAllocatedCapex)}/mo
            </span>
          )}
        </div>
      </section>
    </div>
  );
};
