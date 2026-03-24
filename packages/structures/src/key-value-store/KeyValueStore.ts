import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import type { KeyValueEntry, KeyValueEvent, KeyValueStoreState, SetEvent } from "./types.js";

const EMPTY_STATE: KeyValueStoreState = { entries: new Map() };

function parseKeyValueEvent(content: string): KeyValueEvent | null {
  const parsed = parseJson<KeyValueEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!["SET", "DELETE", "CLEAR"].includes(parsed.type)) return null;
  return parsed;
}

function kvReducer(
  state: KeyValueStoreState,
  event: KeyValueEvent,
  blockNumber: number,
): KeyValueStoreState {
  const entries = new Map(state.entries);

  switch (event.type) {
    case "SET":
      entries.set(event.key, {
        key: event.key,
        value: event.value,
        setAtBlock: blockNumber,
        metadata: event.metadata ?? {},
      });
      break;
    case "DELETE":
      entries.delete(event.key);
      break;
    case "CLEAR":
      entries.clear();
      break;
  }

  return { entries };
}

/**
 * KeyValueStore — an auditable key-value store derived from a glorychain.
 *
 * Every SET, DELETE, and CLEAR is a block. Full history is preserved
 * in the chain; KeyValueStore provides a view of current state.
 *
 * @example
 * const store = KeyValueStore.fromChain(chain)
 * store.get("rate_limit_multiplier")  // "1.5"
 * store.has("feature_flag_x")         // boolean
 * store.entries                       // all current KeyValueEntry[]
 */
export class KeyValueStore {
  private readonly state: KeyValueStoreState;

  private constructor(state: KeyValueStoreState) {
    this.state = state;
  }

  static fromChain(chain: Chain): KeyValueStore {
    const state = replayChain(chain, kvReducer, EMPTY_STATE, parseKeyValueEvent);
    return new KeyValueStore(state);
  }

  static fromState(state: KeyValueStoreState): KeyValueStore {
    return new KeyValueStore(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(key: string): string | undefined {
    return this.state.entries.get(key)?.value;
  }

  getEntry(key: string): KeyValueEntry | undefined {
    return this.state.entries.get(key);
  }

  has(key: string): boolean {
    return this.state.entries.has(key);
  }

  get entries(): KeyValueEntry[] {
    return [...this.state.entries.values()];
  }

  get keys(): string[] {
    return [...this.state.entries.keys()];
  }

  get size(): number {
    return this.state.entries.size;
  }

  toObject(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [k, v] of this.state.entries) {
      obj[k] = v.value;
    }
    return obj;
  }

  get snapshot(): KeyValueStoreState {
    return { entries: new Map(this.state.entries) };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static set(input: Omit<SetEvent, "type">): string {
    return serialiseEvent<KeyValueEvent>({ type: "SET", ...input });
  }

  static delete(key: string): string {
    return serialiseEvent<KeyValueEvent>({ type: "DELETE", key });
  }

  static clear(): string {
    return serialiseEvent<KeyValueEvent>({ type: "CLEAR" });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type"],
      properties: {
        type: { type: "string", enum: ["SET", "DELETE", "CLEAR"] },
        key: { type: "string", minLength: 1 },
        value: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
