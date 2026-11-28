import React, { useMemo, useState } from 'react';
import { EconomicInputs, SensitivityPresetId } from '../types';
import {
  buildSensitivityMatrix,
  calculateDriverSensitivities,
  formatSignedCurrency,
} from '../services/economics';

interface Props {
  inputs: EconomicInputs;
}

const PRESET_TABS: Array<{ id: SensitivityPresetId; label: string }> = [
  { id: 'ndc_cost_vs_ancillary', label: 'NDC Cost vs. Ancillary Uplift' },
  { id: 'migration_vs_ndc_cost', label: 'Migration % vs. NDC Cost' },
  { id: 'surcharge_recovery_vs_ndc_cost', label: 'Surcharge Recovery vs. NDC Cost' },
  { id: 'l2b_vs_ndc_cost', label: 'Look-to-Book vs. NDC Cost' },
];

const formatAxisValue = (val: number, unit: string): string => {
  if (unit === '$') return `$${val.toFixed(0)}`;
  if (unit === '%') return `${val}%`;
  if (unit === ':1') return `${val.toLocaleString()}:1`;
  return String(val);
};

export const SensitivityAnalysis: React.FC<Props> = ({ inputs }) => {
  const [presetId, setPresetId] = useState<SensitivityPresetId>('ndc_cost_vs_ancillary');

  const matrix = useMemo(() => buildSensitivityMatrix(inputs, presetId), [inputs, presetId]);
  const drivers = useMemo(() => calculateDriverSensitivities(inputs), [inputs]);
  const maxSwing = Math.max(...drivers.map((d) => d.swing), 1);

  return (
    <div className="space-y-6">
      {/* 2D Sensitivity Heatmap */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Two-Way Sensitivity Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Every cell is computed directly by the central financial calculation engine while holding
              all other active scenario assumptions constant.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sensitivity matrix pairs">
            {PRESET_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={presetId === tab.id}
                onClick={() => setPresetId(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                  presetId === tab.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900">{matrix.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{matrix.subtitle}</p>
        </div>

        {/* Legend (Explicit text labels + color, never hue-only) */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-100 border border-emerald-400 inline-block" />
            Positive Contribution Zone
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-100 border border-amber-400 inline-block" />
            Near Break-Even Boundary (±$1.5k/mo)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-100 border border-rose-400 inline-block" />
            Negative Contribution Zone
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse font-mono tabular-nums">
            <thead>
              <tr>
                <th className="p-2.5 text-left font-sans font-semibold text-slate-700 bg-slate-50 border border-slate-200">
                  {matrix.rowLabel} \ {matrix.colLabel}
                </th>
                {matrix.colValues.map((colVal) => (
                  <th
                    key={colVal}
                    className="p-2.5 text-right font-semibold text-slate-700 bg-slate-50 border border-slate-200 whitespace-nowrap"
                  >
                    {formatAxisValue(colVal, matrix.colUnit)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.cells.map((row, rowIdx) => (
                <tr key={matrix.rowValues[rowIdx]}>
                  <th className="p-2.5 text-left font-semibold text-slate-700 bg-slate-50 border border-slate-200 whitespace-nowrap">
                    {formatAxisValue(matrix.rowValues[rowIdx], matrix.rowUnit)}
                  </th>
                  {row.map((cell, colIdx) => {
                    const cellClasses =
                      cell.zone === 'positive'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : cell.zone === 'breakeven'
                          ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                          : 'bg-rose-50 text-rose-900 border-rose-200';
                    const zoneTag =
                      cell.zone === 'positive' ? 'Pos' : cell.zone === 'breakeven' ? 'BE' : 'Neg';

                    return (
                      <td
                        key={colIdx}
                        className={`p-2.5 text-right border whitespace-nowrap ${cellClasses}`}
                        title={`${matrix.rowLabel}: ${formatAxisValue(cell.rowValue, matrix.rowUnit)}, ${matrix.colLabel}: ${formatAxisValue(cell.colValue, matrix.colUnit)} → ${formatSignedCurrency(cell.monthlySteadyStateImpact)}/mo`}
                      >
                        <div>{formatSignedCurrency(cell.monthlySteadyStateImpact)}</div>
                        <div className="text-[10px] font-sans opacity-75">
                          {zoneTag}
                          {cell.paybackMonths !== null ? ` · ${cell.paybackMonths.toFixed(0)}m` : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Driver Influence Ranking (One-at-a-time Sensitivity) */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Highest-Influence Assumptions (Monthly Steady-State Impact Swing)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ranks commercial variables by total monthly impact swing across realistic downside and upside
            perturbations around the active scenario.
          </p>
        </div>

        <div className="space-y-3">
          {drivers.map((driver) => {
            const widthPct = Math.max(4, Math.round((driver.swing / maxSwing) * 100));
            return (
              <div key={driver.id} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800">{driver.label}</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    {driver.lowScenarioLabel} ({formatSignedCurrency(driver.lowImpact)}) to{' '}
                    {driver.highScenarioLabel} ({formatSignedCurrency(driver.highImpact)}) · Swing:{' '}
                    <strong className="text-slate-900">{formatSignedCurrency(driver.swing).replace('+', '')}</strong>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 rounded-full"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
