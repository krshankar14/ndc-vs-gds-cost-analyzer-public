import React, { useRef, useState } from 'react';
import { APP_VERSION, CURRENCY_CODE } from '../constants';
import {
  EconomicInputs,
  EconomicResults,
  RecommendationResult,
  ScenarioItem,
} from '../types';
import {
  buildSafeFilename,
  generateScenarioCsv,
  generateScenarioJson,
  triggerTextDownload,
} from '../services/exportService';
import { validateImportedScenarioJson } from '../services/validation';
import { Download, FileSpreadsheet, Printer, Save, Trash2, Upload } from 'lucide-react';

interface Props {
  activeScenario: ScenarioItem;
  results: EconomicResults;
  recommendation: RecommendationResult;
  persistenceEnabled: boolean;
  onTogglePersistence: (enabled: boolean) => void;
  onSaveNow: () => void;
  onClearSaved: () => void;
  onImportScenario: (name: string, description: string, inputs: EconomicInputs) => void;
}

export const AssumptionsPanel: React.FC<Props> = ({
  activeScenario,
  results,
  recommendation,
  persistenceEnabled,
  onTogglePersistence,
  onSaveNow,
  onClearSaved,
  onImportScenario,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleExportCsv = () => {
    const csv = generateScenarioCsv(activeScenario, results, recommendation);
    triggerTextDownload(csv, buildSafeFilename(activeScenario.name, 'csv'), 'text/csv;charset=utf-8;');
    setStatusMessage({ type: 'success', text: 'CSV report exported (formula-injection protected).' });
  };

  const handleExportJson = () => {
    const json = generateScenarioJson(activeScenario, results, recommendation);
    triggerTextDownload(
      json,
      buildSafeFilename(activeScenario.name, 'json'),
      'application/json;charset=utf-8;'
    );
    setStatusMessage({ type: 'success', text: 'JSON scenario snapshot exported.' });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validated = validateImportedScenarioJson(text);
      if (!validated.valid || !validated.inputs) {
        setStatusMessage({
          type: 'error',
          text: validated.error ?? 'Unable to validate imported JSON file.',
        });
      } else {
        onImportScenario(
          validated.scenarioName ?? 'Imported Scenario',
          validated.scenarioDescription ?? 'Imported from JSON',
          validated.inputs
        );
        setStatusMessage({
          type: 'success',
          text: `Imported "${validated.scenarioName}" as a new scenario.`,
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to read the selected file.' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Export, Import & Print Controls */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Export, Import &amp; Executive Print
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            All exports run locally in your browser (zero data transmitted to any server) and include
            scenario name, assumptions, currency ({CURRENCY_CODE}), version ({APP_VERSION}), and timestamp.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Import scenario JSON file"
          />

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
        </div>

        {statusMessage && (
          <p
            role="status"
            className={`text-xs px-3 py-2 rounded-md border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {statusMessage.text}
          </p>
        )}
      </section>

      {/* 2. Optional Local Browser Storage */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Optional Local Browser Storage
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Save scenarios locally in this browser only. Browser local storage is not encrypted
              enterprise storage — avoid storing confidential airline contract terms on shared devices.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={persistenceEnabled}
              onChange={(e) => onTogglePersistence(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-700"
            />
            Enable Auto-Save
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onSaveNow();
              setStatusMessage({ type: 'success', text: 'Scenarios saved locally in browser storage.' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Snapshot Now
          </button>

          <button
            type="button"
            onClick={() => {
              onClearSaved();
              setStatusMessage({ type: 'success', text: 'Cleared saved local browser data.' });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-md transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Saved Data
          </button>
        </div>
      </section>

      {/* 3. Channel Definitions & Formula Transparency */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Commercial Channel Definitions &amp; Model Boundaries
        </h3>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong className="text-slate-900">NDC Is a Data Exchange Standard, Not a Single Channel:</strong>{' '}
            IATA New Distribution Capability (NDC) is an XML/JSON messaging standard for airline
            offer and order management. Major GDS providers also distribute NDC content alongside
            direct airline APIs and third-party aggregators. For modeling clarity, this tool compares{' '}
            <strong>Legacy EDIFACT GDS commercial terms</strong> against a{' '}
            <strong>target NDC commercial arrangement</strong> (whether direct-connect, aggregator-led,
            or GDS-distributed NDC) with distinct per-booking fees, servicing costs, and offer capabilities.
          </p>

          <p>
            <strong className="text-slate-900">Surcharge Accounting (Airline Perspective):</strong>{' '}
            When an airline levies a distribution surcharge (DTC) on legacy GDS tickets, the retained
            portion acts as <em>revenue recovery</em> offsetting GDS fees—not an airline expense. Users
            can explicitly toggle between <em>No surcharge</em>, <em>Airline revenue recovery</em>, or{' '}
            <em>Additional airline expense</em> without double-counting.
          </p>

          <p>
            <strong className="text-slate-900">Revenue vs. Contribution Margin:</strong>{' '}
            Gross incremental ancillary and continuous pricing revenue are explicitly multiplied by their
            respective contribution margin percentages so direct fulfilment and variable servicing costs
            are not overstated as profit.
          </p>

          <p>
            <strong className="text-slate-900">CAPEX vs. OPEX Discipline:</strong>{' '}
            One-time implementation CAPEX is applied at Month 0 in cumulative cash flow and payback
            calculations. Optional straight-line CAPEX allocation is shown separately for P&amp;L reference
            and is never double-counted in cash flow metrics.
          </p>

          <p>
            <strong className="text-slate-900">Deterministic Engine (Zero Runtime AI):</strong>{' '}
            Version {APP_VERSION} executes 100% deterministic TypeScript financial formulas in the
            browser with no backend, no database, and no runtime LLM API calls.
          </p>
        </div>
      </section>
    </div>
  );
};
