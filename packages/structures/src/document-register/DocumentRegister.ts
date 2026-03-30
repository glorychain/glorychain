import type { Chain } from "@glorychain/core";
import { parseJson, replayChain, serialiseEvent } from "../shared/replay.js";
import {
  DocumentEventType,
  type Document,
  type DocumentEvent,
  type DocumentRegisterState,
  type PublishEvent,
  type RestoreEvent,
  type SupersedeDocumentEvent,
  type WithdrawDocumentEvent,
} from "./types.js";

const EMPTY_STATE: DocumentRegisterState = { documents: new Map(), hashIndex: new Map() };

function parseDocumentEvent(content: string): DocumentEvent | null {
  const parsed = parseJson<DocumentEvent>(content);
  if (!parsed || typeof parsed.type !== "string") return null;
  if (!Object.values(DocumentEventType).includes(parsed.type as DocumentEventType)) return null;
  return parsed;
}

function documentReducer(
  state: DocumentRegisterState,
  event: DocumentEvent,
  blockNumber: number,
): DocumentRegisterState {
  const documents = new Map(state.documents);
  const hashIndex = new Map(state.hashIndex);

  switch (event.type) {
    case DocumentEventType.PUBLISH:
      documents.set(event.id, {
        id: event.id,
        title: event.title,
        hash: event.hash,
        url: event.url ?? null,
        version: event.version ?? null,
        status: "current",
        supersededBy: null,
        publishedAtBlock: blockNumber,
        lastUpdatedAtBlock: blockNumber,
        metadata: event.metadata ?? {},
      });
      hashIndex.set(event.hash, event.id);
      break;

    case DocumentEventType.SUPERSEDE: {
      const d = documents.get(event.id);
      if (d) {
        documents.set(event.id, {
          ...d,
          status: "superseded",
          supersededBy: event.supersededBy,
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }

    case DocumentEventType.WITHDRAW: {
      const d = documents.get(event.id);
      if (d) {
        documents.set(event.id, {
          ...d,
          status: "withdrawn",
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }

    case DocumentEventType.RESTORE: {
      const d = documents.get(event.id);
      if (d) {
        documents.set(event.id, {
          ...d,
          status: "current",
          supersededBy: null,
          lastUpdatedAtBlock: blockNumber,
        });
      }
      break;
    }
  }

  return { documents, hashIndex };
}

/**
 * DocumentRegister — a versioned document registry derived from a glorychain.
 *
 * Each document has a content hash for tamper-evidence, a status, and optional URL.
 * Withdrawn and superseded documents remain in the chain — the full publication
 * history is always available.
 *
 * @example
 * const register = DocumentRegister.fromChain(chain)
 * register.get("policy-001")   // Document
 * register.current             // Document[] — active documents
 * register.superseded          // Document[]
 */
export class DocumentRegister {
  private readonly state: DocumentRegisterState;

  private constructor(state: DocumentRegisterState) {
    this.state = state;
  }

  static fromChain(chain: Chain): DocumentRegister {
    const state = replayChain(chain, documentReducer, EMPTY_STATE, parseDocumentEvent);
    return new DocumentRegister(state);
  }

  static fromState(state: DocumentRegisterState): DocumentRegister {
    return new DocumentRegister(state);
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  get(id: string): Document | undefined {
    return this.state.documents.get(id);
  }

  get all(): Document[] {
    return [...this.state.documents.values()];
  }

  get current(): Document[] {
    return this.all.filter((d) => d.status === "current");
  }

  get superseded(): Document[] {
    return this.all.filter((d) => d.status === "superseded");
  }

  get withdrawn(): Document[] {
    return this.all.filter((d) => d.status === "withdrawn");
  }

  /** Find a document by its content hash. O(1). */
  byHash(hash: string): Document | undefined {
    const id = this.state.hashIndex.get(hash);
    return id !== undefined ? this.state.documents.get(id) : undefined;
  }

  get snapshot(): DocumentRegisterState {
    return {
      documents: new Map(this.state.documents),
      hashIndex: new Map(this.state.hashIndex),
    };
  }

  // ─── Event builders ────────────────────────────────────────────────────────

  static publish(input: Omit<PublishEvent, "type">): string {
    return serialiseEvent<DocumentEvent>({ type: DocumentEventType.PUBLISH, ...input });
  }

  static supersede(input: Omit<SupersedeDocumentEvent, "type">): string {
    return serialiseEvent<DocumentEvent>({ type: DocumentEventType.SUPERSEDE, ...input });
  }

  static withdraw(input: Omit<WithdrawDocumentEvent, "type">): string {
    return serialiseEvent<DocumentEvent>({ type: DocumentEventType.WITHDRAW, ...input });
  }

  static restore(input: Omit<RestoreEvent, "type">): string {
    return serialiseEvent<DocumentEvent>({ type: DocumentEventType.RESTORE, ...input });
  }

  static get genesisSchema() {
    return {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: { type: "string", enum: Object.values(DocumentEventType) },
        id: { type: "string", minLength: 1 },
        title: { type: "string" },
        hash: { type: "string" },
        url: { type: "string" },
        version: { type: "string" },
        supersededBy: { type: "string" },
        reason: { type: "string" },
        metadata: { type: "object" },
      },
      additionalProperties: false,
    };
  }
}
