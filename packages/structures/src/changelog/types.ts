export type ChangeLogEventType = "RELEASE" | "DEPRECATE" | "YANK";

export type ReleaseStatus = "active" | "deprecated" | "yanked";

export interface ReleaseEvent {
  type: "RELEASE";
  version: string;
  notes?: string;
  breaking?: boolean;
  metadata?: Record<string, string>;
}

export interface DeprecateEvent {
  type: "DEPRECATE";
  version: string;
  reason?: string;
  successor?: string;
}

export interface YankEvent {
  type: "YANK";
  version: string;
  reason: string;
}

export type ChangeLogEvent = ReleaseEvent | DeprecateEvent | YankEvent;

export interface Release {
  version: string;
  notes: string | null;
  breaking: boolean;
  status: ReleaseStatus;
  successor: string | null;
  yankReason: string | null;
  releasedAtBlock: number;
  lastUpdatedAtBlock: number;
  metadata: Record<string, string>;
}

export interface ChangeLogState {
  releases: Map<string, Release>;
}
