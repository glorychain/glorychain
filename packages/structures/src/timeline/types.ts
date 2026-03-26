export type TimelineEventType = "ENTRY" | "RETRACT";

export interface EntryEvent {
  type: "ENTRY";
  id: string;
  title: string;
  body?: string;
  tags?: string[];
  date?: string;
  metadata?: Record<string, string>;
}

export interface RetractEvent {
  type: "RETRACT";
  id: string;
  reason?: string;
}

export type TimelineEvent = EntryEvent | RetractEvent;

export interface TimelineEntry {
  id: string;
  title: string;
  body: string | null;
  tags: string[];
  /** ISO date string provided by the author, separate from block timestamp. */
  date: string | null;
  retracted: boolean;
  addedAtBlock: number;
  retractedAtBlock: number | null;
  metadata: Record<string, string>;
}

export interface TimelineState {
  entries: Map<string, TimelineEntry>;
  /** Running set of all tags across active entries. */
  activeTags: Map<string, number>;
}
