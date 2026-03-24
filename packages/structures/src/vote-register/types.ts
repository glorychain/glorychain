export type VoteEventType = "MOTION" | "CAST" | "CLOSE" | "WITHDRAW";

export type VoteChoice = "yes" | "no" | "abstain";

export type MotionStatus = "open" | "passed" | "failed" | "withdrawn";

export interface MotionEvent {
  type: "MOTION";
  id: string;
  title: string;
  proposedBy?: string;
  metadata?: Record<string, string>;
}

export interface CastEvent {
  type: "CAST";
  motionId: string;
  voterId: string;
  vote: VoteChoice;
}

export interface CloseEvent {
  type: "CLOSE";
  motionId: string;
  /** Optional override. If omitted, outcome is derived from yes > no. */
  outcome?: "passed" | "failed";
  notes?: string;
}

export interface WithdrawEvent {
  type: "WITHDRAW";
  motionId: string;
  reason?: string;
}

export type VoteEvent = MotionEvent | CastEvent | CloseEvent | WithdrawEvent;

export interface MotionVotes {
  yes: string[];
  no: string[];
  abstain: string[];
}

export interface Motion {
  id: string;
  title: string;
  proposedBy: string | null;
  status: MotionStatus;
  votes: MotionVotes;
  openedAtBlock: number;
  closedAtBlock: number | null;
  notes: string | null;
  metadata: Record<string, string>;
}

export interface VoteRegisterState {
  motions: Map<string, Motion>;
}
