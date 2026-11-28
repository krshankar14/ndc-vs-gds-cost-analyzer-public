import React, { useEffect, useMemo, useState } from 'react';
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_RECOMMENDATION_THRESHOLDS,
  createDefaultScenarios,
} from './constants';
import {
  EconomicInputs,
  RecommendationThresholds,
  ScenarioItem,
  WorkspaceTab,
} from './types';
import { calculateDistributionEconomics } from './services/economics';
import { generateExecutiveRecommendation } from './services/recommendations';
import { validateAndSanitizeInputs } from './services/validation';
import {
  clearSavedStorage,
  createScenario,
  duplicateScenario,
  isPersistenceEnabled,
  loadScenariosFromStorage,
  removeScenario,
  renameScenario,
  resetAllScenarios,
  saveScenariosToStorage,
  setPersistenceEnabled,
  updateScenarioInputs,
} from './services/scenarioService';
import { InputPanel } from './components/InputPanel';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { ScenarioComparison } from './components/ScenarioComparison';
import { SensitivityAnalysis } from './components/SensitivityAnalysis';
import { AssumptionsPanel } from './components/AssumptionsPanel';
import { Printer } from 'lucide-react';

const NAV_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'simulator', label: 'Simulator' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'assumptions', label: 'Assumptions' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('simulator');
  const [persistenceEnabled, setPersistenceEnabledState] = useState<boolean>(() =>
    isPersistenceEnabled()
  );
  const [scenarios, setScenarios] = useState<ScenarioItem[]>(() => {
    const saved = loadScenariosFromStorage();
    return saved ?? createDefaultScenarios();
  });
  const [activeScenarioId, setActiveScenarioId] = useState<string>(() => scenarios[1]?.id ?? scenarios[0].id);
  const [thresholds, setThresholds] = useState<RecommendationThresholds>(
    DEFAULT_RECOMMENDATION_THRESHOLDS
  );

  // Sync to localStorage only when user explicitly opted in
  useEffect(() => {
    if (persistenceEnabled) {
      saveScenariosToStorage(scenarios);
    }
  }, [scenarios, persistenceEnabled]);

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0],
    [scenarios, activeScenarioId]
  );

  const validation = useMemo(
    () => validateAndSanitizeInputs(activeScenario.inputs),
    [activeScenario.inputs]
  );

  const results = useMemo(
    () => calculateDistributionEconomics(activeScenario.inputs),
    [activeScenario.inputs]
  );

  const recommendation = useMemo(
    () => generateExecutiveRecommendation(activeScenario.inputs, results, validation, thresholds),
    [activeScenario.inputs, results, validation, thresholds]
  );

  const handleInputsChange = (nextInputs: EconomicInputs) => {
    setScenarios((prev) => updateScenarioInputs(prev, activeScenario.id, nextInputs));
  };

  const handleCreateScenario = () => {
    const next = createScenario(
      `Custom Scenario ${scenarios.length + 1}`,
      activeScenario.inputs,
      'Custom scenario cloned from current assumptions.'
    );
    setScenarios((prev) => [...prev, next]);
    setActiveScenarioId(next.id);
  };

  const handleDuplicateScenario = (id: string) => {
    const { scenarios: nextList, createdId } = duplicateScenario(scenarios, id);
    setScenarios(nextList);
    if (createdId) setActiveScenarioId(createdId);
  };

  const handleRenameScenario = (id: string, name: string) => {
    setScenarios((prev) => renameScenario(prev, id, name));
  };

  const handleDeleteScenario = (id: string) => {
    const { scenarios: nextList, nextActiveId } = removeScenario(scenarios, id);
    setScenarios(nextList);
    if (activeScenarioId === id) {
      setActiveScenarioId(nextActiveId);
    }
  };

  const handleResetScenarios = () => {
    const defaults = resetAllScenarios();
    setScenarios(defaults);
    setActiveScenarioId(defaults[1]?.id ?? defaults[0].id);
  };

  const handleImportScenario = (name: string, description: string, inputs: EconomicInputs) => {
    const imported = createScenario(name, inputs, description);
    setScenarios((prev) => [...prev.slice(0, 7), imported]);
    setActiveScenarioId(imported.id);
    setActiveTab('simulator');
  };

  const handleTogglePersistence = (enabled: boolean) => {
    setPersistenceEnabled(enabled);
    setPersistenceEnabledState(enabled);
    if (enabled) {
      saveScenariosToStorage(scenarios);
    }
  };

  const handleSaveNow = () => {
    saveScenariosToStorage(scenarios);
    setPersistenceEnabledState(true);
  };

  const handleClearSaved = () => {
    clearSavedStorage();
    setPersistenceEnabledState(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('simulator');
            }}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            {APP_NAME}
          </a>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {NAV_TABS.map((tab) => {
              const isCurrent = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    isCurrent
                      ? 'text-slate-900 border-blue-700 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <nav
          aria-label="Mobile sections"
          className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto"
        >
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Contextual Hero / Scenario Intro */}
      <div id="top" className="bg-slate-900 text-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
              Airline Distribution Economics Simulator
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Evaluate legacy GDS versus IATA NDC commercial arrangements across net surcharge recovery,
              contribution margin, blended migration share, Look-to-Book API traffic, transition OPEX,
              and cash-flow payback.
            </p>
          </div>
          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 font-mono tabular-nums">
            <span>Scenario: {activeScenario.name}</span>
            <span aria-hidden="true">·</span>
            <span>Version {APP_VERSION}</span>
            <span aria-hidden="true">·</span>
            <span>Illustrative Prototype</span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Sticky Assumptions Sidebar */}
          <div className="xl:col-span-4 xl:sticky xl:top-20 no-print">
            <InputPanel
              inputs={activeScenario.inputs}
              validation={validation}
              onChange={handleInputsChange}
              scenarioName={activeScenario.name}
            />
          </div>

          {/* Right Executive Workspace */}
          <div className="xl:col-span-8 space-y-6">
            {activeTab === 'simulator' && (
              <>
                <ResultsDashboard inputs={activeScenario.inputs} results={results} />
                <ExecutiveSummary
                  recommendation={recommendation}
                  thresholds={thresholds}
                  onThresholdsChange={setThresholds}
                />
              </>
            )}

            {activeTab === 'scenarios' && (
              <ScenarioComparison
                scenarios={scenarios}
                activeScenarioId={activeScenario.id}
                onSelectScenario={setActiveScenarioId}
                onCreateScenario={handleCreateScenario}
                onDuplicateScenario={handleDuplicateScenario}
                onRenameScenario={handleRenameScenario}
                onDeleteScenario={handleDeleteScenario}
                onResetScenarios={handleResetScenarios}
              />
            )}

            {activeTab === 'sensitivity' && (
              <SensitivityAnalysis inputs={activeScenario.inputs} />
            )}

            {activeTab === 'assumptions' && (
              <AssumptionsPanel
                activeScenario={activeScenario}
                results={results}
                recommendation={recommendation}
                persistenceEnabled={persistenceEnabled}
                onTogglePersistence={handleTogglePersistence}
                onSaveNow={handleSaveNow}
                onClearSaved={handleClearSaved}
                onImportScenario={handleImportScenario}
              />
            )}
          </div>
        </div>
      </main>

      {/* Subtle Author Attribution & Prototype Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <p>
            Independent airline distribution economics &amp; executive decision-support prototype ·
            Synthetic assumptions only (not an audited forecast).
          </p>
          <p className="whitespace-nowrap shrink-0">
            <span className="font-medium text-slate-700">Kumar Ravi Shankar</span> · Curious Kumar ·{' '}
            <a
              href="https://curiouskumar.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:underline font-medium"
            >
              curiouskumar.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;