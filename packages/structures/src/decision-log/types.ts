export enum DecisionEventType {
  RECORD = "RECORD",
  SUPERSEDE = "SUPERSEDE",
  WITHDRAW = "WITHDRAW",
  ANNOTATE = "ANNOTATE",
}

export type DecisionStatus = "active" | "superseded" | "withdrawn";

export interface RecordEvent {
  type: DecisionEventType.RECORD;
  id: string;
  title: string;
  body: string;
  decidedBy?: string;
  metadata?: Record<string, string>;
}

export interface SupersedeEvent {
  type: DecisionEventType.SUPERSEDE;
  id: string;
  supersededBy: string;
  reason?: string;
}

export interface WithdrawDecisionEvent {
  type: DecisionEventType.WITHDRAW;
  id: string;
  reason?: string;
}

export interface AnnotateEvent {
  type: DecisionEventType.ANNOTATE;
  id: string;
  note: string;
}

export type DecisionEvent = RecordEvent | SupersedeEvent | WithdrawDecisionEvent | AnnotateEvent;

export interface Decision {
  id: string;
  title: string;
  body: string;
  decidedBy: string | null;
  status: DecisionStatus;
  supersededBy: string | null;
  annotations: string[];
  recordedAtBlock: number;
  lastUpdatedAtBlock: number;
  metadata: Record<string, string>;
}

export interface DecisionLogState {
  decisions: Map<string, Decision>;
}
