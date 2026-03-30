import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import {
  TimelineEventType,
  type EntryEvent,
  type RetractEvent,
  type TimelineEntry,
  type TimelineEvent,
  type TimelineState,
} from "./types.js";

const EMPTY_STATE: TimelineState = { entries: new Map(), activeTags: new Map() };

function parseTimelineEvent(content: string): TimelineEvent | null {
  const parsed = parseJson<TimelineEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!Object.values(TimelineEventType).includes(parsed.type as TimelineEventType)) return null;
  return parsed;
}

function tagIncrement(activeTags: Map<string, number>, tags: string[]): Map<string, number> {
  const next = new Map(activeTags);
  for (const tag of tags) next.set(tag, (next.get(tag) ?? 0) + 1);
  return next;
}

function tagDecrement(activeTags: Map<string, number>, tags: string[]): Map<string, number> {
  const next = new Map(activeTags);
  for (const tag of tags) {
    const count = (next.get(tag) ?? 0) - 1;
    if (count <= 0) next.delete(tag);
    else next.set(tag, count);
  }
  return next;
}

function timelineReducer(
  state: TimelineState,
  event: TimelineEvent,
  blockNumber: number,
): TimelineState {
  const entries = new Map(state.entries);
  let activeTags = state.activeTags;

  switch (event.type) {
    case TimelineEventType.ENTRY: {
      const tags = event.tags ?? [];
      entries.set(event.id, {
        id: event.id,
        title: event.title,
        body: event.body ?? null,
        tags,
        date: event.date ?? null,
        retracted: false,
        addedAtBlock: blockNumber,
        retractedAtBlock: null,
        metadata: event.metadata ?? {},
      });
      activeTags = tagIncrement(activeTags, tags);
      break;
    }

    case TimelineEventType.RETRACT: {
      const e = entries.get(event.id);
      if (e && !e.retracted) {
        entries.set(event.id, { ...e, retracted: true, retractedAtBlock: blockNumber });
        activeTags = tagDecrement(activeTags, e.tags);
      }
      break;
    }
  }

  return { entries, activeTags };
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
    if (!this.state.activeTags.has(tag)) return [];
    return this.active.filter((e) => e.tags.includes(tag));
  }

  /** All unique tags across active entries. O(t) where t = distinct tag count. */
  get tags(): string[] {
    return [...this.state.activeTags.keys()].sort();
  }

  get count(): number {
    return this.active.length;
  }

  get snapshot(): TimelineState {
    return {
      entries: new Map(this.state.entries),
      activeTags: new Map(this.state.activeTags),
    };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static entry(input: Omit<EntryEvent, "type">): string {
    return serialiseEvent<TimelineEvent>({ type: TimelineEventType.ENTRY, ...input });
  }

  static retract(input: Omit<RetractEvent, "type">): string {
    return serialiseEvent<TimelineEvent>({ type: TimelineEventType.RETRACT, ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: { type: "string", enum: Object.values(TimelineEventType) },
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
