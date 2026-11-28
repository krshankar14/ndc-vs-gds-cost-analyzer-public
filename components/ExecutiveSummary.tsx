import React, { useState } from 'react';
import {
  RecommendationResult,
  RecommendationThresholds,
} from '../types';
import { AlertTriangle, CheckCircle2, Info, SlidersHorizontal, XCircle } from 'lucide-react';

interface Props {
  recommendation: RecommendationResult;
  thresholds: RecommendationThresholds;
  onThresholdsChange: (next: RecommendationThresholds) => void;
}

export const ExecutiveSummary: React.FC<Props> = ({
  recommendation,
  thresholds,
  onThresholdsChange,
}) => {
  const [showThresholdEditor, setShowThresholdEditor] = useState(false);

  const statusMeta = {
    favorable: {
      badge: 'Favorable',
      headerBg: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />,
    },
    hybrid_conditional: {
      badge: 'Hybrid / Conditional',
      headerBg: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-900',
      icon: <Info className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />,
    },
    unfavorable: {
      badge: 'Unfavorable',
      headerBg: 'bg-rose-50 border-rose-200',
      textColor: 'text-rose-900',
      icon: <XCircle className="w-5 h-5 text-rose-700 shrink-0" aria-hidden="true" />,
    },
    insufficient_information: {
      badge: 'Insufficient Information',
      headerBg: 'bg-slate-100 border-slate-200',
      textColor: 'text-slate-900',
      icon: <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0" aria-hidden="true" />,
    },
  }[recommendation.status];

  const updateThreshold = (key: keyof RecommendationThresholds, raw: string) => {
    const val = Number(raw);
    if (!Number.isFinite(val)) return;
    onThresholdsChange({ ...thresholds, [key]: val });
  };

  return (
    <section
      aria-label="Executive recommendation"
      className="bg-white rounded-xl border border-slate-200 overflow-hidden print-break-avoid"
    >
      <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${statusMeta.headerBg}`}>
        <div className="flex items-center gap-2.5">
          {statusMeta.icon}
          <div>
            <p className="text-xs text-slate-600">
              Deterministic Decision Support · Posture: <strong className={statusMeta.textColor}>{statusMeta.badge}</strong>
            </p>
            <h3 className={`text-sm sm:text-base font-semibold ${statusMeta.textColor}`}>
              {recommendation.title}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowThresholdEditor((prev) => !prev)}
          className="no-print inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Thresholds
        </button>
      </div>

      {/* Optional Configurable Illustrative Thresholds */}
      {showThresholdEditor && (
        <div className="no-print px-5 py-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <p className="text-xs text-slate-600">
            Configure illustrative governance thresholds for recommendation classification. These are
            directional policy inputs rather than statistically validated margins of error.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="threshold-favorable-impact"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Favorable Min Monthly Impact (USD)
              </label>
              <input
                id="threshold-favorable-impact"
                type="number"
                step={5000}
                value={thresholds.favorableMinMonthlyImpact}
                onChange={(e) => updateThreshold('favorableMinMonthlyImpact', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="threshold-unfavorable-impact"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Unfavorable Max Monthly Impact (USD)
              </label>
              <input
                id="threshold-unfavorable-impact"
                type="number"
                step={5000}
                value={thresholds.unfavorableMaxMonthlyImpact}
                onChange={(e) => updateThreshold('unfavorableMaxMonthlyImpact', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md bg-white"
              />
            </div>
            <div>
              <label
                htmlFor="threshold-favorable-payback"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Favorable Max Payback (Months)
              </label>
              <input
                id="threshold-favorable-payback"
                type="number"
                min={1}
                max={60}
                value={thresholds.favorableMaxPaybackMonths}
                onChange={(e) => updateThreshold('favorableMaxPaybackMonths', e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md bg-white"
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* Primary Finding */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 mb-1">Primary Financial Finding</h4>
          <p className="text-sm text-slate-900 leading-relaxed font-medium">
            {recommendation.primaryFinding}
          </p>
          <p className="text-xs text-slate-600 mt-1.5">{recommendation.sensitivityNote}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
          {/* Key Value Drivers */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2">Key Value Drivers</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc list-inside">
              {recommendation.keyValueDrivers.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Critical Risks */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2">Critical Risks</h4>
            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc list-inside">
              {recommendation.criticalRisks.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
          {/* Recommended Next Investigation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2">
              Recommended Next Investigation
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc list-inside">
              {recommendation.recommendedNextInvestigations.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Assumptions Requiring Validation */}
          <div>
            <h4 className="text-xs font-semibold text-slate-800 mb-2">
              Assumptions Requiring Validation
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc list-inside">
              {recommendation.assumptionsRequiringValidation.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-700">Decision-Support Boundary:</strong> This recommendation
          is generated by deterministic rules for exploratory commercial framing. It is not an
          automated investment approval, audited financial forecast, or substitute for airline-specific
          contract and IT cost verification.
        </div>
      </div>
    </section>
  );
};
