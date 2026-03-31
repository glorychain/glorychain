export enum DocumentEventType {
  PUBLISH = "PUBLISH",
  SUPERSEDE = "SUPERSEDE",
  WITHDRAW = "WITHDRAW",
  RESTORE = "RESTORE",
}

export type DocumentStatus = "current" | "superseded" | "withdrawn";

export interface PublishEvent {
  type: DocumentEventType.PUBLISH;
  id: string;
  title: string;
  /** Content hash (e.g. SHA-256 of the document) for tamper-evidence. */
  hash: string;
  /** URL or path where the document can be retrieved. */
  url?: string;
  version?: string;
  metadata?: Record<string, string>;
}

export interface SupersedeDocumentEvent {
  type: DocumentEventType.SUPERSEDE;
  id: string;
  supersededBy: string;
  reason?: string;
}

export interface WithdrawDocumentEvent {
  type: DocumentEventType.WITHDRAW;
  id: string;
  reason?: string;
}

export interface RestoreEvent {
  type: DocumentEventType.RESTORE;
  id: string;
  reason?: string;
}

export type DocumentEvent =
  | PublishEvent
  | SupersedeDocumentEvent
  | WithdrawDocumentEvent
  | RestoreEvent;

export interface Document {
  id: string;
  title: string;
  hash: string;
  url: string | null;
  version: string | null;
  status: DocumentStatus;
  supersededBy: string | null;
  publishedAtBlock: number;
  lastUpdatedAtBlock: number;
  metadata: Record<string, string>;
}

export interface DocumentRegisterState {
  documents: Map<string, Document>;
  /** Index for O(1) lookup by content hash. */
  hashIndex: Map<string, string>;
}
