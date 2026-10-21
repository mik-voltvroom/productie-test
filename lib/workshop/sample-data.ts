import type { Technician, WarrantyClaim, WorkOrder } from "@/types";

const now = new Date();
const day = (offset: number, hour: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const technicians: Technician[] = [
  { id: "tech-milan", name: "Milan", role: "workshop_manager", skills: ["hybride diagnose", "APK", "elektra"], hourlyCostEur: 42, active: true },
  { id: "tech-joost", name: "Joost", role: "technician", skills: ["onderhoud", "remmen", "onderstel"], hourlyCostEur: 36, active: true },
  { id: "tech-noa", name: "Noa", role: "detailer", skills: ["interieur", "lakcorrectie", "aflevercontrole"], hourlyCostEur: 31, active: true }
];

const inspection = [
  ["Hybride systeem", "Accu SOH en foutcodes"], ["Motor", "Oliepeil en lekkage"], ["Remmen", "Blokken en schijven voor"],
  ["Banden", "Profiel en spanning"], ["Verlichting", "Volledige functiecontrole"], ["Interieur", "Infotainment en airco"],
  ["Carrosserie", "Schade- en lakcontrole"], ["Documenten", "Onderhoudshistorie aanwezig"]
].map(([section, label], i) => ({ id: `insp-${i}`, section, label, result: i < 3 ? "ok" as const : "not_checked" as const }));

export const workOrders: WorkOrder[] = [
  {
    id: "wo-1008", number: "WO-2026-1008", vehicleId: "VV-2026-001", dealId: "DEAL-0042", customerName: "Sanne de Boer", customerPhone: "0612345678",
    licensePlate: "N-123-VV", vehicleLabel: "Toyota Corolla Touring Sports 1.8 Hybrid", mileageKm: 68420, type: "delivery", status: "in_progress", priority: "high",
    plannedStartAt: day(0, 8), promisedAt: day(1, 14), complaint: "Afleverbeurt en volledige hybride controle", diagnosis: "Geen actieve storingen. Voorbanden naderen adviesgrens.", customerApproval: "not_required",
    tasks: [
      { id: "task-1", workOrderId: "wo-1008", category: "maintenance", title: "Onderhoudsbeurt uitvoeren", status: "in_progress", technicianId: "tech-joost", estimatedMinutes: 90, actualMinutes: 35, required: true },
      { id: "task-2", workOrderId: "wo-1008", category: "battery", title: "Hybride accutest en rapport", status: "done", technicianId: "tech-milan", estimatedMinutes: 45, actualMinutes: 41, required: true },
      { id: "task-3", workOrderId: "wo-1008", category: "cleaning", title: "Premium interieur- en exterieurreiniging", status: "todo", technicianId: "tech-noa", estimatedMinutes: 150, actualMinutes: 0, required: true },
      { id: "task-4", workOrderId: "wo-1008", category: "quality", title: "Eindcontrole en proefrit", status: "todo", estimatedMinutes: 30, actualMinutes: 0, required: true }
    ],
    parts: [{ id: "part-1", workOrderId: "wo-1008", sku: "0W20-OIL", description: "Motorolie 0W20", quantity: 4.2, purchasePriceEur: 9.5, salePriceEur: 18.5, supplier: "Fource", ordered: true, received: true }],
    inspection, timeEntries: [{ id: "time-1", workOrderId: "wo-1008", technicianId: "tech-milan", startedAt: day(0, 8), endedAt: day(0, 9), minutes: 41, description: "Accutest en diagnose" }],
    createdAt: day(-2, 10), updatedAt: day(0, 10)
  },
  {
    id: "wo-1009", number: "WO-2026-1009", customerName: "Peter Jansen", licensePlate: "X-456-KL", vehicleLabel: "Kia Niro 1.6 GDi Hybrid", mileageKm: 91210,
    type: "customer_maintenance", status: "waiting_approval", priority: "normal", plannedStartAt: day(0, 10), promisedAt: day(0, 17), complaint: "Groot onderhoud en geluid linksvoor",
    diagnosis: "Wiellager linksvoor hoorbaar. Remschijven achter verroest.", customerApproval: "pending",
    tasks: [{ id: "task-5", workOrderId: "wo-1009", category: "inspection", title: "Diagnose geluid linksvoor", status: "done", technicianId: "tech-milan", estimatedMinutes: 45, actualMinutes: 38, required: true }],
    parts: [{ id: "part-2", workOrderId: "wo-1009", description: "Wiellager linksvoor", quantity: 1, purchasePriceEur: 84, salePriceEur: 169, supplier: "Fource", ordered: false, received: false }],
    inspection: [], timeEntries: [], createdAt: day(-1, 15), updatedAt: day(0, 11)
  },
  {
    id: "wo-1010", number: "WO-2026-1010", customerName: "Voorraad", vehicleLabel: "Lexus UX 250h Luxury Line", mileageKm: 52300, type: "stock_preparation", status: "planned", priority: "normal",
    plannedStartAt: day(1, 8), complaint: "Inkoopinspectie en verkoopklaar maken", customerApproval: "not_required", tasks: [], parts: [], inspection: [], timeEntries: [], createdAt: day(0, 12), updatedAt: day(0, 12)
  }
];

export const warrantyClaims: WarrantyClaim[] = [
  { id: "claim-44", claimNumber: "GAR-2026-0044", workOrderId: "wo-1009", customerName: "Peter Jansen", vehicleLabel: "Kia Niro 1.6 GDi Hybrid", licensePlate: "X-456-KL", reportedAt: day(-1, 13), complaint: "Bonkend geluid en trilling", diagnosis: "Wiellager linksvoor defect", status: "assessment", estimatedCostEur: 438, approvedAmountEur: 0, customerContributionEur: 0, supplierContributionEur: 0, internalCostEur: 122 },
  { id: "claim-39", claimNumber: "GAR-2026-0039", customerName: "M. Visser", vehicleLabel: "Toyota C-HR 2.0 Hybrid", licensePlate: "P-908-ZR", reportedAt: day(-8, 9), complaint: "12V-accu loopt leeg", diagnosis: "Accu defect, geen parasitaire verbruiker", status: "completed", coverageDecision: "Volledig onder Volt Care Plus", estimatedCostEur: 249, approvedAmountEur: 249, customerContributionEur: 0, supplierContributionEur: 0, internalCostEur: 118 }
];
