import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import {
  AccessEventType,
  type AccessEntry,
  type AccessEvent,
  type AccessListState,
  type ExpireEvent,
  type GrantEvent,
  type RevokeEvent,
} from "./types.js";

const EMPTY_STATE: AccessListState = { entries: new Map() };

function parseAccessEvent(content: string): AccessEvent | null {
  const parsed = parseJson<AccessEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!Object.values(AccessEventType).includes(parsed.type as AccessEventType)) return null;
  return parsed;
}

function accessReducer(
  state: AccessListState,
  event: AccessEvent,
  blockNumber: number,
): AccessListState {
  const entries = new Map(state.entries);

  switch (event.type) {
    case AccessEventType.GRANT:
      entries.set(event.id, {
        id: event.id,
        label: event.label ?? null,
        granted: true,
        expiresAt: event.expiresAt ?? null,
        grantedBy: event.grantedBy ?? null,
        grantedAtBlock: blockNumber,
        lastUpdatedAtBlock: blockNumber,
        metadata: event.metadata ?? {},
      });
      break;

    case AccessEventType.REVOKE: {
      const e = entries.get(event.id);
      if (e) {
        entries.set(event.id, { ...e, granted: false, lastUpdatedAtBlock: blockNumber });
      }
      break;
    }

    case AccessEventType.EXPIRE: {
      const e = entries.get(event.id);
      if (e) {
        entries.set(event.id, { ...e, granted: false, lastUpdatedAtBlock: blockNumber });
      }
      break;
    }
  }

  return { entries };
}

/**
 * AccessList — an auditable allowlist/denylist derived from a glorychain.
 *
 * Every grant and revocation is a block. `AccessList` provides current state.
 * Good for: approved vendor lists, allowlists, API key registers, access control logs.
 *
 * @example
 * const list = AccessList.fromChain(chain)
 * list.isGranted("alice@example.com")   // boolean
 * list.granted                          // AccessEntry[] — currently granted
 * list.get("alice@example.com")         // AccessEntry — includes full history
 */
export class AccessList {
  private readonly state: AccessListState;

  private constructor(state: AccessListState) {
    this.state = state;
  }

  static fromChain(chain: Chain): AccessList {
    const state = replayChain(chain, accessReducer, EMPTY_STATE, parseAccessEvent);
    return new AccessList(state);
  }

  static fromState(state: AccessListState): AccessList {
    return new AccessList(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(id: string): AccessEntry | undefined {
    return this.state.entries.get(id);
  }

  isGranted(id: string): boolean {
    return this.state.entries.get(id)?.granted === true;
  }

  /** All currently granted entries. Does not evaluate expiresAt — call expireStale() first if needed. */
  get granted(): AccessEntry[] {
    return [...this.state.entries.values()].filter((e) => e.granted);
  }

  get revoked(): AccessEntry[] {
    return [...this.state.entries.values()].filter((e) => !e.granted);
  }

  get all(): AccessEntry[] {
    return [...this.state.entries.values()];
  }

  /**
   * Returns IDs that have passed their expiresAt date as of the given reference time.
   * Use this to generate EXPIRE events to append to the chain.
   */
  stale(asOf: Date = new Date()): AccessEntry[] {
    return this.granted.filter((e) => e.expiresAt !== null && new Date(e.expiresAt) < asOf);
  }

  get snapshot(): AccessListState {
    return { entries: new Map(this.state.entries) };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static grant(input: Omit<GrantEvent, "type">): string {
    return serialiseEvent<AccessEvent>({ type: AccessEventType.GRANT, ...input });
  }

  static revoke(input: Omit<RevokeEvent, "type">): string {
    return serialiseEvent<AccessEvent>({ type: AccessEventType.REVOKE, ...input });
  }

  static expire(input: Omit<ExpireEvent, "type">): string {
    return serialiseEvent<AccessEvent>({ type: AccessEventType.EXPIRE, ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: { type: "string", enum: Object.values(AccessEventType) },
        id: { type: "string", minLength: 1 },
        label: { type: "string" },
        expiresAt: { type: "string" },
        grantedBy: { type: "string" },
        reason: { type: "string" },
        revokedBy: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
