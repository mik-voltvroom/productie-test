import { normalizeLicensePlate } from "@/lib/inruil/validation";

const RDW_DATASET_URL = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";

type RdwRow = {
  kenteken?: string;
  merk?: string;
  handelsbenaming?: string;
  datum_eerste_toelating?: string;
  voertuigsoort?: string;
  eerste_kleur?: string;
};

export type RdwVehicle = {
  licensePlate: string;
  brand: string;
  model: string;
  year?: number;
  vehicleType?: string;
  color?: string;
};

export class RdwUnavailableError extends Error {
  constructor() {
    super("RDW is tijdelijk niet beschikbaar.");
  }
}

function yearFromRdwDate(value?: string): number | undefined {
  const year = Number(value?.slice(0, 4));
  return Number.isInteger(year) && year >= 1900 ? year : undefined;
}

export async function lookupRdwVehicle(value: string): Promise<RdwVehicle | null> {
  const licensePlate = normalizeLicensePlate(value);
  const query = new URLSearchParams({
    kenteken: licensePlate,
    "$select": "kenteken,merk,handelsbenaming,datum_eerste_toelating,voertuigsoort,eerste_kleur",
    "$limit": "1",
  });

  let response: Response;
  try {
    response = await fetch(RDW_DATASET_URL + "?" + query.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
  } catch {
    throw new RdwUnavailableError();
  }

  if (!response.ok) throw new RdwUnavailableError();

  const rows = await response.json().catch(() => null) as RdwRow[] | null;
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row?.merk || !row.handelsbenaming) return null;

  return {
    licensePlate,
    brand: row.merk,
    model: row.handelsbenaming,
    year: yearFromRdwDate(row.datum_eerste_toelating),
    vehicleType: row.voertuigsoort,
    color: row.eerste_kleur,
  };
}
