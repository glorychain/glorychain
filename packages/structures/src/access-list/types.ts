export type AccessEventType = "GRANT" | "REVOKE" | "EXPIRE";

export type AccessListMode = "allowlist" | "denylist";

export interface GrantEvent {
  type: "GRANT";
  id: string;
  label?: string;
  /** ISO date string after which the grant is considered expired. */
  expiresAt?: string;
  grantedBy?: string;
  metadata?: Record<string, string>;
}

export interface RevokeEvent {
  type: "REVOKE";
  id: string;
  reason?: string;
  revokedBy?: string;
}

export interface ExpireEvent {
  type: "EXPIRE";
  id: string;
}

export type AccessEvent = GrantEvent | RevokeEvent | ExpireEvent;

export interface AccessEntry {
  id: string;
  label: string | null;
  granted: boolean;
  expiresAt: string | null;
  grantedBy: string | null;
  grantedAtBlock: number;
  lastUpdatedAtBlock: number;
  metadata: Record<string, string>;
}

export interface AccessListState {
  entries: Map<string, AccessEntry>;
}
