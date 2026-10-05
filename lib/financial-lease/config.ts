import { configuredRate } from "./business";

const DEFAULT_INDICATIVE_RATE_BPS = 850;

export function leaseRate(): number {
  return configuredRate(process.env.FINANCIAL_LEASE_ANNUAL_RATE_BPS) ?? DEFAULT_INDICATIVE_RATE_BPS;
}
