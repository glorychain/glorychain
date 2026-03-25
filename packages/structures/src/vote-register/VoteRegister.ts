import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import type {
  CastEvent,
  CloseEvent,
  Motion,
  MotionEvent,
  VoteEvent,
  VoteRegisterState,
  WithdrawEvent,
} from "./types.js";

const EMPTY_STATE: VoteRegisterState = { motions: new Map() };

function parseVoteEvent(content: string): VoteEvent | null {
  const parsed = parseJson<VoteEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!["MOTION", "CAST", "CLOSE", "WITHDRAW"].includes(parsed.type)) return null;
  return parsed;
}

function voteReducer(
  state: VoteRegisterState,
  event: VoteEvent,
  blockNumber: number,
): VoteRegisterState {
  const motions = new Map(state.motions);

  switch (event.type) {
    case "MOTION":
      motions.set(event.id, {
        id: event.id,
        title: event.title,
        proposedBy: event.proposedBy ?? null,
        status: "open",
        votes: { yes: new Set(), no: new Set(), abstain: new Set() },
        openedAtBlock: blockNumber,
        closedAtBlock: null,
        notes: null,
        metadata: event.metadata ?? {},
      });
      break;

    case "CAST": {
      const motion = motions.get(event.motionId);
      if (!motion || motion.status !== "open") break;
      // Remove previous vote (O(1) with Set), then add new vote
      const votes = {
        yes: new Set(motion.votes.yes),
        no: new Set(motion.votes.no),
        abstain: new Set(motion.votes.abstain),
      };
      votes.yes.delete(event.voterId);
      votes.no.delete(event.voterId);
      votes.abstain.delete(event.voterId);
      votes[event.vote].add(event.voterId);
      motions.set(event.motionId, {
        ...motion,
        votes,
        lastUpdatedAtBlock: blockNumber,
      } as Motion & {
        lastUpdatedAtBlock: number;
      });
      break;
    }

    case "CLOSE": {
      const motion = motions.get(event.motionId);
      if (!motion || motion.status !== "open") break;
      const outcome =
        event.outcome ?? (motion.votes.yes.size > motion.votes.no.size ? "passed" : "failed");
      motions.set(event.motionId, {
        ...motion,
        status: outcome,
        closedAtBlock: blockNumber,
        notes: event.notes ?? null,
      });
      break;
    }

    case "WITHDRAW": {
      const motion = motions.get(event.motionId);
      if (!motion || motion.status !== "open") break;
      motions.set(event.motionId, {
        ...motion,
        status: "withdrawn",
        closedAtBlock: blockNumber,
        notes: event.reason ?? null,
      });
      break;
    }
  }

  return { motions };
}

/**
 * VoteRegister — a structured motion and vote ledger derived from a glorychain.
 *
 * Records motions, individual votes, and outcomes. Full history in the chain;
 * VoteRegister provides current state with per-motion breakdowns.
 *
 * @example
 * const register = VoteRegister.fromChain(chain)
 * register.get("motion-001")        // Motion
 * register.open                     // Motion[] — all open motions
 * register.passed                   // Motion[] — all passed motions
 * register.tally("motion-001")      // { yes: 5, no: 2, abstain: 1 }
 */
export class VoteRegister {
  private readonly state: VoteRegisterState;

  private constructor(state: VoteRegisterState) {
    this.state = state;
  }

  static fromChain(chain: Chain): VoteRegister {
    const state = replayChain(chain, voteReducer, EMPTY_STATE, parseVoteEvent);
    return new VoteRegister(state);
  }

  static fromState(state: VoteRegisterState): VoteRegister {
    return new VoteRegister(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(id: string): Motion | undefined {
    return this.state.motions.get(id);
  }

  get all(): Motion[] {
    return [...this.state.motions.values()];
  }

  get open(): Motion[] {
    return this.all.filter((m) => m.status === "open");
  }

  get passed(): Motion[] {
    return this.all.filter((m) => m.status === "passed");
  }

  get failed(): Motion[] {
    return this.all.filter((m) => m.status === "failed");
  }

  get withdrawn(): Motion[] {
    return this.all.filter((m) => m.status === "withdrawn");
  }

  tally(id: string): { yes: number; no: number; abstain: number; total: number } | undefined {
    const motion = this.state.motions.get(id);
    if (!motion) return undefined;
    const yes = motion.votes.yes.size;
    const no = motion.votes.no.size;
    const abstain = motion.votes.abstain.size;
    return { yes, no, abstain, total: yes + no + abstain };
  }

  voters(id: string): string[] {
    const motion = this.state.motions.get(id);
    if (!motion) return [];
    return [...motion.votes.yes, ...motion.votes.no, ...motion.votes.abstain];
  }

  get snapshot(): VoteRegisterState {
    const motions = new Map<string, Motion>();
    for (const [id, m] of this.state.motions) {
      motions.set(id, {
        ...m,
        votes: { yes: new Set(m.votes.yes), no: new Set(m.votes.no), abstain: new Set(m.votes.abstain) },
      });
    }
    return { motions };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static motion(input: Omit<MotionEvent, "type">): string {
    return serialiseEvent<VoteEvent>({ type: "MOTION", ...input });
  }

  static cast(input: Omit<CastEvent, "type">): string {
    return serialiseEvent<VoteEvent>({ type: "CAST", ...input });
  }

  static close(input: Omit<CloseEvent, "type">): string {
    return serialiseEvent<VoteEvent>({ type: "CLOSE", ...input });
  }

  static withdraw(input: Omit<WithdrawEvent, "type">): string {
    return serialiseEvent<VoteEvent>({ type: "WITHDRAW", ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type"],
      properties: {
        type: { type: "string", enum: ["MOTION", "CAST", "CLOSE", "WITHDRAW"] },
        id: { type: "string", minLength: 1 },
        motionId: { type: "string", minLength: 1 },
        title: { type: "string" },
        proposedBy: { type: "string" },
        voterId: { type: "string" },
        vote: { type: "string", enum: ["yes", "no", "abstain"] },
        outcome: { type: "string", enum: ["passed", "failed"] },
        notes: { type: "string" },
        reason: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
