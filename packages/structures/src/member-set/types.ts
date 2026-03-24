export type MemberEventType = "JOIN" | "LEAVE" | "ROLE_CHANGE" | "SUSPEND" | "REINSTATE";

export interface JoinEvent {
  type: "JOIN";
  id: string;
  name: string;
  role?: string;
  metadata?: Record<string, string>;
}

export interface LeaveEvent {
  type: "LEAVE";
  id: string;
  reason?: string;
}

export interface RoleChangeEvent {
  type: "ROLE_CHANGE";
  id: string;
  role: string;
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

export type MemberEvent = JoinEvent | LeaveEvent | RoleChangeEvent | SuspendEvent | ReinstateEvent;

export interface Member {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
  suspended: boolean;
  joinedAtBlock: number;
  lastUpdatedAtBlock: number;
  metadata: Record<string, string>;
}

export interface MemberSetState {
  members: Map<string, Member>;
}
