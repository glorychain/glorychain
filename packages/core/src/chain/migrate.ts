import type { ISO8601 } from "../schema/block.js";
import type { Chain, MigrationEvent } from "../schema/chain.js";

export function migrateChain(
  chain: Chain,
  fromConnector: string,
  toConnector: string,
  reason?: string,
): Chain {
  const event: MigrationEvent = {
    fromConnector,
    toConnector,
    timestamp: new Date().toISOString() as ISO8601,
    ...(reason !== undefined && { reason }),
  };
  return {
    ...chain,
    metadata: {
      ...chain.metadata,
      migrationHistory: [...chain.metadata.migrationHistory, event],
    },
  };
}
