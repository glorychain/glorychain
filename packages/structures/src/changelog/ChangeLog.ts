import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import type {
  ChangeLogEvent,
  ChangeLogState,
  DeprecateEvent,
  Release,
  ReleaseEvent,
  YankEvent,
} from "./types.js";

const EMPTY_STATE: ChangeLogState = { releases: new Map() };

function parseChangeLogEvent(content: string): ChangeLogEvent | null {
  const parsed = parseJson<ChangeLogEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!["RELEASE", "DEPRECATE", "YANK"].includes(parsed.type)) return null;
  return parsed;
}

function changeLogReducer(
  state: ChangeLogState,
  event: ChangeLogEvent,
  blockNumber: number,
): ChangeLogState {
  const releases = new Map(state.releases);

  switch (event.type) {
    case "RELEASE":
      releases.set(event.version, {
        version: event.version,
        notes: event.notes ?? null,
        breaking: event.breaking ?? false,
        status: "active",
        successor: null,
        yankReason: null,
        releasedAtBlock: blockNumber,
        lastUpdatedAtBlock: blockNumber,
        metadata: event.metadata ?? {},
      });
      break;

    case "DEPRECATE": {
      const r = releases.get(event.version);
      if (r) {
        releases.set(event.version, {
          ...r,
          status: "deprecated",
          successor: event.successor ?? null,
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }

    case "YANK": {
      const r = releases.get(event.version);
      if (r) {
        releases.set(event.version, {
          ...r,
          status: "yanked",
          yankReason: event.reason,
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }
  }

  return { releases };
}

/**
 * ChangeLog — a structured software release log derived from a glorychain.
 *
 * Each release is a block. Deprecations and yanks are permanent and attributable.
 * Good for: open source projects, internal packages, API versioning registers.
 *
 * @example
 * const log = ChangeLog.fromChain(chain)
 * log.get("1.2.0")     // Release
 * log.active           // Release[] — not deprecated or yanked
 * log.latest           // Release | undefined — most recent active release
 */
export class ChangeLog {
  private readonly state: ChangeLogState;

  private constructor(state: ChangeLogState) {
    this.state = state;
  }

  static fromChain(chain: Chain): ChangeLog {
    const state = replayChain(chain, changeLogReducer, EMPTY_STATE, parseChangeLogEvent);
    return new ChangeLog(state);
  }

  static fromState(state: ChangeLogState): ChangeLog {
    return new ChangeLog(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(version: string): Release | undefined {
    return this.state.releases.get(version);
  }

  get all(): Release[] {
    return [...this.state.releases.values()];
  }

  get active(): Release[] {
    return this.all.filter((r) => r.status === "active");
  }

  get deprecated(): Release[] {
    return this.all.filter((r) => r.status === "deprecated");
  }

  get yanked(): Release[] {
    return this.all.filter((r) => r.status === "yanked");
  }

  get breaking(): Release[] {
    return this.all.filter((r) => r.breaking);
  }

  /** Most recently released active version (by block order). */
  get latest(): Release | undefined {
    return this.active.at(-1);
  }

  get snapshot(): ChangeLogState {
    return { releases: new Map(this.state.releases) };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static release(input: Omit<ReleaseEvent, "type">): string {
    return serialiseEvent<ChangeLogEvent>({ type: "RELEASE", ...input });
  }

  static deprecate(input: Omit<DeprecateEvent, "type">): string {
    return serialiseEvent<ChangeLogEvent>({ type: "DEPRECATE", ...input });
  }

  static yank(input: Omit<YankEvent, "type">): string {
    return serialiseEvent<ChangeLogEvent>({ type: "YANK", ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "version"],
      properties: {
        type: { type: "string", enum: ["RELEASE", "DEPRECATE", "YANK"] },
        version: { type: "string", minLength: 1 },
        notes: { type: "string" },
        breaking: { type: "boolean" },
        reason: { type: "string" },
        successor: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
