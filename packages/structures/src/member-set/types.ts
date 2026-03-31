export enum MemberEventType {
  JOIN = "JOIN",
  LEAVE = "LEAVE",
  ROLE_CHANGE = "ROLE_CHANGE",
  SUSPEND = "SUSPEND",
  REINSTATE = "REINSTATE",
}

export interface JoinEvent {
  type: MemberEventType.JOIN;
  id: string;
  name: string;
  role?: string;
  metadata?: Record<string, string>;
}

export interface LeaveEvent {
  type: MemberEventType.LEAVE;
  id: string;
  reason?: string;
}

export interface RoleChangeEvent {
  type: MemberEventType.ROLE_CHANGE;
  id: string;
  role: string;
}

export interface SuspendEvent {
  type: MemberEventType.SUSPEND;
  id: string;
  reason?: string;
}

export interface ReinstateEvent {
  type: MemberEventType.REINSTATE;
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
