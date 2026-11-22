import React, { useState, useMemo } from 'react';
import { InputPanel } from './components/InputPanel';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { DEFAULT_INPUTS_FSC } from './constants';
import { calculateDistributionEconomics } from './services/economics';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS_FSC);

  // Recalculate whenever inputs change
  const results = useMemo(() => calculateDistributionEconomics(inputs), [inputs]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-slate-900 text-white pt-6 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">NDC vs GDS Decision Assistant</h1>
          </div>
          <p className="text-slate-400 max-w-2xl ml-11 text-sm leading-relaxed">
            Quantitative distribution economics simulator for airline executives. Evaluate Total
            Cost of Distribution (TCD) versus Total Value of Offer (TVO).
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Inputs (Sticky on Desktop) */}
          <div className="xl:col-span-4">
            <div className="xl:sticky xl:top-6">
              <InputPanel inputs={inputs} setInputs={setInputs} />
            </div>
          </div>

          {/* Right Column: Results & Analysis */}
          <div className="xl:col-span-8 space-y-6">
            {/* 1. Results Dashboard (Charts & KPIs) */}
            <ResultsDashboard results={results} />

            {/* 2. Executive Summary (Deterministic Rule-Based Recommendation) */}
            <ExecutiveSummary results={results} />

            {/* 3. Assumptions Footer */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-slate-500 text-xs">
              <h4 className="font-bold uppercase tracking-wide mb-2 text-slate-400">
                Modeled Assumptions (Illustrative Benchmarks)
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <li>
                  • Average Ticket Value:{' '}
                  <span className="font-mono text-slate-700">${inputs.avgTicketValue}</span>
                </li>
                <li>
                  • Continuous Pricing Uplift:{' '}
                  <span className="font-mono text-slate-700">
                    +{inputs.continuousPricingUpliftPercent}%
                  </span>
                </li>
                <li>
                  • GDS Surcharge:{' '}
                  <span className="font-mono text-slate-700">${inputs.gdsSurcharge}</span>
                </li>
                <li>
                  • Ancillary Margin (reference only, not applied in top-line formula):{' '}
                  <span className="font-mono text-slate-700">~${inputs.ancillaryMargin}/sale</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center">
        <p className="text-slate-400 text-sm">
          Built by <span className="font-medium text-slate-600">Kumar Ravi Shankar</span>
        </p>
        <p className="text-slate-400 text-sm mt-1">
          Connect:{' '}
          <a
            href="https://curiouskumar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            curiouskumar.com
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;