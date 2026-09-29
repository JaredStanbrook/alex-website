// worker/routes/study/grades.tsx
//
// Marks in, grades and GPA out. The rules live in worker/lib/grades.ts.

import { and, eq, isNull } from "drizzle-orm";

import { subject, subjectGradeFormSchema } from "@server/schema/subject.schema";
import { assignment, exam, markFormSchema } from "@server/schema/assessment.schema";
import { AccessControl } from "@server/services/access.service";
import { loadSubjects } from "@server/services/study.service";
import { flashToast } from "@server/lib/htmx-helpers";
import { GradesPage } from "@views/study/grades";
import { form, idParam, nowIso, studyRouter, userOf } from "./helpers";

export const gradesRoute = studyRouter();
const access = new AccessControl();

gradesRoute.get("/", async (c) => {
  const user = userOf(c);
  access.authorize(user, "grades", "read");
  const { db } = c.var;

  const [{ semesters, subjects }, assignments, exams] = await Promise.all([
    loadSubjects(db, user.id),
    db
      .select()
      .from(assignment)
      .where(and(eq(assignment.userId, user.id), isNull(assignment.deletedAt))),
    db
      .select()
      .from(exam)
      .where(and(eq(exam.userId, user.id), isNull(exam.deletedAt))),
  ]);

  return c.render(
    <GradesPage
      semesters={semesters}
      subjects={subjects}
      assignments={assignments}
      exams={exams}
    />,
    { title: "Grades" },
  );
});

/** Credits and final mark for one subject. */
gradesRoute.post("/subjects/:id", form(subjectGradeFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "grades", "update", user.id);
  const data = c.req.valid("form");

  const changed = await c.var.db
    .update(subject)
    .set({ credits: data.credits, finalMark: data.finalMark ?? null, updatedAt: nowIso() })
    .where(and(eq(subject.id, id), eq(subject.userId, user.id), isNull(subject.deletedAt)))
    .returning({ id: subject.id });
  if (changed.length === 0) return c.notFound();

  flashToast(c, "Grade saved");
  return c.redirect(`/grades#subject-${id}`);
});

/** A mark for one assignment or exam. */
for (const [kind, table] of [
  ["assignments", assignment],
  ["exams", exam],
] as const) {
  gradesRoute.post(`/${kind}/:id`, form(markFormSchema), async (c) => {
    const user = userOf(c);
    const id = idParam(c);
    access.authorize(user, "grades", "update", user.id);
    const data = c.req.valid("form");

    const [changed] = await c.var.db
      .update(table)
      .set({
        mark: data.mark ?? null,
        maxMark: data.maxMark ?? null,
        weight: data.weight ?? null,
        // Recording a mark on an assignment is the moment it is marked.
        ...(kind === "assignments" && data.mark !== undefined ? { status: "marked" as const } : {}),
        updatedAt: nowIso(),
      })
      .where(and(eq(table.id, id), eq(table.userId, user.id), isNull(table.deletedAt)))
      .returning({ subjectId: table.subjectId });
    if (!changed) return c.notFound();

    flashToast(c, "Mark saved");
    return c.redirect(`/grades#subject-${changed.subjectId}`);
  });
}
