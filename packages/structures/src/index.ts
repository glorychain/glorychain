// @glorychain/structures — stateful data structure utilities for glorychain
// Derive structured state from chains using pure event-sourcing reducers.

export type { AccessEntry, AccessEvent, AccessListState } from "./access-list/index.js";
export { AccessEventType, AccessList } from "./access-list/index.js";

export type { ChangeLogEvent, ChangeLogState, Release, ReleaseStatus } from "./changelog/index.js";
export { ChangeLog, ChangeLogEventType } from "./changelog/index.js";

export type {
  Decision,
  DecisionEvent,
  DecisionLogState,
  DecisionStatus,
} from "./decision-log/index.js";
export { DecisionEventType, DecisionLog } from "./decision-log/index.js";

export type {
  Document,
  DocumentEvent,
  DocumentRegisterState,
  DocumentStatus,
} from "./document-register/index.js";
export { DocumentEventType, DocumentRegister } from "./document-register/index.js";

export type { KeyValueEntry, KeyValueEvent, KeyValueStoreState } from "./key-value-store/index.js";
export { KeyValueEventType, KeyValueStore } from "./key-value-store/index.js";

export type { Member, MemberEvent, MemberSetState } from "./member-set/index.js";
export { MemberEventType, MemberSet } from "./member-set/index.js";

export type { OrgEvent, OrgMember, OrgTreeState } from "./org-tree/index.js";
export { OrgEventType, OrgTree } from "./org-tree/index.js";

export type { Reducer } from "./shared/index.js";
export { parseJson, replayChain, serialiseEvent } from "./shared/index.js";

export type { TimelineEntry, TimelineEvent, TimelineState } from "./timeline/index.js";
export { Timeline, TimelineEventType } from "./timeline/index.js";

export type {
  Motion,
  MotionStatus,
  MotionVotes,
  VoteChoice,
  VoteEvent,
  VoteRegisterState,
} from "./vote-register/index.js";
export { VoteEventType, VoteRegister } from "./vote-register/index.js";
