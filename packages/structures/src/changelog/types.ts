export enum ChangeLogEventType {
  RELEASE = "RELEASE",
  DEPRECATE = "DEPRECATE",
  YANK = "YANK",
}

export type ReleaseStatus = "active" | "deprecated" | "yanked";

export interface ReleaseEvent {
  type: ChangeLogEventType.RELEASE;
  version: string;
  notes?: string;
  breaking?: boolean;
  metadata?: Record<string, string>;
}

export interface DeprecateEvent {
  type: ChangeLogEventType.DEPRECATE;
  version: string;
  reason?: string;
  successor?: string;
}

export interface YankEvent {
  type: ChangeLogEventType.YANK;
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
