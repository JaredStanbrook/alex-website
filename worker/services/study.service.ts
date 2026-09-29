// worker/services/study.service.ts
//
// Semester and subject logic that more than one route needs: which semester
// is "current", and deleting a parent along with the things that hang off it.

import { and, eq, inArray, isNull } from "drizzle-orm";

import type { Variables } from "@server/types";
import { semester, type SelectSemester } from "@server/schema/semester.schema";
import { subject } from "@server/schema/subject.schema";
import { assignment, exam } from "@server/schema/assessment.schema";

type Db = Variables["db"];

/**
 * The semester to open on. An explicit choice wins; otherwise the one running
 * today, then the next to start, then the most recent to finish.
 */
export const pickCurrentSemester = <
  T extends Pick<SelectSemester, "isCurrent" | "startDate" | "endDate">,
>(
  semesters: T[],
  today: string,
): T | null => {
  if (semesters.length === 0) return null;
  const chosen = semesters.find((s) => s.isCurrent);
  if (chosen) return chosen;

  const running = semesters.find((s) => s.startDate <= today && s.endDate >= today);
  if (running) return running;

  const upcoming = semesters
    .filter((s) => s.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (upcoming) return upcoming;

  return [...semesters].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
};

/** Live semesters for `userId`, newest first. */
export const listSemesters = (db: Db, userId: string) =>
  db
    .select()
    .from(semester)
    .where(and(eq(semester.userId, userId), isNull(semester.deletedAt)))
    .then((rows) => rows.sort((a, b) => b.startDate.localeCompare(a.startDate)));

/**
 * Soft-delete subjects and every assignment and exam in them.
 *
 * Without the cascade an assignment would outlive its subject: still counted
 * on the Today screen, still listed under Assignments, and linking to a
 * subject page that 404s.
 */
export const softDeleteSubjects = async (db: Db, userId: string, subjectIds: number[]) => {
  if (subjectIds.length === 0) return;
  const now = new Date().toISOString();
  await db.batch([
    db
      .update(assignment)
      .set({ deletedAt: now })
      .where(
        and(
          eq(assignment.userId, userId),
          inArray(assignment.subjectId, subjectIds),
          isNull(assignment.deletedAt),
        ),
      ),
    db
      .update(exam)
      .set({ deletedAt: now })
      .where(
        and(eq(exam.userId, userId), inArray(exam.subjectId, subjectIds), isNull(exam.deletedAt)),
      ),
    db
      .update(subject)
      .set({ deletedAt: now })
      .where(
        and(eq(subject.userId, userId), inArray(subject.id, subjectIds), isNull(subject.deletedAt)),
      ),
  ]);
};

/**
 * Every live subject with its semester, in the shapes pages need: a lookup by
 * id for cards, and groups by semester for a `<select>`.
 *
 * A subject whose semester is gone is treated as gone too, so nothing can be
 * filed under a semester the user deleted.
 */
export const loadSubjects = async (db: Db, userId: string) => {
  const [semesters, subjects] = await Promise.all([
    listSemesters(db, userId),
    db
      .select()
      .from(subject)
      .where(and(eq(subject.userId, userId), isNull(subject.deletedAt))),
  ]);

  const semesterIds = new Set(semesters.map((s) => s.id));
  const live = subjects
    .filter((s) => semesterIds.has(s.semesterId))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    semesters,
    subjects: live,
    byId: new Map(live.map((s) => [s.id, s])),
    groups: semesters
      .map((sem) => ({
        semesterName: sem.name,
        subjects: live.filter((s) => s.semesterId === sem.id),
      }))
      .filter((g) => g.subjects.length > 0),
  };
};

/** Resolve a posted subject id to one the user owns, or null. */
export const ownedSubject = async (db: Db, userId: string, subjectId: number) => {
  const [row] = await db
    .select({ id: subject.id })
    .from(subject)
    .where(and(eq(subject.id, subjectId), eq(subject.userId, userId), isNull(subject.deletedAt)));
  return row ?? null;
};

export interface AboutLabel {
  label: string;
  colour: string;
  href: string;
  icon: string;
}

/**
 * What each study session is "about", as a chip: the assignment or exam if it
 * names one, otherwise the subject. Loaded once per page rather than per row.
 */
export const loadAboutLookup = async (db: Db, userId: string) => {
  const [{ byId: subjects }, assignments, exams] = await Promise.all([
    loadSubjects(db, userId),
    db
      .select({ id: assignment.id, title: assignment.title, subjectId: assignment.subjectId })
      .from(assignment)
      .where(and(eq(assignment.userId, userId), isNull(assignment.deletedAt))),
    db
      .select({ id: exam.id, title: exam.title, subjectId: exam.subjectId })
      .from(exam)
      .where(and(eq(exam.userId, userId), isNull(exam.deletedAt))),
  ]);
  const assignmentById = new Map(assignments.map((a) => [a.id, a]));
  const examById = new Map(exams.map((e) => [e.id, e]));

  return (s: {
    subjectId: number | null;
    assignmentId: number | null;
    examId: number | null;
  }): AboutLabel | undefined => {
    if (s.assignmentId) {
      const a = assignmentById.get(s.assignmentId);
      const subj = a && subjects.get(a.subjectId);
      if (a && subj)
        return {
          label: a.title,
          colour: subj.colour,
          href: `/assignments#assignment-${a.id}`,
          icon: "clipboard-list",
        };
    }
    if (s.examId) {
      const e = examById.get(s.examId);
      const subj = e && subjects.get(e.subjectId);
      if (e && subj)
        return {
          label: e.title,
          colour: subj.colour,
          href: `/exams#exam-${e.id}`,
          icon: "graduation-cap",
        };
    }
    if (s.subjectId) {
      const subj = subjects.get(s.subjectId);
      if (subj)
        return {
          label: subj.code || subj.name,
          colour: subj.colour,
          href: `/subjects/${subj.id}`,
          icon: "book-open",
        };
    }
    return undefined;
  };
};

/**
 * Turn the planner's single "about" select into the three columns, keeping
 * only ids the user owns. An assignment or exam also fills in its subject, so
 * "sessions for this subject" finds it either way.
 */
export const resolveAbout = async (db: Db, userId: string, about: string) => {
  const none = { subjectId: null, assignmentId: null, examId: null };
  const [type, rawId] = about.split(":");
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return none;

  if (type === "subject") {
    return (await ownedSubject(db, userId, id)) ? { ...none, subjectId: id } : none;
  }
  if (type === "assignment") {
    const [row] = await db
      .select({ subjectId: assignment.subjectId })
      .from(assignment)
      .where(
        and(eq(assignment.id, id), eq(assignment.userId, userId), isNull(assignment.deletedAt)),
      );
    return row ? { ...none, assignmentId: id, subjectId: row.subjectId } : none;
  }
  if (type === "exam") {
    const [row] = await db
      .select({ subjectId: exam.subjectId })
      .from(exam)
      .where(and(eq(exam.id, id), eq(exam.userId, userId), isNull(exam.deletedAt)));
    return row ? { ...none, examId: id, subjectId: row.subjectId } : none;
  }
  return none;
};

/** A session's length in minutes, from its times if it has both. */
export const sessionMinutes = (s: {
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
}) => {
  if (s.startTime && s.endTime) {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return Math.max(0, eh * 60 + em - (sh * 60 + sm));
  }
  return s.durationMinutes ?? 0;
};
