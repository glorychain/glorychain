import type { Chain } from "@glorychain/core";

/**
 * A reducer takes the current state and a parsed event, and returns the next state.
 * Pure function — no side effects.
 */
export type Reducer<TState, TEvent> = (state: TState, event: TEvent, blockNumber: number) => TState;

/**
 * Replay all blocks in a chain through a reducer to derive current state.
 * Skips the genesis block (block 0) — it sets up metadata, not events.
 * Blocks whose content cannot be parsed by the provided parser are skipped.
 */
export function replayChain<TState, TEvent>(
  chain: Chain,
  reducer: Reducer<TState, TEvent>,
  initial: TState,
  parse: (content: string) => TEvent | null,
): TState {
  let state = initial;
  for (const block of chain.blocks) {
    if (block.blockNumber === 0) continue;
    const event = parse(block.content);
    if (event === null) continue;
    state = reducer(state, event, block.blockNumber);
  }
  return state;
}

/**
 * Parse a block's content as JSON, returning null if it fails.
 */
export function parseJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Serialise an event to a JSON string for use as block content.
 */
export function serialiseEvent<T>(event: T): string {
  return JSON.stringify(event);
}
