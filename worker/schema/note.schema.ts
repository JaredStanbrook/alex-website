// worker/schema/note.schema.ts
//
// Text-only study notes. A note can be pinned, tinted, made public, and linked
// to any number of subjects, assignments and exams through `content_link`.

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

import { users } from "./auth.schema";
import { ownershipColumns } from "./common";
import { checkbox, stringList } from "./form-helpers";

/**
 * Accent slots, not colour names.
 *
 * Each maps to a `chart-*` theme token in the view layer, so a note's colour
 * follows the active theme instead of being a fixed hex that only reads well
 * in one mode.
 */
export const NOTE_ACCENTS = ["neutral", "1", "2", "3", "4", "5"] as const;
export type NoteAccent = (typeof NOTE_ACCENTS)[number];

export const note = sqliteTable(
  "note",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    body: text("body"),
    pinned: integer("pinned", { mode: "boolean" }).default(false).notNull(),
    accent: text("accent", { enum: NOTE_ACCENTS }).default("neutral").notNull(),
    /** Nothing is public by default. Public notes appear under /public. */
    isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [index("note_user_idx").on(table.userId)],
);

export const noteRelations = relations(note, ({ one }) => ({
  owner: one(users, {
    fields: [note.userId],
    references: [users.id],
  }),
}));

// ==========================================
// VALIDATION
// ==========================================

export const selectNoteSchema = createSelectSchema(note);

/** What the form posts. Ownership and timestamps are server-assigned. */
export const noteFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().max(50_000).optional().default(""),
  pinned: checkbox,
  isPublic: checkbox,
  accent: z.enum(NOTE_ACCENTS).optional().default("neutral"),
  /** `subject:3`, `assignment:7`… — see content-link.schema.ts. */
  links: stringList,
});

/** Query string for the list view: live search plus a pinned-only toggle. */
export const noteFilterSchema = z.object({
  q: z.string().max(120).optional().default(""),
  pinned: z
    .union([z.literal("1"), z.literal("")])
    .optional()
    .transform((v) => v === "1"),
});

// ==========================================
// TYPES
// ==========================================

export type SelectNote = z.infer<typeof selectNoteSchema>;
export type NoteForm = z.infer<typeof noteFormSchema>;
export type NoteFilter = z.infer<typeof noteFilterSchema>;
