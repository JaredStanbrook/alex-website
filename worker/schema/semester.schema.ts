// worker/schema/semester.schema.ts
//
// A teaching period. Subjects hang off it, and assignments and exams hang off
// subjects, so the semester is how the rest of the study data is grouped.

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { ownershipColumns } from "./common";
import { checkbox, isoDate, optionalText } from "./form-helpers";

export const semester = sqliteTable(
  "semester",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    /** Calendar days, `YYYY-MM-DD` — see worker/lib/dates.ts. */
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    description: text("description"),
    /**
     * The semester the app opens on. At most one per owner is set; when none
     * is, the one whose dates contain today wins (see `pickCurrentSemester`).
     */
    isCurrent: integer("is_current", { mode: "boolean" }).default(false).notNull(),
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [index("semester_user_idx").on(table.userId)],
);

export const selectSemesterSchema = createSelectSchema(semester);

export const semesterFormSchema = z
  .object({
    name: z.string().trim().min(1, "Give the semester a name").max(80),
    startDate: isoDate,
    endDate: isoDate,
    description: optionalText(500),
    isCurrent: checkbox,
  })
  .refine((s) => s.endDate >= s.startDate, {
    message: "The semester has to end after it starts",
    path: ["endDate"],
  });

export type SelectSemester = z.infer<typeof selectSemesterSchema>;
export type SemesterForm = z.infer<typeof semesterFormSchema>;
