export type KeyValueEventType = "SET" | "DELETE" | "CLEAR";

export interface SetEvent {
  type: "SET";
  key: string;
  value: string;
  metadata?: Record<string, string>;
}

export interface DeleteEvent {
  type: "DELETE";
  key: string;
}

export interface ClearEvent {
  type: "CLEAR";
}

export type KeyValueEvent = SetEvent | DeleteEvent | ClearEvent;

export interface KeyValueEntry {
  key: string;
  value: string;
  setAtBlock: number;
  metadata: Record<string, string>;
}

export interface KeyValueStoreState {
  entries: Map<string, KeyValueEntry>;
}
