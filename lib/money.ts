export function assertEurocents(value: number, field = "amountCents"): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} moet een niet-negatief geheel aantal eurocenten zijn.`);
  }
  return value;
}

export function centsToEuros(value: number): number {
  return assertEurocents(value) / 100;
}

export function assertSignedEurocents(value: number, field = "amountCents"): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${field} moet een geheel aantal eurocenten zijn.`);
  }
  return value;
}

export function signedCentsToEuros(value: number): number {
  return assertSignedEurocents(value) / 100;
}

export function eurosToCents(value: number, field = "amountEur"): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} moet een niet-negatief eindig eurobedrag zijn.`);
  }
  return assertEurocents(Math.round(value * 100), field.replace(/Eur$/, "Cents"));
}

export function signedEurosToCents(value: number, field = "amountEur"): number {
  if (!Number.isFinite(value)) throw new Error(`${field} moet een eindig eurobedrag zijn.`);
  return assertSignedEurocents(Math.round(value * 100), field.replace(/Eur$/, "Cents"));
}
