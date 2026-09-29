// worker/schema/assessment.schema.ts
//
// Assignments and exams: the two kinds of assessed work in a subject. They
// differ in their date semantics (a due date vs a sitting) and in whether a
// status is tracked, and share the marking columns the grades page reads.

import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { ownershipColumns } from "./common";
import { subject } from "./subject.schema";
import { isoDate, optionalNumber, optionalText, optionalTime } from "./form-helpers";

/**
 * The marking columns. `mark` out of `maxMark` gives a percentage; `weight` is
 * the share of the subject's final grade, in percent. All optional — a student
 * rarely knows all three up front.
 */
const markingColumns = {
  mark: real("mark"),
  maxMark: real("max_mark"),
  weight: real("weight"),
};

const markingFields = {
  mark: optionalNumber(0, 10_000),
  maxMark: optionalNumber(0.01, 10_000),
  weight: optionalNumber(0, 100),
};

/** A mark with no "out of" is taken as a percentage, so both must be sensible together. */
const markFitsMax = (a: { mark?: number; maxMark?: number }) =>
  a.mark === undefined || a.mark <= (a.maxMark ?? 100);

// ==========================================
// ASSIGNMENTS
// ==========================================

export const ASSIGNMENT_STATUSES = ["todo", "in_progress", "submitted", "marked"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const assignment = sqliteTable(
  "assignment",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    subjectId: integer("subject_id")
      .references(() => subject.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: text("due_date").notNull(),
    status: text("status", { enum: ASSIGNMENT_STATUSES }).default("todo").notNull(),
    ...markingColumns,
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [
    index("assignment_user_idx").on(table.userId),
    index("assignment_subject_idx").on(table.subjectId),
  ],
);

export const selectAssignmentSchema = createSelectSchema(assignment);

export const assignmentFormSchema = z
  .object({
    subjectId: z.coerce.number().int().positive("Pick a subject"),
    title: z.string().trim().min(1, "Give it a title").max(160),
    description: optionalText(5000),
    dueDate: isoDate,
    status: z.enum(ASSIGNMENT_STATUSES).optional().default("todo"),
    ...markingFields,
  })
  .refine(markFitsMax, { message: "The mark is higher than the total", path: ["mark"] });

export const assignmentStatusSchema = z.object({ status: z.enum(ASSIGNMENT_STATUSES) });

// ==========================================
// EXAMS
// ==========================================

export const exam = sqliteTable(
  "exam",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    subjectId: integer("subject_id")
      .references(() => subject.id)
      .notNull(),
    title: text("title").notNull(),
    description: text("description"),
    /** The day it is sat, `YYYY-MM-DD`, plus an optional local `HH:MM`. */
    date: text("date").notNull(),
    time: text("time"),
    ...markingColumns,
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [
    index("exam_user_idx").on(table.userId),
    index("exam_subject_idx").on(table.subjectId),
  ],
);

export const selectExamSchema = createSelectSchema(exam);

export const examFormSchema = z
  .object({
    subjectId: z.coerce.number().int().positive("Pick a subject"),
    title: z.string().trim().min(1, "Give it a title").max(160),
    description: optionalText(5000),
    date: isoDate,
    time: optionalTime,
    ...markingFields,
  })
  .refine(markFitsMax, { message: "The mark is higher than the total", path: ["mark"] });

/** The grades page records a result without touching the rest. */
export const markFormSchema = z
  .object(markingFields)
  .refine(markFitsMax, { message: "The mark is higher than the total", path: ["mark"] });

export type SelectAssignment = z.infer<typeof selectAssignmentSchema>;
export type SelectExam = z.infer<typeof selectExamSchema>;
