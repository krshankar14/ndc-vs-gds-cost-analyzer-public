import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { EconomicResults } from '../types';
import { formatCurrency, formatCurrencyPrecise } from '../services/economics';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface Props {
  results: EconomicResults;
}

export const ResultsDashboard: React.FC<Props> = ({ results }) => {
  const isPositive = results.netDeltaMonthly > 0;
  const unitNDCPosition = results.unitNDCValue - results.unitNDCCost;

  const comparisonData = [
    {
      name: 'GDS Baseline',
      cost: results.gdsMonthlyCost,
      value: 0,
      net: -results.gdsMonthlyCost,
    },
    {
      name: 'NDC Scenario',
      cost: results.ndcMonthlyCost,
      value: results.totalNDCValueMonthly,
      net: results.totalNDCValueMonthly - results.ndcMonthlyCost,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Level KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Current GDS TCD (Monthly)
          </p>
          <h3 className="text-2xl font-bold text-slate-800">
            {formatCurrency(results.gdsMonthlyCost)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Unit: {formatCurrencyPrecise(results.unitGDS)} / booking
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Proj. NDC Value (Monthly)
          </p>
          <h3 className="text-2xl font-bold text-emerald-600">
            +{formatCurrency(results.totalNDCValueMonthly)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Ancillary + Pricing Lift</p>
        </div>

        <div
          className={`p-5 rounded-xl shadow-sm border ${
            isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
          }`}
        >
          <p
            className={`text-xs font-bold uppercase tracking-wide mb-1 ${
              isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            Net Financial Impact
          </p>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <ArrowUpRight className="text-emerald-600 w-6 h-6" />
            ) : (
              <ArrowDownRight className="text-rose-600 w-6 h-6" />
            )}
            <h3 className={`text-2xl font-bold ${isPositive ? 'text-emerald-800' : 'text-rose-800'}`}>
              {isPositive ? '+' : ''}
              {formatCurrency(results.netDeltaMonthly)}
            </h3>
          </div>
          <p className={`text-xs mt-2 font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? 'Profit Accretive' : 'Cost Dilutive'} (Monthly)
          </p>
        </div>
      </div>

      {/* 2. Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[300px]">
          <h4 className="text-sm font-semibold text-slate-800 mb-6">
            Monthly Financial Comparison
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip
                formatter={(value: number | string) => formatCurrency(Number(value) || 0)}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar
                dataKey="cost"
                name="Distribution Cost"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="value"
                name="Revenue Uplift"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Unit Economics (Per Booking)</h4>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Metric</th>
                <th className="px-6 py-3 font-medium text-right">GDS</th>
                <th className="px-6 py-3 font-medium text-right">NDC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-6 py-3 text-slate-700">Tech & Segment Fees</td>
                <td className="px-6 py-3 text-right font-mono text-rose-600">
                  {formatCurrencyPrecise(results.unitGDS)}
                </td>
                <td className="px-6 py-3 text-right font-mono text-rose-600">
                  {formatCurrencyPrecise(results.unitNDCCost)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 text-slate-700">Value Creation (Rev)</td>
                <td className="px-6 py-3 text-right font-mono text-slate-400">$0.00</td>
                <td className="px-6 py-3 text-right font-mono text-emerald-600">
                  +{formatCurrencyPrecise(results.unitNDCValue)}
                </td>
              </tr>
              <tr className="bg-slate-50 font-semibold">
                <td className="px-6 py-3 text-slate-900">Net Economic Position</td>
                <td className="px-6 py-3 text-right font-mono text-slate-600">
                  -{formatCurrencyPrecise(results.unitGDS)}
                </td>
                <td className="px-6 py-3 text-right font-mono">
                  <span className={results.unitNDC < results.unitGDS ? 'text-emerald-600' : 'text-rose-600'}>
                    {unitNDCPosition > 0 ? '+' : ''}
                    {formatCurrencyPrecise(unitNDCPosition)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Break-even Ancillary Uplift Required:</span>
            {results.breakEvenAncillaryPercent <= 0 ? (
              <span className="font-bold text-emerald-600">Achieved (ROI Positive)</span>
            ) : (
              <span className="font-bold text-amber-600">
                {results.breakEvenAncillaryPercent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
