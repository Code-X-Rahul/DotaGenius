export function constructReplayUrl(
  matchId: string,
  cluster: number,
  replaySalt: number
): string {
  return `http://replay${cluster}.valve.net/570/${matchId}_${replaySalt}.dem.bz2`;
}
