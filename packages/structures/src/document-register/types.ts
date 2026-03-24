export type DocumentEventType = "PUBLISH" | "SUPERSEDE" | "WITHDRAW" | "RESTORE";

export type DocumentStatus = "current" | "superseded" | "withdrawn";

export interface PublishEvent {
  type: "PUBLISH";
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
  type: "SUPERSEDE";
  id: string;
  supersededBy: string;
  reason?: string;
}

export interface WithdrawDocumentEvent {
  type: "WITHDRAW";
  id: string;
  reason?: string;
}

export interface RestoreEvent {
  type: "RESTORE";
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
}
