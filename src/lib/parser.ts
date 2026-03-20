const PARSER_BASE = process.env.PARSER_URL || "http://localhost:5600";

export interface ParsedEvent {
  type: string;
  time?: number;
  [key: string]: unknown;
}

/**
 * Parse ndjson text into an array of ParsedEvent objects.
 * Skips malformed lines gracefully.
 */
export function parseNdjson(text: string): ParsedEvent[] {
  if (!text || text.trim().length === 0) return [];

  return text
    .trim()
    .split("\n")
    .reduce<ParsedEvent[]>((acc, line) => {
      if (line.length === 0) return acc;
      try {
        acc.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
      return acc;
    }, []);
}

/**
 * Send a replay URL to odota/parser and return parsed events.
 * Handles 200 (success), 204 (corrupted), and 500 (error) responses.
 * Uses a 5-minute timeout.
 */
export async function parseReplay(replayUrl: string): Promise<ParsedEvent[]> {
  const url = `${PARSER_BASE}/blob?replay_url=${encodeURIComponent(replayUrl)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(300000) });

  if (res.status === 204) {
    throw new Error(
      "Replay parse failed: corrupted or unsupported file"
    );
  }
  if (!res.ok) {
    throw new Error(`Parser error: ${res.status}`);
  }

  const text = await res.text();
  return parseNdjson(text);
}
