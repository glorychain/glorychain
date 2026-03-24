import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import type { EntryEvent, RetractEvent, TimelineEntry, TimelineEvent, TimelineState } from "./types.js";

const EMPTY_STATE: TimelineState = { entries: new Map() };

function parseTimelineEvent(content: string): TimelineEvent | null {
  const parsed = parseJson<TimelineEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!["ENTRY", "RETRACT"].includes(parsed.type)) return null;
  return parsed;
}

function timelineReducer(
  state: TimelineState,
  event: TimelineEvent,
  blockNumber: number,
): TimelineState {
  const entries = new Map(state.entries);

  switch (event.type) {
    case "ENTRY":
      entries.set(event.id, {
        id: event.id,
        title: event.title,
        body: event.body ?? null,
        tags: event.tags ?? [],
        date: event.date ?? null,
        retracted: false,
        addedAtBlock: blockNumber,
        retractedAtBlock: null,
        metadata: event.metadata ?? {},
      });
      break;

    case "RETRACT": {
      const e = entries.get(event.id);
      if (e) {
        entries.set(event.id, { ...e, retracted: true, retractedAtBlock: blockNumber });
      }
      break;
    }
  }

  return { entries };
}

/**
 * Timeline — an ordered sequence of timestamped entries derived from a glorychain.
 *
 * Good for: voting records, commitment logs, policy histories, press release registers.
 * Entries can be tagged and filtered; retracted entries remain in the chain.
 *
 * @example
 * const timeline = Timeline.fromChain(chain)
 * timeline.all                     // TimelineEntry[] — chronological
 * timeline.active                  // non-retracted entries
 * timeline.byTag("climate")        // TimelineEntry[]
 */
export class Timeline {
  private readonly state: TimelineState;

  private constructor(state: TimelineState) {
    this.state = state;
  }

  static fromChain(chain: Chain): Timeline {
    const state = replayChain(chain, timelineReducer, EMPTY_STATE, parseTimelineEvent);
    return new Timeline(state);
  }

  static fromState(state: TimelineState): Timeline {
    return new Timeline(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(id: string): TimelineEntry | undefined {
    return this.state.entries.get(id);
  }

  /** All entries in insertion order. Includes retracted. */
  get all(): TimelineEntry[] {
    return [...this.state.entries.values()];
  }

  /** Non-retracted entries in insertion order. */
  get active(): TimelineEntry[] {
    return this.all.filter((e) => !e.retracted);
  }

  get retracted(): TimelineEntry[] {
    return this.all.filter((e) => e.retracted);
  }

  byTag(tag: string): TimelineEntry[] {
    return this.active.filter((e) => e.tags.includes(tag));
  }

  /** All unique tags across active entries. */
  get tags(): string[] {
    const set = new Set<string>();
    for (const entry of this.active) {
      for (const tag of entry.tags) set.add(tag);
    }
    return [...set].sort();
  }

  get count(): number {
    return this.active.length;
  }

  get snapshot(): TimelineState {
    return { entries: new Map(this.state.entries) };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static entry(input: Omit<EntryEvent, "type">): string {
    return serialiseEvent<TimelineEvent>({ type: "ENTRY", ...input });
  }

  static retract(input: Omit<RetractEvent, "type">): string {
    return serialiseEvent<TimelineEvent>({ type: "RETRACT", ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: { type: "string", enum: ["ENTRY", "RETRACT"] },
        id: { type: "string", minLength: 1 },
        title: { type: "string" },
        body: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        date: { type: "string" },
        reason: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
