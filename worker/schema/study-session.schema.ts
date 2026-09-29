// worker/schema/study-session.schema.ts
//
// A block of planned study. Optionally about one subject, assignment or exam —
// whichever is most specific — so the planner can show what it was for.

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { ownershipColumns } from "./common";
import { subject } from "./subject.schema";
import { assignment, exam } from "./assessment.schema";
import { isoDate, optionalNumber, optionalText, optionalTime } from "./form-helpers";

export const SESSION_STATUSES = ["planned", "done", "skipped"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const studySession = sqliteTable(
  "study_session",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    date: text("date").notNull(),
    /** Local `HH:MM`. Either a start/end pair, a duration, or both. */
    startTime: text("start_time"),
    endTime: text("end_time"),
    durationMinutes: integer("duration_minutes"),
    status: text("status", { enum: SESSION_STATUSES }).default("planned").notNull(),
    notes: text("notes"),
    subjectId: integer("subject_id").references(() => subject.id),
    assignmentId: integer("assignment_id").references(() => assignment.id),
    examId: integer("exam_id").references(() => exam.id),
    completedAt: text("completed_at"),
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [
    index("study_session_user_idx").on(table.userId),
    index("study_session_date_idx").on(table.userId, table.date),
  ],
);

export const selectStudySessionSchema = createSelectSchema(studySession);

export const studySessionFormSchema = z
  .object({
    title: z.string().trim().min(1, "What are you studying?").max(160),
    date: isoDate,
    startTime: optionalTime,
    endTime: optionalTime,
    durationMinutes: optionalNumber(1, 24 * 60),
    notes: optionalText(5000),
    /** One `<select>`: `subject:3`, `assignment:7` or `exam:2`. */
    about: z.string().optional().default(""),
    /** Only the edit form offers this; a new session is always planned. */
    status: z.enum(SESSION_STATUSES).optional(),
  })
  .refine((s) => !s.startTime || !s.endTime || s.endTime > s.startTime, {
    message: "The session has to end after it starts",
    path: ["endTime"],
  });

export const sessionStatusSchema = z.object({ status: z.enum(SESSION_STATUSES) });

export type SelectStudySession = z.infer<typeof selectStudySessionSchema>;
