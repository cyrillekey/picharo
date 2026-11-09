export interface PlayerExtraArgs {
  action: "start" | "pause" | "stop";
  duration?: number;
  currentTime: number;
}
export interface LibraryExtraArgs {
  action: "libraryAdd" | "libraryRemove" | "watched" | "unwatched";
  videoId: string | string[];
}
