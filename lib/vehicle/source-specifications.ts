/** Existing XML names from lib/public-vehicles.ts; no inferred unit conversion. */
export const numericSourceSpecs = {
  powerHp: { fields: ["vermogen_motor_pk", "vermogen_pk"], label: "Vermogen", unit: "pk" },
  powerKw: { fields: ["vermogen_motor_kw", "vermogen_kw"], label: "Vermogen", unit: "kW" },
  engineCapacityCc: { fields: ["cilinder_inhoud", "cilinderinhoud"], label: "Cilinderinhoud", unit: "cm³" },
  doors: { fields: ["aantal_deuren"], label: "Deuren", unit: "" },
  seats: { fields: ["aantal_zitplaatsen"], label: "Zitplaatsen", unit: "" },
  weightKg: { fields: ["massa"], label: "Massa (aangeleverd)", unit: "kg" },
  towWeightBrakedKg: { fields: ["max_trekgewicht"], label: "Maximaal trekgewicht (aangeleverd)", unit: "kg" },
  topSpeedKph: { fields: ["topsnelheid"], label: "Topsnelheid (opgave)", unit: "km/h" },
  accelerationSeconds: { fields: ["acceleratie"], label: "Acceleratie (aangeleverd)", unit: "s" },
  co2GKm: { fields: ["co2_uitstoot"], label: "CO₂-uitstoot (opgave)", unit: "g/km" },
  electricPowerKw: { fields: ["vermogen_elektrisch_kw"], label: "Elektrisch vermogen", unit: "kW" },
  electricPowerHp: { fields: ["vermogen_elektrisch_pk"], label: "Elektrisch vermogen", unit: "pk" },
  chargingPowerKw: { fields: ["accu_laadvermogen"], label: "Laadvermogen (aangeleverd)", unit: "kW" },
} as const;
export const textSourceSpecs = {
  firstRegistrationDate: { fields: ["datum_deel_1"], label: "Eerste registratie" },
  vatMargin: { fields: ["btw_marge"], label: "BTW/marge (aangeleverd)" },
  apkUntil: { fields: ["apk_tot"], label: "APK tot" },
  energyLabel: { fields: ["energielabel"], label: "Energielabel" },
  hybridType: { fields: ["type_hybride"], label: "Hybridesysteem (aangeleverd)" },
  connector: { fields: ["stekkeraansluiting"], label: "Stekkeraansluiting" },
} as const;
export type SourceSpecifications = Partial<Record<keyof typeof numericSourceSpecs, number>> &
  Partial<Record<keyof typeof textSourceSpecs, string>> & { fastChargingSupported?: boolean };
export const sourceSpecificationKeys = [...Object.keys(numericSourceSpecs), ...Object.keys(textSourceSpecs), "fastChargingSupported"] as (keyof SourceSpecifications)[];
