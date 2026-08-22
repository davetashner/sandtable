/**
 * Subscribe to a CSS media query (ADR 0006 breakpoints). SSR/jsdom safe:
 * returns false when matchMedia is unavailable.
 */
import { useSyncExternalStore } from 'react';

export const BREAKPOINTS = {
  /** Map and dossier side by side. */
  wide: '(min-width: 1100px)',
  /** Map full width, dossier beneath, timeline below. */
  medium: '(min-width: 700px) and (max-width: 1099.98px)',
  /** Phone: full-bleed map, compact timeline, dossier as a bottom sheet. */
  phone: '(max-width: 699.98px)',
} as const;

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () =>
      typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false,
    () => false,
  );
}

export const usePhone = () => useMediaQuery(BREAKPOINTS.phone);
