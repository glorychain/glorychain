// ─── Event types ────────────────────────────────────────────────────────────

export type OrgEventType =
  | "APPOINT"
  | "DEPART"
  | "PROMOTE"
  | "TRANSFER" // change reporting line
  | "RENAME" // role title change without promotion
  | "SUSPEND"
  | "REINSTATE";

export interface AppointEvent {
  type: "APPOINT";
  id: string; // unique identifier (e.g. email, employee ID)
  name: string;
  role: string;
  reportsTo: string | null; // null = root / no manager
  metadata?: Record<string, string>;
}

export interface DepartEvent {
  type: "DEPART";
  id: string;
  reason?: string; // e.g. "resigned", "retired", "terminated"
  handoverTo?: string; // id of person inheriting direct reports
}

export interface PromoteEvent {
  type: "PROMOTE";
  id: string;
  role: string; // new role
  reportsTo?: string; // if reporting line also changes
}

export interface TransferEvent {
  type: "TRANSFER";
  id: string;
  reportsTo: string; // new manager id
}

export interface RenameEvent {
  type: "RENAME";
  id: string;
  role: string; // new role title
}

export interface SuspendEvent {
  type: "SUSPEND";
  id: string;
  reason?: string;
}

export interface ReinstateEvent {
  type: "REINSTATE";
  id: string;
}

export type OrgEvent =
  | AppointEvent
  | DepartEvent
  | PromoteEvent
  | TransferEvent
  | RenameEvent
  | SuspendEvent
  | ReinstateEvent;

// ─── State types ────────────────────────────────────────────────────────────

export interface OrgMember {
  id: string;
  name: string;
  role: string;
  reportsTo: string | null;
  active: boolean;
  suspended: boolean;
  appointedAtBlock: number;
  lastUpdatedAtBlock: number;
  metadata: Record<string, string>;
}

export interface OrgTreeState {
  members: Map<string, OrgMember>;
  /** Reverse index: managerId → Set of active direct report IDs. */
  reportIndex: Map<string | null, Set<string>>;
}
