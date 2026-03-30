import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import { orgTreeReducer } from "./reducer.js";
import type {
  AppointEvent,
  DepartEvent,
  OrgEvent,
  OrgMember,
  OrgTreeState,
  PromoteEvent,
  ReinstateEvent,
  RenameEvent,
  SuspendEvent,
  TransferEvent,
} from "./types.js";

const EMPTY_STATE: OrgTreeState = { members: new Map(), reportIndex: new Map() };

function parseOrgEvent(content: string): OrgEvent | null {
  const parsed = parseJson<OrgEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  const validTypes = ["APPOINT", "DEPART", "PROMOTE", "TRANSFER", "RENAME", "SUSPEND", "REINSTATE"];
  if (!validTypes.includes(parsed.type)) return null;
  return parsed;
}

/**
 * OrgTree — a stateful organisational hierarchy derived from a glorychain.
 *
 * State is reconstructed by replaying all blocks through a pure reducer.
 * No state is stored externally — the chain is the source of truth.
 *
 * @example
 * const tree = OrgTree.fromChain(chain)
 * tree.get("sarah.chen")           // OrgMember
 * tree.directReports("sarah.chen") // OrgMember[]
 * tree.pathTo("liu.wei")           // ["sarah.chen", "james.okafor", "liu.wei"]
 */
export class OrgTree {
  private readonly state: OrgTreeState;

  private constructor(state: OrgTreeState) {
    this.state = state;
  }

  // ─── Construction ──────────────────────────────────────────────────────────

  /** Replay a chain to build current org tree state. */
  static fromChain(chain: Chain): OrgTree {
    const state = replayChain(chain, orgTreeReducer, EMPTY_STATE, parseOrgEvent);
    return new OrgTree(state);
  }

  /** Build from a pre-computed state (for snapshotting / testing). */
  static fromState(state: OrgTreeState): OrgTree {
    return new OrgTree(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  /** Get a member by ID. Returns undefined if not found. */
  get(id: string): OrgMember | undefined {
    return this.state.members.get(id);
  }

  /** All active members. */
  get active(): OrgMember[] {
    return [...this.state.members.values()].filter((m) => m.active);
  }

  /** All members including departed. */
  get all(): OrgMember[] {
    return [...this.state.members.values()];
  }

  /** Direct reports of a member (active only). */
  directReports(id: string): OrgMember[] {
    const member = this.state.members.get(id);
    if (!member) return [];
    const ids = this.state.reportIndex.get(member.appointedAtBlock);
    if (!ids) return [];
    const result: OrgMember[] = [];
    for (const reportId of ids) {
      const m = this.state.members.get(reportId);
      if (m?.active) result.push(m);
    }
    return result;
  }

  /** All reports in the subtree below a member (recursive, active only). */
  subtree(id: string): OrgMember[] {
    const result: OrgMember[] = [];
    // Use a stack with an index pointer — avoids O(n) array.shift()
    const stack = this.directReports(id);
    let i = 0;
    while (i < stack.length) {
      const member = stack[i];
      i++;
      if (!member) continue;
      result.push(member);
      const reports = this.directReports(member.id);
      for (const r of reports) stack.push(r);
    }
    return result;
  }

  /** Management chain from root down to a member (inclusive). */
  pathTo(id: string): OrgMember[] {
    const path: OrgMember[] = [];
    let current = this.state.members.get(id);
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current.id)) break; // cycle guard
      visited.add(current.id);
      path.unshift(current);
      if (current.reportsTo === null) break;
      const managerBlock = current.reportsTo;
      current = [...this.state.members.values()].find((m) => m.appointedAtBlock === managerBlock);
    }

    return path;
  }

  /** Root members (no manager, active only). */
  get roots(): OrgMember[] {
    return this.active.filter((m) => m.reportsTo === null);
  }

  /** Members at a specific depth from the root (0 = roots). */
  atDepth(depth: number): OrgMember[] {
    if (depth === 0) return this.roots;
    // BFS from roots — O(n) total instead of O(n × depth) with pathTo per member
    let current = this.roots;
    for (let d = 0; d < depth; d++) {
      const next: OrgMember[] = [];
      for (const m of current) {
        for (const r of this.directReports(m.id)) next.push(r);
      }
      current = next;
      if (current.length === 0) return [];
    }
    return current;
  }

  /** Total active headcount. */
  get headcount(): number {
    return this.active.length;
  }

  /** Snapshot the current state (for caching / serialisation). */
  get snapshot(): OrgTreeState {
    return {
      members: new Map(this.state.members),
      reportIndex: new Map([...this.state.reportIndex.entries()].map(([k, v]) => [k, new Set(v)])),
    };
  }

  // ─── Event builders ────────────────────────────────────────────────────────
  // These produce block content strings — pass directly to appendBlock.

  static appoint(input: Omit<AppointEvent, "type">): string {
    return serialiseEvent<OrgEvent>({ type: "APPOINT", ...input });
  }

  static depart(input: Omit<DepartEvent, "type">): string {
    return serialiseEvent<OrgEvent>({ type: "DEPART", ...input });
  }

  static promote(input: Omit<PromoteEvent, "type">): string {
    return serialiseEvent<OrgEvent>({ type: "PROMOTE", ...input });
  }

  static transfer(input: Omit<TransferEvent, "type">): string {
    return serialiseEvent<OrgEvent>({ type: "TRANSFER", ...input });
  }

  static rename(input: Omit<RenameEvent, "type">): string {
    return serialiseEvent<OrgEvent>({ type: "RENAME", ...input });
  }

  static suspend(input: Omit<SuspendEvent, "type">): string {
    return serialiseEvent<OrgEvent>({ type: "SUSPEND", ...input });
  }

  static reinstate(input: Omit<ReinstateEvent, "type">): string {
    return serialiseEvent<OrgEvent>({ type: "REINSTATE", ...input });
  }

  /** JSON Schema for genesis block — enforces all appended blocks are valid OrgEvents. */
  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: {
          type: "string",
          enum: ["APPOINT", "DEPART", "PROMOTE", "TRANSFER", "RENAME", "SUSPEND", "REINSTATE"],
        },
        id: { type: "string", minLength: 1 },
        name: { type: "string" },
        role: { type: "string" },
        reportsTo: { type: ["integer", "null"] },
        reason: { type: "string" },
        handoverTo: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
