import { createContext, useContext } from 'react'

/*
  "Practise these" (Phase 8): a recap or a leak hands its leaks to the Puzzles
  tab. Those buttons sit several screens and portals below Online, so the
  action travels by context instead of through every screen's props; portals
  keep React context.

  Value: { start(lessons), count(lessons) }, null outside Online.
*/
export const PractiseContext = createContext(null)

/** @returns {{start: (lessons: string[]) => void, count: (lessons: string[]) => number} | null} */
export default function usePractise() {
  return useContext(PractiseContext)
}
