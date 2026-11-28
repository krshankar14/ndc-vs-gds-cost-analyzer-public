import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EconomicResults, ScenarioItem } from '../types';
import {
  calculateDistributionEconomics,
  formatCurrency,
  formatCurrencyPrecise,
  formatSignedCurrency,
} from '../services/economics';
import { MAX_SCENARIOS } from '../services/scenarioService';
import { Copy, Edit3, Plus, RotateCcw, Trash2 } from 'lucide-react';

interface Props {
  scenarios: ScenarioItem[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onCreateScenario: () => void;
  onDuplicateScenario: (id: string) => void;
  onRenameScenario: (id: string, name: string) => void;
  onDeleteScenario: (id: string) => void;
  onResetScenarios: () => void;
}

export const ScenarioComparison: React.FC<Props> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
  onDuplicateScenario,
  onRenameScenario,
  onDeleteScenario,
  onResetScenarios,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  const evaluated: Array<{ scenario: ScenarioItem; results: EconomicResults }> = scenarios.map(
    (scenario) => ({
      scenario,
      results: calculateDistributionEconomics(scenario.inputs),
    })
  );

  const chartData = evaluated.map(({ scenario, results }) => ({
    name: scenario.name.length > 20 ? `${scenario.name.slice(0, 18)}…` : scenario.name,
    steadyState: Math.round(results.monthlySteadyStateImpact),
    transition: Math.round(results.monthlyTransitionImpact),
    incrementalContribution: Math.round(results.incrementalContributionMonthly),
  }));

  const startRename = (scenario: ScenarioItem) => {
    setEditingId(scenario.id);
    setDraftName(scenario.name);
  };

