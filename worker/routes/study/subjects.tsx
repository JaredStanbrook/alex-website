// worker/routes/study/subjects.tsx
//
// A subject and everything about it: assessments, study sessions and the
// material linked to it or to any of its assessments.

import { and, asc, desc, eq, isNull, or, inArray } from "drizzle-orm";

import type { Variables } from "@server/types";
import { subject, subjectFormSchema } from "@server/schema/subject.schema";
import { semester } from "@server/schema/semester.schema";
import { assignment, exam } from "@server/schema/assessment.schema";
import { studySession } from "@server/schema/study-session.schema";
import { AccessControl } from "@server/services/access.service";
import {
  listSemesters,
  loadAboutLookup,
  pickCurrentSemester,
  softDeleteSubjects,
} from "@server/services/study.service";
import { materialFor, type Material } from "@server/services/links.service";
import { flashToast, htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import { SubjectFormPage, SubjectPage } from "@views/study/subjects";
import {
  deleted,
  form,
  htmxRedirectTo,
  idParam,
  nowIso,
  studyRouter,
  todayOf,
  userOf,
} from "./helpers";

export const subjectsRoute = studyRouter();
const access = new AccessControl();

const owned = (userId: string, id?: number) =>
  and(
    eq(subject.userId, userId),
    isNull(subject.deletedAt),
    id === undefined ? undefined : eq(subject.id, id),
  );

/** There is no subject list of its own; subjects are always seen in a semester. */
subjectsRoute.get("/", (c) => c.redirect("/semesters"));

subjectsRoute.get("/new", async (c) => {
  const user = userOf(c);
  access.authorize(user, "subjects", "create");
  const semesters = await listSemesters(c.var.db, user.id);
  if (semesters.length === 0) {
    flashToast(c, "Create a semester first", { type: "info" });
    return htmxRedirectTo(c, "/semesters/new");
  }
  const requested = Number(c.req.query("semester"));
  const semesterId =
    semesters.find((s) => s.id === requested)?.id ?? pickCurrentSemester(semesters, todayOf(c))?.id;
  return htmxResponse(
    c,
    "New subject",
    <SubjectFormPage semesters={semesters} semesterId={semesterId} />,
  );
});

const ownsSemester = async (db: Variables["db"], userId: string, id: number) => {
  const [row] = await db
    .select({ id: semester.id })
    .from(semester)
    .where(and(eq(semester.id, id), eq(semester.userId, userId), isNull(semester.deletedAt)));
  return Boolean(row);
};

subjectsRoute.post("/", form(subjectFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "subjects", "create");
  const data = c.req.valid("form");

  if (!(await ownsSemester(c.var.db, user.id, data.semesterId))) {
    htmxToast(c, "That semester no longer exists", { type: "error" });
    return c.text("Unknown semester", 422);
  }

  const [created] = await c.var.db
    .insert(subject)
    .values({
      semesterId: data.semesterId,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      colour: data.colour,
      credits: data.credits,
      finalMark: data.finalMark ?? null,
      userId: user.id,
      updatedAt: nowIso(),
    })
    .returning({ id: subject.id });

  flashToast(c, "Subject added");
  return c.redirect(created ? `/subjects/${created.id}` : `/semesters?id=${data.semesterId}`);
});

subjectsRoute.get("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "subjects", "read");
  const { db } = c.var;

  const [row] = await db.select().from(subject).where(owned(user.id, id));
  if (!row) return c.notFound();

  const [[sem], assignments, exams] = await Promise.all([
    db
      .select()
      .from(semester)
      .where(and(eq(semester.id, row.semesterId), eq(semester.userId, user.id))),
    db
      .select()
      .from(assignment)
      .where(
        and(
          eq(assignment.userId, user.id),
          eq(assignment.subjectId, id),
          isNull(assignment.deletedAt),
        ),
      )
      .orderBy(asc(assignment.dueDate)),
    db
      .select()
      .from(exam)
      .where(and(eq(exam.userId, user.id), eq(exam.subjectId, id), isNull(exam.deletedAt)))
      .orderBy(asc(exam.date)),
  ]);

  const assignmentIds = assignments.map((a) => a.id);
  const examIds = exams.map((e) => e.id);

  const [sessions, aboutOf, direct, byAssignment, byExam] = await Promise.all([
    db
      .select()
      .from(studySession)
      .where(
        and(
          eq(studySession.userId, user.id),
          isNull(studySession.deletedAt),
          or(
            eq(studySession.subjectId, id),
            assignmentIds.length ? inArray(studySession.assignmentId, assignmentIds) : undefined,
            examIds.length ? inArray(studySession.examId, examIds) : undefined,
          ),
        ),
      )
      .orderBy(desc(studySession.date)),
    loadAboutLookup(db, user.id),
    materialFor(db, user.id, "subject", [id]),
    materialFor(db, user.id, "assignment", assignmentIds),
    materialFor(db, user.id, "exam", examIds),
  ]);

  // Material linked to the subject itself or to any of its assessments, once each.
  const seen = new Set<string>();
  const material: Material[] = [];
  for (const m of [
    ...(direct.get(id) ?? []),
    ...[...byAssignment.values()].flat(),
    ...[...byExam.values()].flat(),
  ]) {
    const key = `${m.type}:${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    material.push(m);
  }

  return c.render(
    <SubjectPage
      subject={row}
      semester={sem}
      assignments={assignments}
      exams={exams}
      sessions={sessions}
      aboutOf={aboutOf}
      material={material}
      assessmentMaterial={{ assignment: byAssignment, exam: byExam }}
      today={todayOf(c)}
      locale={c.var.app.locale}
    />,
    { title: row.code ? `${row.code} ${row.name}` : row.name },
  );
});

subjectsRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(subject).where(owned(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "subjects", "update", existing.userId);
  const semesters = await listSemesters(c.var.db, user.id);
  return htmxResponse(c, "Edit subject", <SubjectFormPage s={existing} semesters={semesters} />);
});

subjectsRoute.post("/:id", form(subjectFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "subjects", "update", user.id);
  const data = c.req.valid("form");

  if (!(await ownsSemester(c.var.db, user.id, data.semesterId))) {
    htmxToast(c, "That semester no longer exists", { type: "error" });
    return c.text("Unknown semester", 422);
  }

  const changed = await c.var.db
    .update(subject)
    .set({
      semesterId: data.semesterId,
      name: data.name,
      code: data.code ?? null,
      description: data.description ?? null,
      colour: data.colour,
      credits: data.credits,
      finalMark: data.finalMark ?? null,
      updatedAt: nowIso(),
    })
    .where(owned(user.id, id))
    .returning({ id: subject.id });
  if (changed.length === 0) return c.notFound();

  flashToast(c, "Subject saved");
  return c.redirect(`/subjects/${id}`);
});

subjectsRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "subjects", "delete", user.id);

  const [existing] = await c.var.db
    .select({ id: subject.id, semesterId: subject.semesterId })
    .from(subject)
    .where(owned(user.id, id));
  if (!existing) return deleted(c, 0, { noun: "subject", listHref: "/semesters" });

  await softDeleteSubjects(c.var.db, user.id, [id]);
  return deleted(c, 1, { noun: "subject", listHref: `/semesters?id=${existing.semesterId}` });
});
