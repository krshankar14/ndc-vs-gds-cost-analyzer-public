import React from 'react';
import { AirlineType, EconomicInputs, GDSCostLevel, GDSSurcharge, Region } from '../types';
import { REGION_PRESETS, DEFAULT_INPUTS_FSC, DEFAULT_INPUTS_LCC } from '../constants';
import { Settings2, RotateCcw, Plane } from 'lucide-react';

interface Props {
  inputs: EconomicInputs;
  setInputs: React.Dispatch<React.SetStateAction<EconomicInputs>>;
}

export const InputPanel: React.FC<Props> = ({ inputs, setInputs }) => {
  const updateField = <K extends keyof EconomicInputs>(field: K, value: EconomicInputs[K]) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleAirlineTypeChange = (type: AirlineType) => {
    const defaults = type === AirlineType.FSC ? DEFAULT_INPUTS_FSC : DEFAULT_INPUTS_LCC;
    setInputs(defaults);
  };

  const applyRegion = (region: Region) => {
    const preset = REGION_PRESETS[region];
    setInputs((prev) => ({ ...prev, ...preset }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Simulation Parameters
        </h2>
        <button
          onClick={() => handleAirlineTypeChange(inputs.airlineType)}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* 1. Airline Profile */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          Airline Profile
        </label>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => handleAirlineTypeChange(AirlineType.FSC)}
            className={`py-2 px-3 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 transition-colors ${
              inputs.airlineType === AirlineType.FSC
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Plane className="w-4 h-4" /> FSC
          </button>
          <button
            onClick={() => handleAirlineTypeChange(AirlineType.LCC)}
            className={`py-2 px-3 text-sm font-medium rounded-lg border flex items-center justify-center gap-2 transition-colors ${
              inputs.airlineType === AirlineType.LCC
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Plane className="w-4 h-4" /> LCC
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Monthly Indirect Bookings
          </label>
          <input
            type="number"
            min="0"
            value={inputs.monthlyBookings}
            onChange={(e) => updateField('monthlyBookings', Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Avg Segments per Booking
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={inputs.avgSegments}
            onChange={(e) => updateField('avgSegments', Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900"
          />
        </div>
      </div>

      {/* 2. GDS Economics */}
      <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
            GDS Commercials
          </label>
          <div className="flex gap-1">
            {Object.values(Region).map((r) => (
              <button
                key={r}
                onClick={() => applyRegion(r)}
                className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded hover:border-blue-300 text-slate-600"
                title={`Apply ${r} Presets`}
              >
                {r === Region.NA ? 'NA' : r === Region.EU ? 'EU' : 'APAC'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            GDS Cost per Segment
          </label>
          <select
            value={inputs.gdsCostPerSegment}
            onChange={(e) => updateField('gdsCostPerSegment', Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
          >
            <option value={GDSCostLevel.LOW}>Low ($4.00)</option>
            <option value={GDSCostLevel.MEDIUM}>Medium ($6.00)</option>
            <option value={GDSCostLevel.HIGH}>High ($8.00)</option>
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            GDS Surcharge (DTC) per Booking
          </label>
          <select
            value={inputs.gdsSurcharge}
            onChange={(e) => updateField('gdsSurcharge', Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-slate-900"
          >
            <option value={GDSSurcharge.NONE}>None ($0)</option>
            <option value={GDSSurcharge.LOW}>Low ($15)</option>
            <option value={GDSSurcharge.MEDIUM}>Medium ($18)</option>
            <option value={GDSSurcharge.HIGH}>High ($21)</option>
            <option value={GDSSurcharge.ULTRA}>Ultra ($25)</option>
          </select>
        </div>
      </div>

      {/* 3. NDC & Value Economics */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
          NDC Value Drivers
        </label>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Est. NDC Cost per Booking
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1.00"
              max="15.00"
              step="0.50"
              value={inputs.ndcCostPerBooking}
              onChange={(e) => updateField('ndcCostPerBooking', Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-sm font-mono font-medium text-slate-900 w-16 text-right">
              ${inputs.ndcCostPerBooking.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Benchmark: $2.00 – $9.00 (IT + Aggregation)</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Ancillary Uplift Assumption
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={inputs.ancillaryUpliftPercent}
              onChange={(e) => updateField('ancillaryUpliftPercent', Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <span className="text-sm font-mono font-medium text-slate-900 w-16 text-right">
              {inputs.ancillaryUpliftPercent.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">FSC Range: 3% - 8% | LCC Range: 0% - 2%</p>
        </div>

        <div className="mb-4 opacity-75">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Continuous Pricing Uplift (Fixed)
          </label>
          <div className="px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-500 font-mono text-sm">
            +{inputs.continuousPricingUpliftPercent.toFixed(1)}% Revenue
          </div>
        </div>
      </div>
    </div>
  );
};
