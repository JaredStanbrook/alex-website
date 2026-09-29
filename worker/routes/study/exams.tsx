// worker/routes/study/exams.tsx

import { and, asc, eq, isNull } from "drizzle-orm";

import { exam, examFormSchema } from "@server/schema/assessment.schema";
import { AccessControl } from "@server/services/access.service";
import { loadSubjects, ownedSubject } from "@server/services/study.service";
import { materialFor } from "@server/services/links.service";
import { flashToast, htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import { ExamFormPage } from "@views/study/assessments";
import { ExamListPage } from "@views/study/exams";
import { deleted, form, idParam, nowIso, studyRouter, todayOf, userOf } from "./helpers";

export const examsRoute = studyRouter();
const access = new AccessControl();

const owned = (userId: string, id?: number) =>
  and(
    eq(exam.userId, userId),
    isNull(exam.deletedAt),
    id === undefined ? undefined : eq(exam.id, id),
  );

examsRoute.get("/", async (c) => {
  const user = userOf(c);
  access.authorize(user, "exams", "read");
  const { db } = c.var;

  const [rows, subjects] = await Promise.all([
    db.select().from(exam).where(owned(user.id)).orderBy(asc(exam.date), asc(exam.time)),
    loadSubjects(db, user.id),
  ]);
  const live = rows.filter((e) => subjects.byId.has(e.subjectId));
  const material = await materialFor(
    db,
    user.id,
    "exam",
    live.map((e) => e.id),
  );

  return c.render(
    <ExamListPage
      exams={live}
      subjects={subjects.byId}
      material={material}
      today={todayOf(c)}
      locale={c.var.app.locale}
      hasSubjects={subjects.subjects.length > 0}
    />,
    { title: "Exams" },
  );
});

examsRoute.get("/new", async (c) => {
  const user = userOf(c);
  access.authorize(user, "exams", "create");
  const { groups } = await loadSubjects(c.var.db, user.id);
  const subjectId = Number(c.req.query("subject")) || undefined;
  return htmxResponse(
    c,
    "New exam",
    <ExamFormPage groups={groups} subjectId={subjectId} today={todayOf(c)} />,
  );
});

const values = (data: typeof examFormSchema._output) => ({
  subjectId: data.subjectId,
  title: data.title,
  description: data.description ?? null,
  date: data.date,
  time: data.time ?? null,
  mark: data.mark ?? null,
  maxMark: data.maxMark ?? null,
  weight: data.weight ?? null,
  updatedAt: nowIso(),
});

examsRoute.post("/", form(examFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "exams", "create");
  const data = c.req.valid("form");

  if (!(await ownedSubject(c.var.db, user.id, data.subjectId))) {
    htmxToast(c, "That subject no longer exists", { type: "error" });
    return c.text("Unknown subject", 422);
  }

  await c.var.db.insert(exam).values({ ...values(data), userId: user.id });
  flashToast(c, "Exam added. Future you says thanks.");
  return c.redirect("/exams");
});

examsRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(exam).where(owned(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "exams", "update", existing.userId);

  const { groups } = await loadSubjects(c.var.db, user.id);
  return htmxResponse(
    c,
    "Edit exam",
    <ExamFormPage e={existing} groups={groups} today={todayOf(c)} />,
  );
});

examsRoute.post("/:id", form(examFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "exams", "update", user.id);
  const data = c.req.valid("form");

  if (!(await ownedSubject(c.var.db, user.id, data.subjectId))) {
    htmxToast(c, "That subject no longer exists", { type: "error" });
    return c.text("Unknown subject", 422);
  }

  const changed = await c.var.db
    .update(exam)
    .set(values(data))
    .where(owned(user.id, id))
    .returning({ id: exam.id });
  if (changed.length === 0) return c.notFound();

  flashToast(c, "Exam saved");
  return c.redirect("/exams");
});

examsRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "exams", "delete", user.id);

  const changed = await c.var.db
    .update(exam)
    .set({ deletedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ id: exam.id });

  return deleted(c, changed.length, { noun: "exam", listHref: "/exams" });
});
