import type { LibraryExtraArgs, PlayerExtraArgs } from "@/type";

// Name of the BullMQ queue that carries application events.
export const EVENTS_QUEUE = "events";

// Every event that can be produced or consumed by the app.
// Add a new entry here and a matching handler in `src/consumers/events.ts`.
export interface EventPayloads {
  "library.event": {
    userId: string;
    type: "tv" | "movie" | "series" | "channel";
    videoId: string;
    args?: LibraryExtraArgs;
  };
  "player.event": {
    userId: string;
    type: "tv" | "movie" | "series" | "channel";
    videoId: string;
    args?: PlayerExtraArgs;
  };
  "media.stop": {
    watchHistoryId: number;
  };
}

export type EventName = keyof EventPayloads;

// Shape of the data stored on a BullMQ job.
export type EventJobData = {
  [K in EventName]: {
    name: K;
    payload: EventPayloads[K];
    occurredAt: string;
  };
}[EventName];
