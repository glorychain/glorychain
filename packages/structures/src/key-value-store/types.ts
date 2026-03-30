export enum KeyValueEventType {
  SET = "SET",
  DELETE = "DELETE",
  CLEAR = "CLEAR",
}

export interface SetEvent {
  type: KeyValueEventType.SET;
  key: string;
  value: string;
  metadata?: Record<string, string>;
}

export interface DeleteEvent {
  type: KeyValueEventType.DELETE;
  key: string;
}

export interface ClearEvent {
  type: KeyValueEventType.CLEAR;
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
