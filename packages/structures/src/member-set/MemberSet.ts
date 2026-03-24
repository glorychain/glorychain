import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import type {
  JoinEvent,
  LeaveEvent,
  Member,
  MemberEvent,
  MemberSetState,
  ReinstateEvent,
  RoleChangeEvent,
  SuspendEvent,
} from "./types.js";

const EMPTY_STATE: MemberSetState = { members: new Map() };

function parseMemberEvent(content: string): MemberEvent | null {
  const parsed = parseJson<MemberEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!["JOIN", "LEAVE", "ROLE_CHANGE", "SUSPEND", "REINSTATE"].includes(parsed.type)) return null;
  return parsed;
}

function memberReducer(
  state: MemberSetState,
  event: MemberEvent,
  blockNumber: number,
): MemberSetState {
  const members = new Map(state.members);

  switch (event.type) {
    case "JOIN":
      members.set(event.id, {
        id: event.id,
        name: event.name,
        role: event.role ?? null,
        active: true,
        suspended: false,
        joinedAtBlock: blockNumber,
        lastUpdatedAtBlock: blockNumber,
        metadata: event.metadata ?? {},
      });
      break;

    case "LEAVE": {
      const m = members.get(event.id);
      if (m) members.set(event.id, { ...m, active: false, lastUpdatedAtBlock: blockNumber });
      break;
    }

    case "ROLE_CHANGE": {
      const m = members.get(event.id);
      if (m) members.set(event.id, { ...m, role: event.role, lastUpdatedAtBlock: blockNumber });
      break;
    }

    case "SUSPEND": {
      const m = members.get(event.id);
      if (m) members.set(event.id, { ...m, suspended: true, lastUpdatedAtBlock: blockNumber });
      break;
    }

    case "REINSTATE": {
      const m = members.get(event.id);
      if (m) members.set(event.id, { ...m, suspended: false, lastUpdatedAtBlock: blockNumber });
      break;
    }
  }

  return { members };
}

/**
 * MemberSet — an auditable membership list derived from a glorychain.
 *
 * Tracks joins, departures, role changes, and suspensions.
 * Full history in the chain; MemberSet provides current state.
 *
 * @example
 * const set = MemberSet.fromChain(chain)
 * set.get("alice@example.com")   // Member
 * set.active                     // Member[]
 * set.byRole("board-member")     // Member[]
 */
export class MemberSet {
  private readonly state: MemberSetState;

  private constructor(state: MemberSetState) {
    this.state = state;
  }

  static fromChain(chain: Chain): MemberSet {
    const state = replayChain(chain, memberReducer, EMPTY_STATE, parseMemberEvent);
    return new MemberSet(state);
  }

  static fromState(state: MemberSetState): MemberSet {
    return new MemberSet(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(id: string): Member | undefined {
    return this.state.members.get(id);
  }

  has(id: string): boolean {
    return this.state.members.has(id);
  }

  /** All currently active (non-departed) members. Includes suspended. */
  get active(): Member[] {
    return [...this.state.members.values()].filter((m) => m.active);
  }

  /** Active, non-suspended members. */
  get current(): Member[] {
    return this.active.filter((m) => !m.suspended);
  }

  /** All members including departed. */
  get all(): Member[] {
    return [...this.state.members.values()];
  }

  byRole(role: string): Member[] {
    return this.active.filter((m) => m.role === role);
  }

  get headcount(): number {
    return this.active.length;
  }

  get snapshot(): MemberSetState {
    return { members: new Map(this.state.members) };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static join(input: Omit<JoinEvent, "type">): string {
    return serialiseEvent<MemberEvent>({ type: "JOIN", ...input });
  }

  static leave(input: Omit<LeaveEvent, "type">): string {
    return serialiseEvent<MemberEvent>({ type: "LEAVE", ...input });
  }

  static roleChange(input: Omit<RoleChangeEvent, "type">): string {
    return serialiseEvent<MemberEvent>({ type: "ROLE_CHANGE", ...input });
  }

  static suspend(input: Omit<SuspendEvent, "type">): string {
    return serialiseEvent<MemberEvent>({ type: "SUSPEND", ...input });
  }

  static reinstate(input: Omit<ReinstateEvent, "type">): string {
    return serialiseEvent<MemberEvent>({ type: "REINSTATE", ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: {
          type: "string",
          enum: ["JOIN", "LEAVE", "ROLE_CHANGE", "SUSPEND", "REINSTATE"],
        },
        id: { type: "string", minLength: 1 },
        name: { type: "string" },
        role: { type: "string" },
        reason: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
