// worker/routes/study/semesters.tsx
//
// The Semester screen: pick a semester, see its subjects. Doubles as the
// "Subjects" entry in the nav, since subjects are always seen in a semester.

import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import type { Variables } from "@server/types";
import { semester, semesterFormSchema, type SemesterForm } from "@server/schema/semester.schema";
import { subject } from "@server/schema/subject.schema";
import { assignment, exam } from "@server/schema/assessment.schema";
import { AccessControl } from "@server/services/access.service";
import {
  listSemesters,
  pickCurrentSemester,
  softDeleteSubjects,
} from "@server/services/study.service";
import { flashToast, htmxResponse } from "@server/lib/htmx-helpers";
import { SemesterFormPage, SemesterPage } from "@views/study/semesters";
import { deleted, form, idParam, nowIso, studyRouter, todayOf, userOf } from "./helpers";

type Db = Variables["db"];

export const semestersRoute = studyRouter();
const access = new AccessControl();

const owned = (userId: string, id?: number) =>
  and(
    eq(semester.userId, userId),
    isNull(semester.deletedAt),
    id === undefined ? undefined : eq(semester.id, id),
  );

semestersRoute.get("/", async (c) => {
  const user = userOf(c);
  access.authorize(user, "semesters", "read");
  const { db } = c.var;
  const today = todayOf(c);

  const semesters = await listSemesters(db, user.id);
  const requested = Number(c.req.query("id"));
  const current = pickCurrentSemester(semesters, today);
  const selected = semesters.find((s) => s.id === requested) ?? current;

  const subjects = selected
    ? await db
        .select()
        .from(subject)
        .where(
          and(
            eq(subject.userId, user.id),
            isNull(subject.deletedAt),
            eq(subject.semesterId, selected.id),
          ),
        )
    : [];
  const subjectIds = subjects.map((s) => s.id);

  const [assignments, exams] = subjectIds.length
    ? await Promise.all([
        db
          .select()
          .from(assignment)
          .where(
            and(
              eq(assignment.userId, user.id),
              isNull(assignment.deletedAt),
              inArray(assignment.subjectId, subjectIds),
            ),
          ),
        db
          .select()
          .from(exam)
          .where(
            and(
              eq(exam.userId, user.id),
              isNull(exam.deletedAt),
              inArray(exam.subjectId, subjectIds),
            ),
          ),
      ])
    : [[], []];

  return c.render(
    <SemesterPage
      semesters={semesters}
      selected={selected}
      currentId={current?.id}
      subjects={subjects.sort((a, b) => a.name.localeCompare(b.name))}
      assignments={assignments}
      exams={exams}
      today={today}
      locale={c.var.app.locale}
    />,
    { title: selected ? selected.name : "Semesters" },
  );
});

semestersRoute.get("/new", (c) => {
  access.authorize(userOf(c), "semesters", "create");
  return htmxResponse(c, "New semester", <SemesterFormPage today={todayOf(c)} />);
});

/**
 * Only one semester can be the chosen current one. Clearing the others in the
 * same batch as the write means there is never a moment with two.
 */
const saveSemester = async (db: Db, userId: string, data: SemesterForm, id?: number) => {
  const values = {
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    description: data.description ?? null,
    isCurrent: data.isCurrent,
    updatedAt: nowIso(),
  };

  const clearOthers = db
    .update(semester)
    .set({ isCurrent: false })
    .where(and(owned(userId), id === undefined ? undefined : ne(semester.id, id)));

  if (id === undefined) {
    const insert = db
      .insert(semester)
      .values({ ...values, userId })
      .returning({ id: semester.id });
    if (!data.isCurrent) return (await insert)[0]?.id;
    const [, inserted] = await db.batch([clearOthers, insert]);
    return inserted[0]?.id;
  }

  const update = db
    .update(semester)
    .set(values)
    .where(owned(userId, id))
    .returning({ id: semester.id });
  if (!data.isCurrent) return (await update)[0]?.id;
  // Only clear the others once we know this one exists, or a bad id would
  // quietly throw away the real choice.
  const [exists] = await db.select({ id: semester.id }).from(semester).where(owned(userId, id));
  if (!exists) return undefined;
  const [, updated] = await db.batch([clearOthers, update]);
  return updated[0]?.id;
};

semestersRoute.post("/", form(semesterFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "semesters", "create");
  const id = await saveSemester(c.var.db, user.id, c.req.valid("form"));

  flashToast(c, "Semester created. Now add some subjects!");
  return c.redirect(id ? `/semesters?id=${id}` : "/semesters");
});

semestersRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(semester).where(owned(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "semesters", "update", existing.userId);
  return htmxResponse(c, "Edit semester", <SemesterFormPage s={existing} today={todayOf(c)} />);
});

semestersRoute.post("/:id", form(semesterFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "semesters", "update", user.id);
  const saved = await saveSemester(c.var.db, user.id, c.req.valid("form"), id);
  if (!saved) return c.notFound();

  flashToast(c, "Semester saved");
  return c.redirect(`/semesters?id=${id}`);
});

/** "Make this the current semester" — the one Today and the nav open on. */
semestersRoute.post("/:id/current", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "semesters", "update", user.id);
  const { db } = c.var;

  // Check first: clearing the others for an id that does not exist would
  // quietly throw away the real choice.
  const [existing] = await db.select({ id: semester.id }).from(semester).where(owned(user.id, id));
  if (!existing) return c.notFound();

  await db.batch([
    db
      .update(semester)
      .set({ isCurrent: false })
      .where(and(owned(user.id), ne(semester.id, id))),
    db.update(semester).set({ isCurrent: true, updatedAt: nowIso() }).where(owned(user.id, id)),
  ]);

  flashToast(c, "Current semester set");
  return c.redirect(`/semesters?id=${id}`);
});

semestersRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "semesters", "delete", user.id);
  const { db } = c.var;

  const children = await db
    .select({ id: subject.id })
    .from(subject)
    .where(and(eq(subject.userId, user.id), eq(subject.semesterId, id), isNull(subject.deletedAt)));
  await softDeleteSubjects(
    db,
    user.id,
    children.map((s) => s.id),
  );

  const changed = await db
    .update(semester)
    .set({ deletedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ id: semester.id });

  return deleted(c, changed.length, { noun: "semester", listHref: "/semesters" });
});
