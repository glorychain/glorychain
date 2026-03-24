import type { Reducer } from "../shared/replay.js";
import type { OrgEvent, OrgTreeState } from "./types.js";

function cloneState(state: OrgTreeState): OrgTreeState {
  return { members: new Map(state.members) };
}

export const orgTreeReducer: Reducer<OrgTreeState, OrgEvent> = (
  state,
  event,
  blockNumber,
): OrgTreeState => {
  const next = cloneState(state);

  switch (event.type) {
    case "APPOINT": {
      next.members.set(event.id, {
        id: event.id,
        name: event.name,
        role: event.role,
        reportsTo: event.reportsTo,
        active: true,
        suspended: false,
        appointedAtBlock: blockNumber,
        lastUpdatedAtBlock: blockNumber,
        metadata: event.metadata ?? {},
      });
      break;
    }

    case "DEPART": {
      const member = next.members.get(event.id);
      if (!member) break;

      // Mark as inactive
      next.members.set(event.id, {
        ...member,
        active: false,
        lastUpdatedAtBlock: blockNumber,
      });

      // Reassign direct reports if handoverTo specified
      if (event.handoverTo !== undefined) {
        for (const [id, m] of next.members) {
          if (m.reportsTo === event.id && m.active) {
            next.members.set(id, {
              ...m,
              reportsTo: event.handoverTo ?? null,
              lastUpdatedAtBlock: blockNumber,
            });
          }
        }
      }
      break;
    }

    case "PROMOTE": {
      const member = next.members.get(event.id);
      if (!member) break;
      next.members.set(event.id, {
        ...member,
        role: event.role,
        reportsTo: event.reportsTo !== undefined ? event.reportsTo : member.reportsTo,
        lastUpdatedAtBlock: blockNumber,
      });
      break;
    }

    case "TRANSFER": {
      const member = next.members.get(event.id);
      if (!member) break;
      next.members.set(event.id, {
        ...member,
        reportsTo: event.reportsTo,
        lastUpdatedAtBlock: blockNumber,
      });
      break;
    }

    case "RENAME": {
      const member = next.members.get(event.id);
      if (!member) break;
      next.members.set(event.id, {
        ...member,
        role: event.role,
        lastUpdatedAtBlock: blockNumber,
      });
      break;
    }

    case "SUSPEND": {
      const member = next.members.get(event.id);
      if (!member) break;
      next.members.set(event.id, {
        ...member,
        suspended: true,
        lastUpdatedAtBlock: blockNumber,
      });
      break;
    }

    case "REINSTATE": {
      const member = next.members.get(event.id);
      if (!member) break;
      next.members.set(event.id, {
        ...member,
        suspended: false,
        lastUpdatedAtBlock: blockNumber,
      });
      break;
    }
  }

  return next;
};
