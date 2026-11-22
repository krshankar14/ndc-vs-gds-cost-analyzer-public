import React from 'react';
import { EconomicResults } from '../types';
import { formatCurrency } from '../services/economics';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  results: EconomicResults;
}

export const ExecutiveSummary: React.FC<Props> = ({ results }) => {
  const { netDeltaPercent, totalNDCValueMonthly } = results;

  let recommendationStatus: 'favorable' | 'hybrid' | 'unfavorable';
  let headline = '';
  let bullets: string[] = [];

  // Deterministic Threshold Logic
  if (netDeltaPercent > 10) {
    recommendationStatus = 'favorable';
    headline = 'NDC distribution strategy is strictly favorable under current assumptions.';
    bullets = [
      `Net financial benefit of ${netDeltaPercent.toFixed(1)}% vs. GDS baseline suggests aggressive adoption.`,
      `Value creation from ancillary/pricing (${formatCurrency(totalNDCValueMonthly)}) fully offsets implementation costs.`,
      'Recommend initiating full technical transition roadmap immediately.',
    ];
  } else if (netDeltaPercent >= -10 && netDeltaPercent <= 10) {
    recommendationStatus = 'hybrid';
    headline = 'Hybrid model recommended. Economics are neutral to slightly favorable.';
    bullets = [
      `Net impact is within margin of error (${netDeltaPercent.toFixed(1)}%). Exclusive NDC shift carries risk without higher ancillary confidence.`,
      'Target specific high-yield markets or O&Ds where surcharge removal has maximum impact.',
      'Monitor aggregator performance before committing to volume guarantees.',
    ];
  } else {
    recommendationStatus = 'unfavorable';
    headline = 'GDS remains the cost-effective channel. NDC transition is premature.';
    bullets = [
      `Current GDS incentive/cost structure is ${Math.abs(netDeltaPercent).toFixed(1)}% more efficient than projected NDC costs.`,
      'NDC technology costs exceed the projected revenue uplift from ancillary sales.',
      'Revisit assessment if GDS surcharges increase or aggregator fees drop below $3.00.',
    ];
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div
        className={`px-6 py-4 border-b flex items-center gap-3 ${
          recommendationStatus === 'favorable'
            ? 'bg-emerald-50 border-emerald-100'
            : recommendationStatus === 'unfavorable'
              ? 'bg-rose-50 border-rose-100'
              : 'bg-amber-50 border-amber-100'
        }`}
      >
        {recommendationStatus === 'favorable' && (
          <CheckCircle className="w-5 h-5 text-emerald-700" />
        )}
        {recommendationStatus === 'unfavorable' && (
          <AlertTriangle className="w-5 h-5 text-rose-700" />
        )}
        {recommendationStatus === 'hybrid' && <Info className="w-5 h-5 text-amber-700" />}

        <h3
          className={`font-bold text-sm uppercase tracking-wide ${
            recommendationStatus === 'favorable'
              ? 'text-emerald-800'
              : recommendationStatus === 'unfavorable'
                ? 'text-rose-800'
                : 'text-amber-800'
          }`}
        >
          Executive Recommendation
        </h3>
      </div>

      <div className="p-6">
        <p className="text-lg font-medium text-slate-800 mb-4">{headline}</p>
        <ul className="space-y-2 mb-6">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-600 text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        <div className="border-t border-slate-100 pt-4 mt-4">
          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Mandatory Caveats</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
            <p>• Directional decision tool; not a guarantee of future P&amp;L.</p>
            <p>• Assumes 12-18 month transition period overlap.</p>
            <p>• Look-to-Book (L2B) costs for shopping traffic excluded.</p>
            <p>• Success dependent on Agency/TMC technical readiness.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
