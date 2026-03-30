import type { Reducer } from "../shared/replay.js";
import type { OrgEvent, OrgTreeState } from "./types.js";

function cloneState(state: OrgTreeState): OrgTreeState {
  return {
    members: new Map(state.members),
    reportIndex: new Map([...state.reportIndex.entries()].map(([k, v]) => [k, new Set(v)])),
  };
}

function indexAdd(
  index: Map<number | null, Set<string>>,
  managerBlock: number | null,
  id: string,
): void {
  let set = index.get(managerBlock);
  if (!set) {
    set = new Set();
    index.set(managerBlock, set);
  }
  set.add(id);
}

function indexRemove(
  index: Map<number | null, Set<string>>,
  managerBlock: number | null,
  id: string,
): void {
  index.get(managerBlock)?.delete(id);
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
      indexAdd(next.reportIndex, event.reportsTo, event.id);
      break;
    }

    case "DEPART": {
      const member = next.members.get(event.id);
      if (!member) break;

      // Remove from report index (no longer active)
      indexRemove(next.reportIndex, member.reportsTo, event.id);

      next.members.set(event.id, {
        ...member,
        active: false,
        lastUpdatedAtBlock: blockNumber,
      });

      // Reassign direct reports using the index — O(k) not O(n)
      if (event.handoverTo !== undefined) {
        const handoverMember = next.members.get(event.handoverTo);
        const handoverBlock = handoverMember?.appointedAtBlock ?? null;
        const directReportIds = next.reportIndex.get(member.appointedAtBlock);
        if (directReportIds) {
          for (const reportId of directReportIds) {
            const m = next.members.get(reportId);
            if (m?.active) {
              next.members.set(reportId, {
                ...m,
                reportsTo: handoverBlock,
                lastUpdatedAtBlock: blockNumber,
              });
              indexAdd(next.reportIndex, handoverBlock, reportId);
            }
          }
          next.reportIndex.delete(member.appointedAtBlock);
        }
      }
      break;
    }

    case "PROMOTE": {
      const member = next.members.get(event.id);
      if (!member) break;
      const newReportsTo = event.reportsTo !== undefined ? event.reportsTo : member.reportsTo;
      if (newReportsTo !== member.reportsTo) {
        indexRemove(next.reportIndex, member.reportsTo, event.id);
        indexAdd(next.reportIndex, newReportsTo, event.id);
      }
      next.members.set(event.id, {
        ...member,
        role: event.role,
        reportsTo: newReportsTo,
        lastUpdatedAtBlock: blockNumber,
      });
      break;
    }

    case "TRANSFER": {
      const member = next.members.get(event.id);
      if (!member) break;
      indexRemove(next.reportIndex, member.reportsTo, event.id);
      indexAdd(next.reportIndex, event.reportsTo, event.id);
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
