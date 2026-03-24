import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import type {
  AnnotateEvent,
  Decision,
  DecisionEvent,
  DecisionLogState,
  RecordEvent,
  SupersedeEvent,
  WithdrawDecisionEvent,
} from "./types.js";

const EMPTY_STATE: DecisionLogState = { decisions: new Map() };

function parseDecisionEvent(content: string): DecisionEvent | null {
  const parsed = parseJson<DecisionEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!["RECORD", "SUPERSEDE", "WITHDRAW", "ANNOTATE"].includes(parsed.type)) return null;
  return parsed;
}

function decisionReducer(
  state: DecisionLogState,
  event: DecisionEvent,
  blockNumber: number,
): DecisionLogState {
  const decisions = new Map(state.decisions);

  switch (event.type) {
    case "RECORD":
      decisions.set(event.id, {
        id: event.id,
        title: event.title,
        body: event.body,
        decidedBy: event.decidedBy ?? null,
        status: "active",
        supersededBy: null,
        annotations: [],
        recordedAtBlock: blockNumber,
        lastUpdatedAtBlock: blockNumber,
        metadata: event.metadata ?? {},
      });
      break;

    case "SUPERSEDE": {
      const d = decisions.get(event.id);
      if (d) {
        decisions.set(event.id, {
          ...d,
          status: "superseded",
          supersededBy: event.supersededBy,
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }

    case "WITHDRAW": {
      const d = decisions.get(event.id);
      if (d) {
        decisions.set(event.id, {
          ...d,
          status: "withdrawn",
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }

    case "ANNOTATE": {
      const d = decisions.get(event.id);
      if (d) {
        decisions.set(event.id, {
          ...d,
          annotations: [...d.annotations, event.note],
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }
  }

  return { decisions };
}

/**
 * DecisionLog — a structured register of decisions derived from a glorychain.
 *
 * Each decision has a stable ID, body text, and lifecycle status.
 * Superseded decisions remain in the log — the chain of reasoning is permanent.
 *
 * @example
 * const log = DecisionLog.fromChain(chain)
 * log.get("ADR-001")       // Decision
 * log.active               // Decision[] — not superseded or withdrawn
 * log.superseded           // Decision[]
 */
export class DecisionLog {
  private readonly state: DecisionLogState;

  private constructor(state: DecisionLogState) {
    this.state = state;
  }

  static fromChain(chain: Chain): DecisionLog {
    const state = replayChain(chain, decisionReducer, EMPTY_STATE, parseDecisionEvent);
    return new DecisionLog(state);
  }

  static fromState(state: DecisionLogState): DecisionLog {
    return new DecisionLog(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(id: string): Decision | undefined {
    return this.state.decisions.get(id);
  }

  get all(): Decision[] {
    return [...this.state.decisions.values()];
  }

  get active(): Decision[] {
    return this.all.filter((d) => d.status === "active");
  }

  get superseded(): Decision[] {
    return this.all.filter((d) => d.status === "superseded");
  }

  get withdrawn(): Decision[] {
    return this.all.filter((d) => d.status === "withdrawn");
  }

  /** Follow the supersession chain for a given decision ID. */
  lineage(id: string): Decision[] {
    const result: Decision[] = [];
    let current = this.state.decisions.get(id);
    while (current) {
      result.push(current);
      current = current.supersededBy ? this.state.decisions.get(current.supersededBy) : undefined;
    }
    return result;
  }

  get snapshot(): DecisionLogState {
    return { decisions: new Map(this.state.decisions) };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static record(input: Omit<RecordEvent, "type">): string {
    return serialiseEvent<DecisionEvent>({ type: "RECORD", ...input });
  }

  static supersede(input: Omit<SupersedeEvent, "type">): string {
    return serialiseEvent<DecisionEvent>({ type: "SUPERSEDE", ...input });
  }

  static withdraw(input: Omit<WithdrawDecisionEvent, "type">): string {
    return serialiseEvent<DecisionEvent>({ type: "WITHDRAW", ...input });
  }

  static annotate(input: Omit<AnnotateEvent, "type">): string {
    return serialiseEvent<DecisionEvent>({ type: "ANNOTATE", ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: { type: "string", enum: ["RECORD", "SUPERSEDE", "WITHDRAW", "ANNOTATE"] },
        id: { type: "string", minLength: 1 },
        title: { type: "string" },
        body: { type: "string" },
        decidedBy: { type: "string" },
        supersededBy: { type: "string" },
        note: { type: "string" },
        reason: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
