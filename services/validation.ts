import { DEFAULT_INPUTS_FSC, INPUT_FIELD_SPECS } from '../constants';
import {
  AirlineType,
  EconomicInputs,
  SurchargeTreatment,
  ValidationIssue,
  ValidationSummary,
} from '../types';

const VALID_AIRLINE_TYPES = new Set<string>(Object.values(AirlineType));
const VALID_SURCHARGE_TREATMENTS = new Set<string>(Object.values(SurchargeTreatment));

const NUMERIC_FIELDS = Object.keys(INPUT_FIELD_SPECS) as Array<keyof typeof INPUT_FIELD_SPECS>;

const isSafePlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const clampNumber = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

export const validateAndSanitizeInputs = (raw: Partial<EconomicInputs>): ValidationSummary => {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const sanitized: EconomicInputs = { ...DEFAULT_INPUTS_FSC };

  // Enum validations
  if (raw.airlineType !== undefined && VALID_AIRLINE_TYPES.has(raw.airlineType)) {
    sanitized.airlineType = raw.airlineType;
  } else if (raw.airlineType !== undefined) {
    errors.push({
      field: 'airlineType',
      severity: 'error',
      message: 'Airline profile must be Full-Service Carrier or Low-Cost Carrier.',
    });
  }

  if (
    raw.surchargeTreatment !== undefined &&
    VALID_SURCHARGE_TREATMENTS.has(raw.surchargeTreatment)
  ) {
    sanitized.surchargeTreatment = raw.surchargeTreatment;
  } else if (raw.surchargeTreatment !== undefined) {
    errors.push({
      field: 'surchargeTreatment',
      severity: 'error',
      message: 'Surcharge treatment must be None, Airline Expense, or Airline Revenue Recovery.',
    });
  }

  if (typeof raw.shoppingCostsIncludedInBase === 'boolean') {
    sanitized.shoppingCostsIncludedInBase = raw.shoppingCostsIncludedInBase;
  }

  // Numeric field validations
  for (const field of NUMERIC_FIELDS) {
    const spec = INPUT_FIELD_SPECS[field];
    const value = raw[field];

    if (value === undefined) {
      continue;
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push({
        field,
        severity: 'error',
        message: `${spec.label} must be a valid finite number.`,
      });
      sanitized[field] = DEFAULT_INPUTS_FSC[field];
      continue;
    }

    if (value < spec.min || value > spec.max) {
      errors.push({
        field,
        severity: 'error',
        message: `${spec.label} must be between ${spec.min} and ${spec.max} (${spec.unit}).`,
      });
      sanitized[field] = clampNumber(value, spec.min, spec.max);
      continue;
    }

    sanitized[field] = value;
  }

  // Commercial sanity warnings (non-blocking)
  if (sanitized.monthlyBookings === 0) {
    warnings.push({
      field: 'monthlyBookings',
      severity: 'warning',
      message: 'Eligible monthly bookings is 0. Variable distribution costs and incremental revenue are zero.',
    });
  }

  if (sanitized.ndcMigrationPercent === 0 && sanitized.monthlyBookings > 0) {
    warnings.push({
      field: 'ndcMigrationPercent',
      severity: 'warning',
      message: 'NDC migration share is 0%. Only fixed OPEX or transition expenses affect net impact.',
    });
  }

  if (
    sanitized.surchargeTreatment === SurchargeTreatment.REVENUE_RECOVERY &&
    sanitized.gdsSurchargePerTicket > 0 &&
    sanitized.surchargeRecoveryPercent === 0
  ) {
    warnings.push({
      field: 'surchargeRecoveryPercent',
      severity: 'warning',
      message: 'Surcharge is set to Airline Revenue Recovery with 0% retention, resulting in $0 recovered.',
    });
  }

  if (
    sanitized.surchargeTreatment === SurchargeTreatment.NONE &&
    sanitized.gdsSurchargePerTicket > 0
  ) {
    warnings.push({
      field: 'surchargeTreatment',
      severity: 'warning',
      message: 'Surcharge treatment is set to None, so the entered surcharge amount is excluded from calculations.',
    });
  }

  if (
    !sanitized.shoppingCostsIncludedInBase &&
    sanitized.lookToBookRatio > 5000
  ) {
    warnings.push({
      field: 'lookToBookRatio',
      severity: 'warning',
      message: 'Very high Look-to-Book ratio (>5,000:1). Validate caching strategy and marginal API cost assumptions.',
    });
  }

  if (
    sanitized.ancillaryUpliftPercent > 0 &&
    sanitized.ancillaryContributionMarginPercent === 0
  ) {
    warnings.push({
      field: 'ancillaryContributionMarginPercent',
      severity: 'warning',
      message: 'Ancillary contribution margin is 0%. Incremental ancillary revenue generates $0 contribution.',
    });
  }

  if (sanitized.ancillaryUpliftPercent < 0 || sanitized.continuousPricingUpliftPercent < 0) {
    warnings.push({
      field: 'ancillaryUpliftPercent',
      severity: 'warning',
      message: 'Modeling a negative revenue uplift assumption (downside commercial stress test).',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedInputs: sanitized,
  };
};

export interface ImportedScenarioValidationResult {
  valid: boolean;
  error?: string;
  scenarioName?: string;
  scenarioDescription?: string;
  inputs?: EconomicInputs;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const containsForbiddenKey = (obj: unknown, depth = 0): boolean => {
  if (depth > 6 || typeof obj !== 'object' || obj === null) return false;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
    const val = (obj as Record<string, unknown>)[key];
    if (typeof val === 'object' && val !== null && containsForbiddenKey(val, depth + 1)) {
      return true;
    }
  }
  return false;
};

export const validateImportedScenarioJson = (rawText: string): ImportedScenarioValidationResult => {
  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    return { valid: false, error: 'Import file is empty.' };
  }

  if (rawText.length > 250_000) {
    return { valid: false, error: 'Import file exceeds the maximum allowed size (250 KB).' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { valid: false, error: 'Invalid JSON syntax. Please select a valid exported scenario file.' };
  }

  if (!isSafePlainObject(parsed) || containsForbiddenKey(parsed)) {
    return { valid: false, error: 'Unsupported or unsafe JSON structure.' };
  }

  const candidateInputs = isSafePlainObject(parsed.inputs) ? parsed.inputs : parsed;
  if (!isSafePlainObject(candidateInputs)) {
    return { valid: false, error: 'JSON file does not contain a valid inputs object.' };
  }

  // Require at least one known numeric input field to confirm this is a simulator payload
  const hasKnownKey = NUMERIC_FIELDS.some((field) => field in candidateInputs);
  if (!hasKnownKey) {
    return {
      valid: false,
      error: 'JSON file does not match the NDC vs GDS simulator schema.',
    };
  }

  const validation = validateAndSanitizeInputs(candidateInputs as Partial<EconomicInputs>);
  if (!validation.isValid) {
    return {
      valid: false,
      error: `Invalid assumption values: ${validation.errors[0].message}`,
    };
  }

  const scenarioName =
    typeof parsed.scenarioName === 'string' && parsed.scenarioName.trim().length > 0
      ? parsed.scenarioName.trim().slice(0, 80)
      : 'Imported Scenario';

  const scenarioDescription =
    typeof parsed.scenarioDescription === 'string'
      ? parsed.scenarioDescription.trim().slice(0, 240)
      : 'Imported from JSON file.';

  return {
    valid: true,
    scenarioName,
    scenarioDescription,
    inputs: validation.sanitizedInputs,
  };
};
