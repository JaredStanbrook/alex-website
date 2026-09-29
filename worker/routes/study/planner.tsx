// worker/routes/study/planner.tsx
//
// Study sessions, shown a week at a time.

import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import {
  studySession,
  studySessionFormSchema,
  sessionStatusSchema,
} from "@server/schema/study-session.schema";
import { isoDate } from "@server/schema/form-helpers";
import { AccessControl } from "@server/services/access.service";
import { loadAboutLookup, resolveAbout } from "@server/services/study.service";
import { linkOptions } from "@server/services/links.service";
import { addDays, startOfWeek } from "@server/lib/dates";
import { flashToast, htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import { PlannerPage, SessionCard, SessionFormPage, aboutValueOf } from "@views/study/planner";
import { deleted, form, idParam, nowIso, studyRouter, todayOf, userOf } from "./helpers";

export const plannerRoute = studyRouter();
const access = new AccessControl();

const owned = (userId: string, id?: number) =>
  and(
    eq(studySession.userId, userId),
    isNull(studySession.deletedAt),
    id === undefined ? undefined : eq(studySession.id, id),
  );

const weekQuery = z.object({ week: isoDate.optional() });

plannerRoute.get("/", form(weekQuery, "query"), async (c) => {
  const user = userOf(c);
  access.authorize(user, "sessions", "read");
  const today = todayOf(c);
  const weekStart = startOfWeek(c.req.valid("query").week ?? today);
  const { db } = c.var;

  const [sessions, aboutOf] = await Promise.all([
    db
      .select()
      .from(studySession)
      .where(
        and(
          owned(user.id),
          gte(studySession.date, weekStart),
          lte(studySession.date, addDays(weekStart, 6)),
        ),
      )
      .orderBy(asc(studySession.date), asc(studySession.startTime)),
    loadAboutLookup(db, user.id),
  ]);

  return c.render(
    <PlannerPage
      weekStart={weekStart}
      today={today}
      sessions={sessions}
      aboutOf={aboutOf}
      locale={c.var.app.locale}
    />,
    { title: "Planner" },
  );
});

plannerRoute.get("/new", async (c) => {
  const user = userOf(c);
  access.authorize(user, "sessions", "create");
  const date = isoDate.safeParse(c.req.query("date"));
  const groups = await linkOptions(c.var.db, user.id);
  return htmxResponse(
    c,
    "Plan a session",
    <SessionFormPage
      groups={groups}
      date={date.success ? date.data : todayOf(c)}
      about={c.req.query("about") ?? ""}
    />,
  );
});

plannerRoute.post("/", form(studySessionFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "sessions", "create");
  const data = c.req.valid("form");
  const about = await resolveAbout(c.var.db, user.id, data.about);

  await c.var.db.insert(studySession).values({
    title: data.title,
    date: data.date,
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    durationMinutes: data.durationMinutes ?? null,
    notes: data.notes ?? null,
    ...about,
    userId: user.id,
    updatedAt: nowIso(),
  });

  flashToast(c, "Session planned");
  return c.redirect(`/planner?week=${startOfWeek(data.date)}`);
});

plannerRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(studySession).where(owned(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "sessions", "update", existing.userId);

  const groups = await linkOptions(c.var.db, user.id);
  return htmxResponse(
    c,
    "Edit session",
    <SessionFormPage
      s={existing}
      groups={groups}
      date={existing.date}
      about={aboutValueOf(existing)}
    />,
  );
});

plannerRoute.post("/:id", form(studySessionFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "sessions", "update", user.id);
  const data = c.req.valid("form");
  const about = await resolveAbout(c.var.db, user.id, data.about);

  const changed = await c.var.db
    .update(studySession)
    .set({
      title: data.title,
      date: data.date,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      durationMinutes: data.durationMinutes ?? null,
      notes: data.notes ?? null,
      ...about,
      ...(data.status
        ? { status: data.status, completedAt: data.status === "done" ? nowIso() : null }
        : {}),
      updatedAt: nowIso(),
    })
    .where(owned(user.id, id))
    .returning({ id: studySession.id });
  if (changed.length === 0) return c.notFound();

  flashToast(c, "Session saved");
  return c.redirect(`/planner?week=${startOfWeek(data.date)}`);
});

/** The round tick on a card. Answers with the redrawn card. */
plannerRoute.post("/:id/status", form(sessionStatusSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "sessions", "update", user.id);
  const { status } = c.req.valid("form");

  const [updated] = await c.var.db
    .update(studySession)
    .set({ status, completedAt: status === "done" ? nowIso() : null, updatedAt: nowIso() })
    .where(owned(user.id, id))
    .returning();
  if (!updated) return c.notFound();

  const aboutOf = await loadAboutLookup(c.var.db, user.id);
  if (status === "done") htmxToast(c, "Session done. Well played!");
  return c.html(
    <SessionCard
      s={updated}
      about={aboutOf(updated)}
      locale={c.var.app.locale}
      showDate={c.req.header("HX-Current-URL")?.includes("/subjects/") ?? false}
    />,
  );
});

plannerRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "sessions", "delete", user.id);

  const changed = await c.var.db
    .update(studySession)
    .set({ deletedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ id: studySession.id });

  return deleted(c, changed.length, { noun: "session", listHref: "/planner" });
});
