// worker/schema/subject.schema.ts
//
// A unit of study inside a semester. Assignments and exams belong to one;
// notes, resources and flashcard sets link to any number of them through
// `content_link`.

import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { ownershipColumns } from "./common";
import { semester } from "./semester.schema";
import { optionalNumber, optionalText } from "./form-helpers";

/**
 * Colour slots, not colour names. Each maps to a `chart-*` theme token in the
 * view layer (see `worker/views/study/ui.tsx`), so a subject's colour follows
 * the active theme rather than being a hex that only reads well in one mode.
 */
export const SUBJECT_COLOURS = ["1", "2", "3", "4", "5"] as const;
export type SubjectColour = (typeof SUBJECT_COLOURS)[number];

export const subject = sqliteTable(
  "subject",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    semesterId: integer("semester_id")
      .references(() => semester.id)
      .notNull(),
    name: text("name").notNull(),
    code: text("code"),
    description: text("description"),
    colour: text("colour", { enum: SUBJECT_COLOURS }).default("1").notNull(),
    /** Weight of this subject in the GPA. Most universities call these credit points. */
    credits: real("credits").default(1).notNull(),
    /**
     * The official final mark, as a percentage. Optional: until it is known the
     * grade is estimated from whichever assessments have marks.
     */
    finalMark: real("final_mark"),
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [
    index("subject_user_idx").on(table.userId),
    index("subject_semester_idx").on(table.semesterId),
  ],
);

export const selectSubjectSchema = createSelectSchema(subject);

export const subjectFormSchema = z.object({
  semesterId: z.coerce.number().int().positive("Pick a semester"),
  name: z.string().trim().min(1, "Give the subject a name").max(120),
  code: optionalText(20),
  description: optionalText(2000),
  colour: z.enum(SUBJECT_COLOURS).optional().default("1"),
  credits: z.preprocess(
    (v) => (v === "" || v === undefined ? 1 : v),
    z.coerce.number().min(0).max(100),
  ),
  finalMark: optionalNumber(0, 100),
});

/** The grades page edits these two without the rest of the form. */
export const subjectGradeFormSchema = z.object({
  credits: z.preprocess(
    (v) => (v === "" || v === undefined ? 1 : v),
    z.coerce.number().min(0).max(100),
  ),
  finalMark: optionalNumber(0, 100),
});

export type SelectSubject = z.infer<typeof selectSubjectSchema>;
export type SubjectForm = z.infer<typeof subjectFormSchema>;
