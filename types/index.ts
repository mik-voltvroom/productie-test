export type DriveType = "full-hybrid" | "plug-in-hybrid" | "electric" | "combustion";
export type VehicleStatus = "draft" | "photography" | "review" | "available" | "reserved" | "sold" | "archived";
export type PublishChannel = "website" | "merchant" | "google_ads" | "meta";

export interface VehicleCosts {
  purchasePriceCents: number;
  transportCents: number;
  preparationCents: number;
  maintenanceCents: number;
  warrantyReserveCents: number;
  advertisingCents: number;
  financingCents: number;
  otherCents: number;
}

export interface VehiclePublication {
  channels: Record<PublishChannel, boolean>;
  completenessPercent: number;
  lastValidatedAt?: string;
  validationErrors: string[];
}

export type VehiclePriceChangeSource = "mobilox-hexon" | "manual" | "deal" | "migration";

export interface VehiclePriceHistoryEntry {
  priceCents: number;
  effectiveAt: string;
  source: VehiclePriceChangeSource;
}

export interface VehicleCommercial {
  acquisitionSource?: string;
  acquiredAt?: string;
  stockEnteredAt?: string;
  targetMarginCents: number;
  maxStockDays: number;
  viewCount: number;
  leadCount: number;
  priceHistory: VehiclePriceHistoryEntry[];
  soldPriceCents?: number;
}

export interface VehicleSource {
  provider: string;
  externalId?: string;
  lastMutationAt?: string;
  imageStorage?: string;
  imageFailures?: number;
}

