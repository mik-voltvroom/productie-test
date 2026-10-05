import { z } from "zod";

export const leaseTerms = [36, 48, 60, 72] as const;
const cents = z.number().int().min(0).max(100_000_000);

export const leaseSelectionSchema = z.object({
  termMonths: z.union([z.literal(36), z.literal(48), z.literal(60), z.literal(72)]),
  downPaymentCents: cents,
  balloonCents: cents,
});

export type LeaseSelection = z.infer<typeof leaseSelectionSchema>;
export type LeaseQuote = LeaseSelection & {
  priceCents: number;
  principalCents: number;
  monthlyCents: number;
  finalMonthlyCents: number;
  totalCents: number;
  interestCents: number;
  annualRateBps: number;
  calculationVersion: "annuity-v1";
};

export const defaultSelection: LeaseSelection = { termMonths: 60, downPaymentCents: 0, balloonCents: 0 };

export function eligibleForLease(vehicle: { status: string; priceCents: number }): boolean {
  return vehicle.status === "available"
    && Number.isSafeInteger(vehicle.priceCents)
    && vehicle.priceCents > 0
    && vehicle.priceCents <= 100_000_000;
}

export function calculateLease(priceCents: number, selection: LeaseSelection, annualRateBps: number): LeaseQuote {
  cents.positive().parse(priceCents);
  leaseSelectionSchema.parse(selection);
  z.number().int().min(0).max(3000).parse(annualRateBps);

  const principalCents = priceCents - selection.downPaymentCents;
  if (principalCents <= 0 || selection.balloonCents >= principalCents || selection.balloonCents > priceCents * 0.5) {
    throw new Error("Aanbetaling moet lager zijn dan de verkoopprijs. De slottermijn is maximaal 50% van de verkoopprijs en lager dan de financiering.");
  }

  const monthlyRate = annualRateBps / 10_000 / 12;
  const factor = Math.pow(1 + monthlyRate, selection.termMonths);
  const monthlyCents = Math.round(monthlyRate === 0
    ? (principalCents - selection.balloonCents) / selection.termMonths
    : (principalCents * factor - selection.balloonCents) * monthlyRate / (factor - 1));

  let remaining = principalCents;
  for (let month = 1; month < selection.termMonths; month++) {
    remaining = remaining * (1 + monthlyRate) - monthlyCents;
  }
  const finalMonthlyCents = Math.round(remaining * (1 + monthlyRate) - selection.balloonCents);
  if (monthlyCents <= 0 || finalMonthlyCents <= 0) {
    throw new Error("Het financieringsbedrag is te klein voor deze looptijd. Verlaag de aanbetaling of slottermijn.");
  }

  const totalCents = selection.downPaymentCents
    + monthlyCents * (selection.termMonths - 1)
    + finalMonthlyCents
    + selection.balloonCents;

  return {
    ...selection,
    priceCents,
    principalCents,
    monthlyCents,
    finalMonthlyCents,
    totalCents,
    interestCents: totalCents - priceCents,
    annualRateBps,
    calculationVersion: "annuity-v1",
  };
}
