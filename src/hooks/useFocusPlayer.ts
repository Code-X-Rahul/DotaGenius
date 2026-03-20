"use client";

import { useState, useCallback } from "react";

/**
 * Hook for managing focus player state.
 * Clicking a player sets them as focused; clicking the same player again deselects.
 */
export function useFocusPlayer() {
  const [focusSlot, setFocusSlot] = useState<number | null>(null);

  const setFocus = useCallback((playerSlot: number) => {
    setFocusSlot((prev) => (prev === playerSlot ? null : playerSlot));
  }, []);

  return { focusSlot, setFocus };
}
