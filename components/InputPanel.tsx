import React, { useState } from 'react';
import {
  DEFAULT_INPUTS_FSC,
  DEFAULT_INPUTS_LCC,
  INPUT_FIELD_SPECS,
  REGION_PRESETS,
} from '../constants';
import {
  AirlineType,
  EconomicInputs,
  InputMode,
  Region,
  SurchargeTreatment,
  ValidationSummary,
} from '../types';
import { HelpCircle, RotateCcw } from 'lucide-react';

interface Props {
  inputs: EconomicInputs;
  validation: ValidationSummary;
  onChange: (next: EconomicInputs) => void;
  scenarioName: string;
}

type NumericFieldKey = keyof typeof INPUT_FIELD_SPECS;

interface FieldControlProps {
  field: NumericFieldKey;
  value: number;
  onUpdate: (field: NumericFieldKey, val: number) => void;
  error?: string;
  asSlider?: boolean;
  disabled?: boolean;
}

const FieldControl: React.FC<FieldControlProps> = ({
  field,
  value,
  onUpdate,
  error,
  asSlider = false,
  disabled = false,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const spec = INPUT_FIELD_SPECS[field];
  const inputId = `input-${field}`;

  const handleNumberChange = (raw: string) => {
    if (raw === '' || raw === '-') return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      onUpdate(field, parsed);
    }
  };

  return (
    <div className={`space-y-1.5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-800 leading-snug">
          {spec.label}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-500 font-mono tabular-nums">{spec.unit}</span>
          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            aria-label={`Explain ${spec.label}`}
            aria-expanded={showHelp}
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showHelp && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5 leading-relaxed">
          {spec.tooltip}
        </p>
      )}

      {asSlider ? (
        <div className="flex items-center gap-3">
          <input
            id={inputId}
            type="range"
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={value}
            disabled={disabled}
            onChange={(e) => onUpdate(field, Number(e.target.value))}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
          />
          <input
            type="number"
            aria-label={`${spec.label} exact value`}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={value}
            disabled={disabled}
            onChange={(e) => handleNumberChange(e.target.value)}
            className="w-24 px-2.5 py-1.5 text-right text-sm font-mono tabular-nums border border-slate-300 rounded-md text-slate-900 bg-white"
          />
        </div>
      ) : (
        <input
          id={inputId}
          type="number"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          disabled={disabled}
          onChange={(e) => handleNumberChange(e.target.value)}
          className={`w-full px-3 py-2 text-sm font-mono tabular-nums border rounded-md text-slate-900 bg-white ${
            error ? 'border-rose-500' : 'border-slate-300'
          }`}
        />
      )}

      {error && (
        <p className="text-xs text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export const InputPanel: React.FC<Props> = ({ inputs, validation, onChange, scenarioName }) => {
  const [mode, setMode] = useState<InputMode>('basic');
  const [activeRegionNote, setActiveRegionNote] = useState<string | null>(null);

  const errorMap = new Map(validation.errors.map((e) => [e.field, e.message]));

  const updateField = <K extends keyof EconomicInputs>(field: K, value: EconomicInputs[K]) => {
    setActiveRegionNote(null);
    onChange({ ...inputs, [field]: value });
  };

  const handleCarrierPreset = (type: AirlineType) => {
    setActiveRegionNote(null);
    onChange(type === AirlineType.FSC ? { ...DEFAULT_INPUTS_FSC } : { ...DEFAULT_INPUTS_LCC });
  };

  const handleRegionPreset = (region: Region) => {
    const preset = REGION_PRESETS[region];
    setActiveRegionNote(`${preset.label}: ${preset.note}`);
    onChange({ ...inputs, ...preset.patch });
  };

  return (
    <aside
      aria-label="Simulation assumptions"
      className="bg-white rounded-xl border border-slate-200 p-5 space-y-6"
    >
      {/* Panel Header */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Commercial Assumptions</h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[220px]" title={scenarioName}>
            Active: {scenarioName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleCarrierPreset(inputs.airlineType)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Basic vs Advanced Mode Segmented Control */}
      <div
        role="tablist"
        aria-label="Parameter complexity mode"
        className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'basic'}
          onClick={() => setMode('basic')}
          className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            mode === 'basic'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Basic Inputs
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'advanced'}
          onClick={() => setMode('advanced')}
          className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            mode === 'advanced'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Advanced Model
        </button>
      </div>

      {/* Validation Warnings Banner */}
      {validation.warnings.length > 0 && (
        <div
          role="status"
          className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1"
        >
          <p className="font-semibold">Model Notices ({validation.warnings.length})</p>
          <ul className="space-y-1 list-disc list-inside">
            {validation.warnings.slice(0, 3).map((w, idx) => (
              <li key={idx}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Carrier Profile & Blended Volume */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">1. Carrier Profile & Volume</h3>
          <span className="text-xs text-slate-500">Synthetic presets</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleCarrierPreset(AirlineType.FSC)}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              inputs.airlineType === AirlineType.FSC
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            FSC Profile
          </button>
          <button
            type="button"
            onClick={() => handleCarrierPreset(AirlineType.LCC)}
            className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              inputs.airlineType === AirlineType.LCC
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            LCC Profile
          </button>
        </div>

        <FieldControl
          field="monthlyBookings"
          value={inputs.monthlyBookings}
          onUpdate={updateField}
          error={errorMap.get('monthlyBookings')}
        />
        <FieldControl
          field="ndcMigrationPercent"
          value={inputs.ndcMigrationPercent}
          onUpdate={updateField}
          error={errorMap.get('ndcMigrationPercent')}
          asSlider
        />
        <FieldControl
          field="avgTicketValue"
          value={inputs.avgTicketValue}
          onUpdate={updateField}
          error={errorMap.get('avgTicketValue')}
        />
        <FieldControl
          field="avgSegments"
          value={inputs.avgSegments}
          onUpdate={updateField}
          error={errorMap.get('avgSegments')}
        />
        {mode === 'advanced' && (
          <FieldControl
            field="ticketsPerBooking"
            value={inputs.ticketsPerBooking}
            onUpdate={updateField}
            error={errorMap.get('ticketsPerBooking')}
          />
        )}
      </section>

      <hr className="border-slate-200" />

      {/* 2. Legacy GDS Commercials */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">2. Legacy GDS Commercials</h3>
          <div className="flex items-center gap-1" aria-label="Illustrative regional presets">
            {Object.values(Region).map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => handleRegionPreset(region)}
                title={REGION_PRESETS[region].note}
                className="text-xs px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 hover:border-blue-600 hover:text-blue-700 transition-colors"
              >
                {region === Region.NA ? 'NA' : region === Region.EU ? 'EU' : 'APAC'}
              </button>
            ))}
          </div>
        </div>

        {activeRegionNote && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5">
            {activeRegionNote}
          </p>
        )}

        <FieldControl
          field="gdsCostPerSegment"
          value={inputs.gdsCostPerSegment}
          onUpdate={updateField}
          error={errorMap.get('gdsCostPerSegment')}
        />

        {/* Explicit Surcharge Treatment */}
        <div className="space-y-1.5">
          <label
            htmlFor="surcharge-treatment"
            className="block text-sm font-medium text-slate-800"
          >
            GDS Distribution Surcharge Treatment
          </label>
          <select
            id="surcharge-treatment"
            value={inputs.surchargeTreatment}
            onChange={(e) =>
              updateField('surchargeTreatment', e.target.value as SurchargeTreatment)
            }
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white text-slate-900"
          >
            <option value={SurchargeTreatment.NONE}>No surcharge</option>
            <option value={SurchargeTreatment.REVENUE_RECOVERY}>
              Airline revenue recovery (offsets GDS cost)
            </option>
            <option value={SurchargeTreatment.AIRLINE_EXPENSE}>
              Additional airline expense (adds to GDS cost)
            </option>
          </select>
          <p className="text-xs text-slate-500">
            Explicitly prevents double-counting the surcharge as both an expense and revenue recovery.
          </p>
        </div>

        {inputs.surchargeTreatment !== SurchargeTreatment.NONE && (
          <FieldControl
            field="gdsSurchargePerTicket"
            value={inputs.gdsSurchargePerTicket}
            onUpdate={updateField}
            error={errorMap.get('gdsSurchargePerTicket')}
          />
        )}

        {inputs.surchargeTreatment === SurchargeTreatment.REVENUE_RECOVERY && (
          <FieldControl
            field="surchargeRecoveryPercent"
            value={inputs.surchargeRecoveryPercent}
            onUpdate={updateField}
            error={errorMap.get('surchargeRecoveryPercent')}
            asSlider
          />
        )}

        {mode === 'advanced' && (
          <div className="space-y-4 pt-2">
            <FieldControl
              field="gdsAdditionalTransactionFee"
              value={inputs.gdsAdditionalTransactionFee}
              onUpdate={updateField}
              error={errorMap.get('gdsAdditionalTransactionFee')}
            />
            <FieldControl
              field="agencyIncentivePerBooking"
              value={inputs.agencyIncentivePerBooking}
              onUpdate={updateField}
              error={errorMap.get('agencyIncentivePerBooking')}
            />
            <FieldControl
              field="commercialRebatePerBooking"
              value={inputs.commercialRebatePerBooking}
              onUpdate={updateField}
              error={errorMap.get('commercialRebatePerBooking')}
            />
            <FieldControl
              field="gdsOtherServicingCost"
              value={inputs.gdsOtherServicingCost}
              onUpdate={updateField}
              error={errorMap.get('gdsOtherServicingCost')}
            />
          </div>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* 3. NDC Channel & Look-to-Book Costs */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">3. NDC Costs & Look-to-Book</h3>

        <FieldControl
          field="ndcCostPerBooking"
          value={inputs.ndcCostPerBooking}
          onUpdate={updateField}
          error={errorMap.get('ndcCostPerBooking')}
          asSlider
        />

        {mode === 'advanced' && (
          <>
            <FieldControl
              field="ndcServicingCostPerBooking"
              value={inputs.ndcServicingCostPerBooking}
              onUpdate={updateField}
              error={errorMap.get('ndcServicingCostPerBooking')}
            />

            <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={inputs.shoppingCostsIncludedInBase}
                onChange={(e) => updateField('shoppingCostsIncludedInBase', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-700"
              />
              <span>
                <span className="font-medium block">Shopping API costs included in base NDC fee</span>
                <span className="text-xs text-slate-500">
                  Check to zero out separate Look-to-Book fees and avoid double-counting.
                </span>
              </span>
            </label>

            <FieldControl
              field="lookToBookRatio"
              value={inputs.lookToBookRatio}
              onUpdate={updateField}
              error={errorMap.get('lookToBookRatio')}
              disabled={inputs.shoppingCostsIncludedInBase}
            />
            <FieldControl
              field="includedShoppingRequestsPerBooking"
              value={inputs.includedShoppingRequestsPerBooking}
              onUpdate={updateField}
              error={errorMap.get('includedShoppingRequestsPerBooking')}
              disabled={inputs.shoppingCostsIncludedInBase}
            />
            <FieldControl
              field="ndcShoppingTrafficSharePercent"
              value={inputs.ndcShoppingTrafficSharePercent}
              onUpdate={updateField}
              error={errorMap.get('ndcShoppingTrafficSharePercent')}
              disabled={inputs.shoppingCostsIncludedInBase}
            />
            <FieldControl
              field="shoppingApiCostPerRequest"
              value={inputs.shoppingApiCostPerRequest}
              onUpdate={updateField}
              error={errorMap.get('shoppingApiCostPerRequest')}
              disabled={inputs.shoppingCostsIncludedInBase}
            />
          </>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* 4. Value Creation & Contribution Margins */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          4. Offer Value & Contribution Margins
        </h3>

        <FieldControl
          field="ancillaryUpliftPercent"
          value={inputs.ancillaryUpliftPercent}
          onUpdate={updateField}
          error={errorMap.get('ancillaryUpliftPercent')}
          asSlider
        />
        <FieldControl
          field="ancillaryContributionMarginPercent"
          value={inputs.ancillaryContributionMarginPercent}
          onUpdate={updateField}
          error={errorMap.get('ancillaryContributionMarginPercent')}
          asSlider
        />
        <FieldControl
          field="continuousPricingUpliftPercent"
          value={inputs.continuousPricingUpliftPercent}
          onUpdate={updateField}
          error={errorMap.get('continuousPricingUpliftPercent')}
          asSlider
        />
        {mode === 'advanced' && (
          <FieldControl
            field="pricingContributionMarginPercent"
            value={inputs.pricingContributionMarginPercent}
            onUpdate={updateField}
            error={errorMap.get('pricingContributionMarginPercent')}
            asSlider
          />
        )}
      </section>

      <hr className="border-slate-200" />

      {/* 5. CAPEX, Fixed OPEX & Transition */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">5. CAPEX, OPEX & Transition</h3>

        <FieldControl
          field="oneTimeImplementationCapex"
          value={inputs.oneTimeImplementationCapex}
          onUpdate={updateField}
          error={errorMap.get('oneTimeImplementationCapex')}
        />
        <FieldControl
          field="incrementalMonthlyFixedOpex"
          value={inputs.incrementalMonthlyFixedOpex}
          onUpdate={updateField}
          error={errorMap.get('incrementalMonthlyFixedOpex')}
        />

        {mode === 'advanced' && (
          <>
            <FieldControl
              field="monthlyTransitionExpense"
              value={inputs.monthlyTransitionExpense}
              onUpdate={updateField}
              error={errorMap.get('monthlyTransitionExpense')}
            />
            <FieldControl
              field="transitionDurationMonths"
              value={inputs.transitionDurationMonths}
              onUpdate={updateField}
              error={errorMap.get('transitionDurationMonths')}
            />
            <FieldControl
              field="capexAllocationMonths"
              value={inputs.capexAllocationMonths}
              onUpdate={updateField}
              error={errorMap.get('capexAllocationMonths')}
            />
          </>
        )}
      </section>
    </aside>
  );
};