  const commitRename = (id: string) => {
    if (draftName.trim()) {
      onRenameScenario(id, draftName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Multi-Scenario Comparison ({scenarios.length} / {MAX_SCENARIOS})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Compare adoption strategies side by side. Select any scenario to customize its assumptions
            independently in the sidebar.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCreateScenario}
            disabled={scenarios.length >= MAX_SCENARIOS}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New Scenario
          </button>
          <button
            type="button"
            onClick={onResetScenarios}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Templates
          </button>
        </div>
      </div>

      {/* Scenario Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {evaluated.map(({ scenario, results }) => {
          const isActive = scenario.id === activeScenarioId;
          return (
            <div
              key={scenario.id}
              className={`rounded-xl border p-4 bg-white flex flex-col justify-between gap-4 ${
                isActive ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  {editingId === scenario.id ? (
                    <input
                      type="text"
                      value={draftName}
                      autoFocus
                      aria-label="Scenario name"
                      onChange={(e) => setDraftName(e.target.value)}
                      onBlur={() => commitRename(scenario.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(scenario.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="flex-1 px-2 py-1 text-sm font-semibold border border-blue-500 rounded bg-white text-slate-900"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectScenario(scenario.id)}
                      className="text-left text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors"
                    >
                      {scenario.name}
                    </button>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startRename(scenario)}
                      aria-label={`Rename ${scenario.name}`}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateScenario(scenario.id)}
                      disabled={scenarios.length >= MAX_SCENARIOS}
                      aria-label={`Duplicate ${scenario.name}`}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteScenario(scenario.id)}
                      disabled={scenarios.length <= 1}
                      aria-label={`Remove ${scenario.name}`}
                      className="p-1 text-slate-400 hover:text-rose-700 disabled:opacity-30 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">{scenario.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">Migration Share</span>
                  <span className="text-slate-900 font-semibold">
                    {scenario.inputs.ndcMigrationPercent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">Steady-State Monthly</span>
                  <span
                    className={`font-semibold ${
                      results.monthlySteadyStateImpact >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatSignedCurrency(results.monthlySteadyStateImpact)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-slate-500">Payback Period</span>
                  <span className="text-slate-900">{results.payback.label}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectScenario(scenario.id)}
                className={`w-full py-1.5 px-3 text-xs font-semibold rounded-md border transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isActive ? 'Editing in Sidebar' : 'Load into Sidebar'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparative Chart */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Side-by-Side Monthly Financial Impact
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Compares monthly incremental contribution, steady-state net impact, and transition-period net impact (USD/mo).
        </p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1_000_000
                    ? `$${(v / 1_000_000).toFixed(1)}M`
                    : Math.abs(v) >= 1_000
                      ? `$${(v / 1_000).toFixed(0)}k`
                      : `$${v}`
                }
              />
              <Tooltip
                formatter={(value: number | string) => formatSignedCurrency(Number(value) || 0)}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <ReferenceLine y={0} stroke="#64748b" />
              <Bar dataKey="incrementalContribution" name="Incremental Contribution" fill="#059669" />
              <Bar dataKey="steadyState" name="Steady-State Net Impact" fill="#1d4ed8" />
              <Bar dataKey="transition" name="Transition-Period Net" fill="#d97706" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Detailed Side-by-Side Reconciliation Table */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Scenario Comparison Matrix</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strategic suitability depends on agency readiness, CAPEX capacity, and assumption confidence —
            not solely the highest modeled monthly figure.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-5 py-3 font-semibold">Metric</th>
                {evaluated.map(({ scenario }) => (
                  <th key={scenario.id} className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                    {scenario.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">NDC Migration Share</td>
                {evaluated.map(({ scenario }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-900">
                    {scenario.inputs.ndcMigrationPercent}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Net GDS Cost / Booking</td>
                {evaluated.map(({ scenario, results }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-900">
                    {formatCurrencyPrecise(results.unitNetGdsCost)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">NDC Variable Cost / Booking</td>
                {evaluated.map(({ scenario, results }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-900">
                    {formatCurrencyPrecise(results.unitNdcVariableCost)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Gross Incremental Revenue / Mo</td>
                {evaluated.map(({ scenario, results }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-800">
                    {formatSignedCurrency(results.grossIncrementalRevenueMonthly)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Incremental Contribution / Mo</td>
                {evaluated.map(({ scenario, results }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-900">
                    {formatSignedCurrency(results.incrementalContributionMonthly)}
                  </td>
                ))}
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-5 py-2.5 font-sans text-slate-900">Steady-State Net Impact / Mo</td>
                {evaluated.map(({ scenario, results }) => (
                  <td
                    key={scenario.id}
                    className={`px-4 py-2.5 text-right ${
                      results.monthlySteadyStateImpact >= 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {formatSignedCurrency(results.monthlySteadyStateImpact)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Transition-Period Impact / Mo</td>
                {evaluated.map(({ scenario, results }) => (
                  <td
                    key={scenario.id}
                    className={`px-4 py-2.5 text-right ${
                      results.monthlyTransitionImpact >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatSignedCurrency(results.monthlyTransitionImpact)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Upfront CAPEX</td>
                {evaluated.map(({ scenario }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-800">
                    {formatCurrency(scenario.inputs.oneTimeImplementationCapex)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Year 1 Cash Flow (incl. CAPEX)</td>
                {evaluated.map(({ scenario, results }) => (
                  <td
                    key={scenario.id}
                    className={`px-4 py-2.5 text-right ${
                      results.firstYearCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatSignedCurrency(results.firstYearCashFlow)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">3-Year Cumulative Cash Flow</td>
                {evaluated.map(({ scenario, results }) => (
                  <td
                    key={scenario.id}
                    className={`px-4 py-2.5 text-right ${
                      results.threeYearCumulativeCashFlow >= 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {formatSignedCurrency(results.threeYearCumulativeCashFlow)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Implementation Payback</td>
                {evaluated.map(({ scenario, results }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-900">
                    {results.payback.label}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-2.5 font-sans text-slate-700">Break-Even Ancillary Uplift</td>
                {evaluated.map(({ scenario, results }) => (
                  <td key={scenario.id} className="px-4 py-2.5 text-right text-slate-900">
                    {results.breakEven.label}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
