// worker/routes/study/assignments.tsx

import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  assignment,
  assignmentFormSchema,
  assignmentStatusSchema,
} from "@server/schema/assessment.schema";
import { AccessControl } from "@server/services/access.service";
import { loadSubjects, ownedSubject } from "@server/services/study.service";
import { materialFor } from "@server/services/links.service";
import { flashToast, htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import { AssignmentCard, AssignmentFormPage } from "@views/study/assessments";
import { AssignmentListPage, type AssignmentFilter } from "@views/study/assignments";
import { deleted, form, idParam, nowIso, studyRouter, todayOf, userOf } from "./helpers";

export const assignmentsRoute = studyRouter();
const access = new AccessControl();

const owned = (userId: string, id?: number) =>
  and(
    eq(assignment.userId, userId),
    isNull(assignment.deletedAt),
    id === undefined ? undefined : eq(assignment.id, id),
  );

const filterSchema = z.object({
  show: z.enum(["open", "done", "all"]).optional().default("open"),
});

assignmentsRoute.get("/", form(filterSchema, "query"), async (c) => {
  const user = userOf(c);
  access.authorize(user, "assignments", "read");
  const { show } = c.req.valid("query");
  const { db } = c.var;

  const [rows, subjects] = await Promise.all([
    db.select().from(assignment).where(owned(user.id)).orderBy(asc(assignment.dueDate)),
    loadSubjects(db, user.id),
  ]);
  // An assignment in a deleted subject is gone, as far as the user is concerned.
  const live = rows.filter((a) => subjects.byId.has(a.subjectId));
  const material = await materialFor(
    db,
    user.id,
    "assignment",
    live.map((a) => a.id),
  );

  return c.render(
    <AssignmentListPage
      assignments={live}
      subjects={subjects.byId}
      material={material}
      show={show as AssignmentFilter}
      today={todayOf(c)}
      locale={c.var.app.locale}
      hasSubjects={subjects.subjects.length > 0}
    />,
    { title: "Assignments" },
  );
});

assignmentsRoute.get("/new", async (c) => {
  const user = userOf(c);
  access.authorize(user, "assignments", "create");
  const { groups } = await loadSubjects(c.var.db, user.id);
  const subjectId = Number(c.req.query("subject")) || undefined;
  return htmxResponse(
    c,
    "New assignment",
    <AssignmentFormPage groups={groups} subjectId={subjectId} today={todayOf(c)} />,
  );
});

assignmentsRoute.post("/", form(assignmentFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "assignments", "create");
  const data = c.req.valid("form");

  if (!(await ownedSubject(c.var.db, user.id, data.subjectId))) {
    htmxToast(c, "That subject no longer exists", { type: "error" });
    return c.text("Unknown subject", 422);
  }

  await c.var.db.insert(assignment).values({
    subjectId: data.subjectId,
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate,
    status: data.status,
    mark: data.mark ?? null,
    maxMark: data.maxMark ?? null,
    weight: data.weight ?? null,
    userId: user.id,
    updatedAt: nowIso(),
  });

  flashToast(c, "Assignment added. You've got this!");
  return c.redirect("/assignments");
});

assignmentsRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(assignment).where(owned(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "assignments", "update", existing.userId);

  const { groups } = await loadSubjects(c.var.db, user.id);
  return htmxResponse(
    c,
    "Edit assignment",
    <AssignmentFormPage a={existing} groups={groups} today={todayOf(c)} />,
  );
});

assignmentsRoute.post("/:id", form(assignmentFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const data = c.req.valid("form");
  access.authorize(user, "assignments", "update", user.id);

  if (!(await ownedSubject(c.var.db, user.id, data.subjectId))) {
    htmxToast(c, "That subject no longer exists", { type: "error" });
    return c.text("Unknown subject", 422);
  }

  const changed = await c.var.db
    .update(assignment)
    .set({
      subjectId: data.subjectId,
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate,
      status: data.status,
      mark: data.mark ?? null,
      maxMark: data.maxMark ?? null,
      weight: data.weight ?? null,
      updatedAt: nowIso(),
    })
    .where(owned(user.id, id))
    .returning({ id: assignment.id });
  if (changed.length === 0) return c.notFound();

  flashToast(c, "Assignment saved");
  return c.redirect("/assignments");
});

/** The status dropdown on a card. Answers with the redrawn card. */
assignmentsRoute.post("/:id/status", form(assignmentStatusSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "assignments", "update", user.id);
  const { status } = c.req.valid("form");
  const { db } = c.var;

  const [updated] = await db
    .update(assignment)
    .set({ status, updatedAt: nowIso() })
    .where(owned(user.id, id))
    .returning();
  if (!updated) return c.notFound();

  const [{ byId }, material] = await Promise.all([
    loadSubjects(db, user.id),
    materialFor(db, user.id, "assignment", [id]),
  ]);

  htmxToast(c, status === "submitted" ? "Submitted — nice work!" : "Status updated");
  return c.html(
    <AssignmentCard
      a={updated}
      subject={byId.get(updated.subjectId)}
      material={material.get(id)}
      today={todayOf(c)}
      locale={c.var.app.locale}
    />,
  );
});

assignmentsRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "assignments", "delete", user.id);

  const changed = await c.var.db
    .update(assignment)
    .set({ deletedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ id: assignment.id });

  return deleted(c, changed.length, { noun: "assignment", listHref: "/assignments" });
});
