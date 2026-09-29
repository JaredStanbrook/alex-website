// worker/services/flashcards.service.ts
//
// The study deck: which cards are in it, in what order, and which comes next.
// Shared by the owner's study mode and the public one, so both walk a set the
// same way.

import { and, asc, eq, isNull, ne } from "drizzle-orm";

import type { Variables } from "@server/types";
import { flashcard, type SelectFlashcard, type StudyMode } from "@server/schema/flashcard.schema";

type Db = Variables["db"];

/** Cards in study order. `learning` leaves out the ones already marked known. */
export const deckOf = (db: Db, userId: string, setId: number, mode: StudyMode) =>
  db
    .select()
    .from(flashcard)
    .where(
      and(
        eq(flashcard.userId, userId),
        eq(flashcard.setId, setId),
        isNull(flashcard.deletedAt),
        mode === "learning" ? ne(flashcard.confidence, "known") : undefined,
      ),
    )
    .orderBy(asc(flashcard.position), asc(flashcard.id));

export interface StudyStep {
  card: SelectFlashcard | null;
  /** 1-based place of `card` in the deck. */
  index: number;
  total: number;
}

/** The first card after position `after`, or the first card if not given. */
export const stepAfter = (deck: SelectFlashcard[], after?: number): StudyStep => {
  const i = after === undefined ? 0 : deck.findIndex((c) => c.position > after);
  const card = i >= 0 ? (deck[i] ?? null) : null;
  return { card, index: card ? i + 1 : deck.length, total: deck.length };
};
