import type { RecordModel } from "pocketbase";
import { pb } from "./pb";

export type EventRecord = RecordModel & {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  all_day: boolean;
  category: "" | "학사" | "회의" | "행사" | "출장" | "기타";
  rrule: string;
  owner: string;
  expand?: { owner?: { id: string; name: string } };
};

export type SyncStatus = "online" | "offline" | "connecting";

const CACHE_KEY = "events-cache-v1";
// Window kept in memory and in the offline cache.
const MONTHS_BACK = 3;
const MONTHS_AHEAD = 6;

export function loadCache(): EventRecord[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCache(list: EventRecord[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // Cache is best effort; the server copy is authoritative.
  }
}

export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

function windowBounds() {
  const from = new Date();
  from.setMonth(from.getMonth() - MONTHS_BACK, 1);
  const to = new Date();
  to.setMonth(to.getMonth() + MONTHS_AHEAD + 1, 0);
  return { from, to };
}

async function fetchWindow(): Promise<EventRecord[]> {
  const { from, to } = windowBounds();
  return pb().collection("events").getFullList<EventRecord>({
    filter: pb().filter("end >= {:from} && start <= {:to}", { from, to }),
    sort: "start",
    expand: "owner",
    fields: "*,expand.owner.id,expand.owner.name",
  });
}

/**
 * Keeps an up-to-date event list: cache first, then a full fetch on every
 * (re)connect, then live changes from the realtime subscription.
 * Returns a function that stops syncing.
 */
export function syncEvents(
  onEvents: (list: EventRecord[]) => void,
  onStatus: (s: SyncStatus) => void,
): () => void {
  let events = loadCache();
  let stopped = false;
  onEvents(events);

  const publish = (next: EventRecord[]) => {
    events = next;
    saveCache(next);
    onEvents(next);
  };

  const refetch = async () => {
    try {
      const list = await fetchWindow();
      if (!stopped) {
        publish(list);
        onStatus("online");
      }
    } catch {
      if (!stopped) onStatus("offline");
    }
  };

  const client = pb();
  let unsubs: Array<() => Promise<void>> = [];
  let retry: ReturnType<typeof setTimeout> | undefined;

  const connect = async () => {
    try {
      unsubs = await Promise.all([
        // Fires on the first connection and after every reconnect, so anything
        // missed while offline is picked up by the refetch.
        client.realtime.subscribe("PB_CONNECT", () => void refetch()),
        client.collection("events").subscribe<EventRecord>(
          "*",
          ({ action, record }) => {
            const rest = events.filter((e) => e.id !== record.id);
            publish(action === "delete" ? rest : [...rest, record].sort((a, b) => a.start.localeCompare(b.start)));
          },
          { expand: "owner", fields: "*,expand.owner.id,expand.owner.name" },
        ),
      ]);
    } catch {
      // Server unreachable at startup: keep showing the cache and try again later.
      // (Once connected, the SDK reconnects on its own.)
      if (!stopped) {
        onStatus("offline");
        retry = setTimeout(connect, 15_000);
      }
    }
  };

  onStatus("connecting");
  client.realtime.onDisconnect = () => {
    if (!stopped) onStatus("offline");
  };
  void connect();

  return () => {
    stopped = true;
    clearTimeout(retry);
    client.realtime.onDisconnect = undefined;
    for (const u of unsubs) void u().catch(() => {});
  };
}
