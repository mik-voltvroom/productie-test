export type StaffRole = "owner" | "admin" | "sales" | "marketing" | "workshop";
export interface StaffUser { uid: string; email: string; displayName: string; role: StaffRole; }
