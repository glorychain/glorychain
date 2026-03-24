export type DecisionEventType = "RECORD" | "SUPERSEDE" | "WITHDRAW" | "ANNOTATE";

export type DecisionStatus = "active" | "superseded" | "withdrawn";

export interface RecordEvent {
  type: "RECORD";
  id: string;
  title: string;
  body: string;
  decidedBy?: string;
  metadata?: Record<string, string>;
}

export interface SupersedeEvent {
  type: "SUPERSEDE";
  id: string;
  supersededBy: string;
  reason?: string;
}

export interface WithdrawDecisionEvent {
  type: "WITHDRAW";
  id: string;
  reason?: string;
}

export interface AnnotateEvent {
  type: "ANNOTATE";
  id: string;
  note: string;
}

export type DecisionEvent =
  | RecordEvent
  | SupersedeEvent
  | WithdrawDecisionEvent
  | AnnotateEvent;

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