export interface Vehicle {
  id: string;
  slug: string;
  brand: string;
  model: string;
  trim: string;
  year: number;
  mileageKm: number;
  priceCents: number;
  monthlyPriceCents?: number;
  driveType: DriveType;
  fuelType: string;
  transmission: string;
  bodyStyle: string;
  color: string;
  batteryHealthPercent?: number;
  electricRangeKm?: number;
  consumptionPer100Km?: number;
  annualSavingCents?: number;
  warrantyMonths?: number;
  maintenanceHistory: "complete" | "partial" | "unknown";
  vin?: string;
  licensePlate?: string;
  images: string[];
  highlights: string[];
  description?: string;
  status: VehicleStatus;
  reservedDealId?: string;
  reservedAt?: string;
  soldDealId?: string;
  soldAt?: string;
  locationCode: string;
  costs?: VehicleCosts;
  commercial?: VehicleCommercial;
  publication?: VehiclePublication;
  source?: VehicleSource;
  createdAt?: string;
  updatedAt: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "appointment" | "won" | "lost";
export interface Lead {
  id?: string;
  vehicleId?: string;
  name: string;
  email?: string;
  phone?: string;
  channel: "website" | "whatsapp" | "phone" | "merchant" | "other";
  message?: string;
  consent: boolean;
  createdAt?: string;
  nextActionAt?: string;
  owner?: string;
  status?: LeadStatus;
  sourceCampaign?: string;
  preferredContact?: "phone" | "email" | "whatsapp";
  budgetEur?: number;
  financingNeeded?: boolean;
  hasTradeIn?: boolean;
  sales?: SalesProfile;
}

export interface IntegrationStatus {
  key: "firebase" | "rdw" | "vwe" | "hexon" | "merchant" | "whatsapp" | "email";
  label: string;
  configured: boolean;
  mode: "live" | "demo" | "disabled";
  detail: string;
  lastSyncAt?: string;
}

export interface SyncLog {
  id: string;
  integration: string;
  status: "success" | "warning" | "failed";
  startedAt: string;
  finishedAt?: string;
  processed: number;
  failed: number;
  message: string;
}


export type LeadTemperature = "cold" | "warm" | "hot";
export type ActivityType = "note" | "call" | "email" | "whatsapp" | "appointment" | "quote" | "trade_in" | "status_change";
export type AppointmentStatus = "planned" | "confirmed" | "completed" | "cancelled" | "no_show";
export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  summary: string;
  body?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Appointment {
  id: string;
  leadId: string;
  vehicleId?: string;
  type: "test_drive" | "video_call" | "showroom" | "delivery";
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  location?: string;
  notes?: string;
}

export interface TradeIn {
  id: string;
  leadId: string;
  licensePlate: string;
  mileageKm: number;
  brand?: string;
  model?: string;
  year?: number;
  condition?: string;
  expectedValueEur?: number;
  offeredValueEur?: number;
  status: "requested" | "review" | "offered" | "accepted" | "rejected";
  photos: string[];
  createdAt: string;
}

export interface QuoteLine { label: string; quantity: number; unitPriceEur: number; vatPercent: number; }
export interface Quote {
  id: string;
  leadId: string;
  vehicleId?: string;
  status: QuoteStatus;
  lines: QuoteLine[];
  discountEur: number;
  tradeInCreditEur: number;
  validUntil: string;
  notes?: string;
  createdAt: string;
  sentAt?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: "lead_created" | "lead_idle" | "appointment_created" | "quote_sent" | "quote_viewed";
  delayMinutes: number;
  channel: "email" | "whatsapp" | "task";
  template: string;
  enabled: boolean;
}

export interface SalesProfile {
  score: number;
  temperature: LeadTemperature;
  reasons: string[];
  assignedTo?: string;
  lastContactAt?: string;
  responseDueAt?: string;
}

export type DealStatus = "draft" | "awaiting_signature" | "signed" | "payment_pending" | "paid" | "registration" | "preparation" | "ready" | "delivered" | "cancelled";
export type PaymentStatus = "open" | "pending" | "paid" | "failed" | "refunded";
export type FinanceStatus = "not_requested" | "draft" | "submitted" | "approved" | "rejected" | "documents_required";
export type RegistrationStatus = "not_started" | "documents_requested" | "ready" | "completed";
export type DeliveryTaskStatus = "todo" | "in_progress" | "done" | "blocked";

export interface CustomerSnapshot {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  dateOfBirth?: string;
}

export interface WarrantyPackage {
  id: string;
  name: string;
  months: number;
  priceCents: number;
  description: string;
  batteryCoverage: boolean;
  deductibleCents: number;
}

export interface FinanceApplication {
  id: string;
  dealId: string;
  provider?: string;
  requestedAmountCents: number;
  downPaymentCents: number;
  termMonths: number;
  monthlyPaymentCents?: number;
  status: FinanceStatus;
  consentAt?: string;
  submittedAt?: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  dealId: string;
  type: "deposit" | "balance" | "refund";
  amountCents: number;
  status: PaymentStatus;
  provider: "manual" | "mollie" | "stripe" | "bank";
  paymentUrl?: string;
  reference?: string;
  paidAt?: string;
  createdAt: string;
}

export interface DeliveryTask {
  id: string;
  dealId: string;
  category: "documents" | "workshop" | "cleaning" | "registration" | "customer" | "finance";
  title: string;
  ownerRole: "sales" | "workshop" | "admin" | "customer";
  status: DeliveryTaskStatus;
  dueAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface DealDocument {
  id: string;
  dealId: string;
  type: "purchase_agreement" | "invoice" | "finance" | "warranty" | "registration" | "delivery_report" | "other";
  title: string;
  status: "draft" | "generated" | "sent" | "signed" | "accepted";
  url?: string;
  createdAt: string;
  signedAt?: string;
}

export interface Deal {
  id: string;
  leadId: string;
  quoteId?: string;
  vehicleId: string;
  customer: CustomerSnapshot;
  status: DealStatus;
  salePriceCents: number;
  tradeInCreditCents: number;
  accessoriesCents: number;
  deliveryPackageCents: number;
  warranty?: WarrantyPackage;
  depositRequiredCents: number;
  totalCents: number;
  financeStatus: FinanceStatus;
  registrationStatus: RegistrationStatus;
  plannedDeliveryAt?: string;
  acceptedSnapshotId?: string;
  acceptedAt?: string;
  portalToken?: string;
  portalGrantHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptedDealSnapshot {
  id: string;
  dealId: string;
  kind: "accepted";
  acceptedAt: string;
  customer: Omit<CustomerSnapshot, "dateOfBirth">;
  vehicle: Pick<Vehicle, "id" | "slug" | "brand" | "model" | "trim" | "year" | "mileageKm" | "vin" | "licensePlate">;
  commercial: Pick<Deal, "salePriceCents" | "tradeInCreditCents" | "accessoriesCents" | "deliveryPackageCents" | "depositRequiredCents" | "totalCents" | "warranty">;
}

export type WorkOrderStatus = "planned" | "checked_in" | "diagnosis" | "waiting_approval" | "in_progress" | "quality_control" | "ready" | "delivered" | "cancelled";
export type WorkshopTaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type WarrantyClaimStatus = "reported" | "assessment" | "approved" | "rejected" | "repairing" | "completed";

export interface Technician {
  id: string;
  name: string;
  role: "technician" | "apk_inspector" | "workshop_manager" | "detailer";
  skills: string[];
  hourlyCostEur: number;
  active: boolean;
}

export interface WorkshopTask {
  id: string;
  workOrderId: string;
  category: "inspection" | "maintenance" | "repair" | "apk" | "battery" | "cleaning" | "quality";
  title: string;
  status: WorkshopTaskStatus;
  technicianId?: string;
  estimatedMinutes: number;
  actualMinutes: number;
  required: boolean;
  notes?: string;
}

export interface PartLine {
  id: string;
  workOrderId: string;
  sku?: string;
  description: string;
  quantity: number;
  purchasePriceEur: number;
  salePriceEur: number;
  supplier?: string;
  ordered: boolean;
  received: boolean;
}

export interface InspectionItem {
  id: string;
  section: string;
  label: string;
  result: "not_checked" | "ok" | "attention" | "reject";
  measurement?: string;
  notes?: string;
  photoUrl?: string;
}

export interface TimeEntry {
  id: string;
  workOrderId: string;
  technicianId: string;
  startedAt: string;
  endedAt?: string;
  minutes: number;
  description: string;
}

export interface WorkOrder {
  id: string;
  number: string;
  vehicleId?: string;
  dealId?: string;
  customerName: string;
  customerPhone?: string;
  licensePlate?: string;
  vehicleLabel: string;
  mileageKm: number;
  type: "stock_preparation" | "customer_maintenance" | "warranty" | "apk" | "delivery";
  status: WorkOrderStatus;
  priority: "low" | "normal" | "high" | "urgent";
  plannedStartAt: string;
  promisedAt?: string;
  complaint?: string;
  diagnosis?: string;
  customerApproval: "not_required" | "pending" | "approved" | "rejected";
  tasks: WorkshopTask[];
  parts: PartLine[];
  inspection: InspectionItem[];
  timeEntries: TimeEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  dealId?: string;
  vehicleId?: string;
  workOrderId?: string;
  customerName: string;
  vehicleLabel: string;
  licensePlate?: string;
  reportedAt: string;
  complaint: string;
  diagnosis?: string;
  status: WarrantyClaimStatus;
  coverageDecision?: string;
  estimatedCostEur: number;
  approvedAmountEur: number;
  customerContributionEur: number;
  supplierContributionEur: number;
  internalCostEur: number;
  notes?: string;
}

export type LedgerEntryType = "sale" | "purchase" | "expense" | "payment" | "refund" | "journal";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type InvoiceKind = "sales" | "purchase" | "credit";
export type CashFlowCategory = "vehicle_sales" | "workshop" | "finance" | "warranty" | "inventory" | "payroll" | "rent" | "tax" | "marketing" | "software" | "other";
export type FundingStatus = "active" | "released" | "overdue" | "defaulted";

export interface VatBreakdown { rate: number; netCents: number; vatCents: number; grossCents: number; }
export interface InvoiceLine { id: string; description: string; quantity: number; unitPriceCents: number; vatPercent: number; accountCode?: string; vehicleId?: string; workOrderId?: string; }
export interface Invoice {
  id: string; number: string; kind: InvoiceKind; status: InvoiceStatus; customerOrSupplier: string; email?: string;
  invoiceDate: string; dueDate: string; lines: InvoiceLine[]; subtotalCents: number; vatCents: number; totalCents: number; paidCents: number;
  dealId?: string; vehicleId?: string; workOrderId?: string; paymentReference?: string; notes?: string; createdAt: string; updatedAt: string;
}
export interface BankTransaction {
  id: string; bookedAt: string; amountCents: number; description: string; counterparty?: string; iban?: string; reference?: string;
  matchedInvoiceId?: string; category: CashFlowCategory; status: "unmatched" | "suggested" | "matched" | "ignored";
}
export interface Expense {
  id: string; supplier: string; invoiceNumber?: string; bookedAt: string; dueDate?: string; description: string; category: CashFlowCategory;
  netEur: number; vatPercent: number; vatEur: number; grossEur: number; status: "draft" | "approved" | "scheduled" | "paid" | "rejected";
  vehicleId?: string; workOrderId?: string; documentUrl?: string;
}
export interface InventoryFunding {
  id: string; vehicleId: string; provider: string; principalEur: number; interestRatePercent: number; startDate: string; maturityDate?: string;
  accruedInterestEur: number; feesEur: number; status: FundingStatus; releasedAt?: string;
}
export interface VehicleProfitability {
  vehicleId: string; vehicleLabel: string; salePriceEur: number; purchasePriceEur: number; directCostsEur: number; financeCostsEur: number;
  warrantyProvisionEur: number; tradeInMarginEur: number; upsellMarginEur: number; grossContributionEur: number; contributionPercent: number; stockDays: number;
}
export interface BudgetLine { id: string; month: string; category: CashFlowCategory; budgetEur: number; actualEur: number; forecastEur: number; }
export interface ManagementKpiSnapshot {
  period: string; revenueEur: number; grossProfitEur: number; operatingExpensesEur: number; ebitdaEur: number; cashEur: number;
  receivablesEur: number; payablesEur: number; inventoryBookValueEur: number; inventoryRetailValueEur: number; stockTurnDays: number;
  carsSold: number; averageGrossContributionEur: number; workshopRevenueEur: number; workshopGrossProfitEur: number;
}
export interface LedgerEntry {
  id: string; bookedAt: string; type: LedgerEntryType; description: string; debitAccount: string; creditAccount: string; amountCents: number;
  vatCode?: string; invoiceId?: string; vehicleId?: string; workOrderId?: string; immutable: boolean;
}
