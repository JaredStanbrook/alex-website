// worker/schema/flashcard.schema.ts
//
// Flashcard sets and their cards. Each card remembers how the last review
// went, which is all the "study only what I still get wrong" mode needs —
// deliberately not a spaced-repetition scheduler.

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { ownershipColumns } from "./common";
import { checkbox, optionalText, stringList } from "./form-helpers";

export const flashcardSet = sqliteTable(
  "flashcard_set",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
    lastStudiedAt: text("last_studied_at"),
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [index("flashcard_set_user_idx").on(table.userId)],
);

/** `new` until first reviewed, then whichever button was pressed last. */
export const CARD_CONFIDENCE = ["new", "learning", "known"] as const;
export type CardConfidence = (typeof CARD_CONFIDENCE)[number];

export const flashcard = sqliteTable(
  "flashcard",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    setId: integer("set_id")
      .references(() => flashcardSet.id)
      .notNull(),
    front: text("front").notNull(),
    back: text("back").notNull(),
    position: integer("position").default(0).notNull(),
    confidence: text("confidence", { enum: CARD_CONFIDENCE }).default("new").notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    lastReviewedAt: text("last_reviewed_at"),
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [
    index("flashcard_user_idx").on(table.userId),
    index("flashcard_set_idx").on(table.setId),
  ],
);

export const selectFlashcardSetSchema = createSelectSchema(flashcardSet);
export const selectFlashcardSchema = createSelectSchema(flashcard);

export const flashcardSetFormSchema = z.object({
  title: z.string().trim().min(1, "Give the set a name").max(160),
  description: optionalText(2000),
  isPublic: checkbox,
  links: stringList,
});

export const flashcardFormSchema = z.object({
  front: z.string().trim().min(1, "The front needs a question").max(2000),
  back: z.string().trim().min(1, "The back needs an answer").max(5000),
});

export const STUDY_MODES = ["all", "learning"] as const;
export type StudyMode = (typeof STUDY_MODES)[number];

export const reviewSchema = z.object({
  result: z.enum(["known", "learning"]),
  /** Which deck the run is using, so the next card comes from the same one. */
  mode: z.enum(STUDY_MODES).optional().default("all"),
});

/**
 * `after` is the position of the last card seen, not an index: marking a card
 * "known" in learning mode takes it out of the deck, which would shift every
 * index after it and skip a card.
 */
export const studyQuerySchema = z.object({
  mode: z.enum(STUDY_MODES).optional().default("all"),
  after: z.coerce.number().int().optional(),
});

export type SelectFlashcardSet = z.infer<typeof selectFlashcardSetSchema>;
export type SelectFlashcard = z.infer<typeof selectFlashcardSchema>;
