// worker/routes/study/home.tsx
//
// "/" is two pages. The owner gets Today: what's on, what's due, how the week
// is going. Everyone else gets the public front page.

import { Hono } from "hono";
import { and, asc, desc, eq, gte, isNull, lte, ne, sql } from "drizzle-orm";

import type { AppEnv } from "@server/types";
import { studySession } from "@server/schema/study-session.schema";
import { assignment, exam } from "@server/schema/assessment.schema";
import { note } from "@server/schema/note.schema";
import { resource } from "@server/schema/resource.schema";
import { flashcard, flashcardSet } from "@server/schema/flashcard.schema";
import { loadAboutLookup, loadSubjects, pickCurrentSemester } from "@server/services/study.service";
import { addDays, hourIn, startOfWeek } from "@server/lib/dates";
import { TodayPage, type RecentItem } from "@views/study/today";
import { PublicHome } from "@views/study/public";
import { loadPublicContent } from "./public";
import { todayOf } from "./helpers";

export const homeRoute = new Hono<AppEnv>();

homeRoute.get("/", async (c) => {
  const { auth, app, db } = c.var;
  const user = auth.user;

  if (!user?.roles.includes("admin")) {
    const content = await loadPublicContent(db);
    return c.render(<PublicHome app={app} content={content} signedIn={Boolean(user)} />, {
      // The front page is the site's own entry in search results, so it gets
      // the tagline as its description and no "Home ·" prefix on the title.
      title: undefined,
      description: app.tagline,
      type: "website",
    });
  }

  const today = todayOf(c);
  const weekStart = startOfWeek(today);
  const owned = <T extends { userId: any; deletedAt: any }>(t: T) =>
    and(eq(t.userId, user.id), isNull(t.deletedAt));

  const [
    subjects,
    aboutOf,
    weekSessions,
    openAssignments,
    upcomingExams,
    notes,
    resources,
    sets,
    learning,
  ] = await Promise.all([
    loadSubjects(db, user.id),
    loadAboutLookup(db, user.id),
    db
      .select()
      .from(studySession)
      .where(
        and(
          owned(studySession),
          gte(studySession.date, weekStart),
          lte(studySession.date, addDays(weekStart, 6)),
        ),
      )
      .orderBy(asc(studySession.startTime)),
    db
      .select()
      .from(assignment)
      .where(
        and(
          owned(assignment),
          ne(assignment.status, "submitted"),
          ne(assignment.status, "marked"),
          lte(assignment.dueDate, addDays(today, 14)),
        ),
      )
      .orderBy(asc(assignment.dueDate)),
    db
      .select()
      .from(exam)
      .where(and(owned(exam), gte(exam.date, today), lte(exam.date, addDays(today, 28))))
      .orderBy(asc(exam.date)),
    db
      .select({ id: note.id, title: note.title, updatedAt: note.updatedAt })
      .from(note)
      .where(owned(note))
      .orderBy(desc(note.updatedAt))
      .limit(5),
    db
      .select({ id: resource.id, title: resource.title, updatedAt: resource.updatedAt })
      .from(resource)
      .where(owned(resource))
      .orderBy(desc(resource.updatedAt))
      .limit(5),
    db
      .select({ id: flashcardSet.id, title: flashcardSet.title, updatedAt: flashcardSet.updatedAt })
      .from(flashcardSet)
      .where(owned(flashcardSet))
      .orderBy(desc(flashcardSet.updatedAt))
      .limit(5),
    db
      .select({ count: sql<number>`count(*)` })
      .from(flashcard)
      .where(and(owned(flashcard), ne(flashcard.confidence, "known"))),
  ]);

  const recent: RecentItem[] = [
    ...notes.map((n) => ({
      type: "note" as const,
      id: n.id,
      title: n.title,
      updatedAt: n.updatedAt,
      href: `/notes/${n.id}`,
    })),
    ...resources.map((r) => ({
      type: "resource" as const,
      id: r.id,
      title: r.title,
      updatedAt: r.updatedAt,
      href: `/resources#resource-${r.id}`,
    })),
    ...sets.map((s) => ({
      type: "flashcard_set" as const,
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      href: `/flashcards/${s.id}`,
    })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return c.render(
    <TodayPage
      name={user.displayName || user.username || ""}
      hour={hourIn(app.timezone)}
      today={today}
      weekStart={weekStart}
      locale={app.locale}
      semester={pickCurrentSemester(subjects.semesters, today)}
      hasSubjects={subjects.subjects.length > 0}
      subjects={subjects.byId}
      weekSessions={weekSessions}
      aboutOf={aboutOf}
      assignments={openAssignments.filter((a) => subjects.byId.has(a.subjectId))}
      exams={upcomingExams.filter((e) => subjects.byId.has(e.subjectId))}
      recent={recent}
      learningCards={Number(learning[0]?.count) || 0}
    />,
    { title: "Today", noindex: true },
  );
});
