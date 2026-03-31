export enum VoteEventType {
  MOTION = "MOTION",
  CAST = "CAST",
  CLOSE = "CLOSE",
  WITHDRAW = "WITHDRAW",
}

export type VoteChoice = "yes" | "no" | "abstain";

export type MotionStatus = "open" | "passed" | "failed" | "withdrawn";

export interface MotionEvent {
  type: VoteEventType.MOTION;
  id: string;
  title: string;
  proposedBy?: string;
  metadata?: Record<string, string>;
}

export interface CastEvent {
  type: VoteEventType.CAST;
  motionId: string;
  voterId: string;
  vote: VoteChoice;
}

export interface CloseEvent {
  type: VoteEventType.CLOSE;
  motionId: string;
  /** Optional override. If omitted, outcome is derived from yes > no. */
  outcome?: "passed" | "failed";
  notes?: string;
}

export interface WithdrawEvent {
  type: VoteEventType.WITHDRAW;
  motionId: string;
  reason?: string;
}

export type VoteEvent = MotionEvent | CastEvent | CloseEvent | WithdrawEvent;

export interface MotionVotes {
  yes: Set<string>;
  no: Set<string>;
  abstain: Set<string>;
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
