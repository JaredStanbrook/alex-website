// worker/services/links.service.ts
//
// Everything that reads or writes `content_link`. Routes never touch the table
// directly, so the two rules that keep it honest live in one place:
//
//   1. A link is only written to a target the user owns and has not deleted.
//      The form posts ids, and a forged `subject:999` must not attach a note
//      to somebody else's subject.
//   2. A link is only shown while both ends are live. The ids carry no foreign
//      keys, so every read joins back to the real row and skips soft-deleted
//      ones rather than trusting the link table.

import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import type { Variables } from "@server/types";
import {
  contentLink,
  LINK_TARGET_TYPES,
  type LinkItemType,
  type LinkTargetType,
} from "@server/schema/content-link.schema";
import { subject, type SubjectColour } from "@server/schema/subject.schema";
import { assignment, exam } from "@server/schema/assessment.schema";
import { semester } from "@server/schema/semester.schema";
import { note } from "@server/schema/note.schema";
import { resource } from "@server/schema/resource.schema";
import { flashcardSet } from "@server/schema/flashcard.schema";

type Db = Variables["db"];

export interface LinkRef {
  type: LinkTargetType;
  id: number;
}

/** A linked academic item, ready to render as a chip. */
export interface TargetLabel extends LinkRef {
  label: string;
  colour: SubjectColour;
  href: string;
}

/** A piece of study material linked to an academic item. */
export interface Material {
  type: LinkItemType;
  id: number;
  title: string;
  isPublic: boolean;
  href: string;
}

export interface LinkOptionGroup {
  subject: { id: number; name: string; code: string | null; colour: SubjectColour };
  semesterName: string;
  assignments: { id: number; title: string }[];
  exams: { id: number; title: string }[];
}

const refKey = (r: LinkRef) => `${r.type}:${r.id}`;

/** `["subject:3", "exam:2"]` → refs. Anything malformed is dropped, not trusted. */
export const parseLinkRefs = (values: string[]): LinkRef[] => {
  const seen = new Map<string, LinkRef>();
  for (const value of values) {
    const [type, rawId] = value.split(":");
    const id = Number(rawId);
    if (!(LINK_TARGET_TYPES as readonly string[]).includes(type)) continue;
    if (!Number.isInteger(id) || id <= 0) continue;
    const ref = { type: type as LinkTargetType, id };
    seen.set(refKey(ref), ref);
  }
  return [...seen.values()];
};

export const itemHref = (type: LinkItemType, id: number) =>
  type === "note"
    ? `/notes/${id}`
    : type === "resource"
      ? `/resources#resource-${id}`
      : `/flashcards/${id}`;

const targetHref = (type: LinkTargetType, id: number) =>
  type === "subject"
    ? `/subjects/${id}`
    : type === "assignment"
      ? `/assignments#assignment-${id}`
      : `/exams#exam-${id}`;

/** Keep only the refs that point at live rows `userId` owns. */
const ownedRefs = async (db: Db, userId: string, refs: LinkRef[]): Promise<LinkRef[]> => {
  const idsOf = (type: LinkTargetType) => refs.filter((r) => r.type === type).map((r) => r.id);
  const [subjectIds, assignmentIds, examIds] = LINK_TARGET_TYPES.map(idsOf);

  const [subjects, assignments, exams] = await Promise.all([
    subjectIds.length
      ? db
          .select({ id: subject.id })
          .from(subject)
          .where(
            and(
              eq(subject.userId, userId),
              isNull(subject.deletedAt),
              inArray(subject.id, subjectIds),
            ),
          )
      : [],
    assignmentIds.length
      ? db
          .select({ id: assignment.id })
          .from(assignment)
          .where(
            and(
              eq(assignment.userId, userId),
              isNull(assignment.deletedAt),
              inArray(assignment.id, assignmentIds),
            ),
          )
      : [],
    examIds.length
      ? db
          .select({ id: exam.id })
          .from(exam)
          .where(and(eq(exam.userId, userId), isNull(exam.deletedAt), inArray(exam.id, examIds)))
      : [],
  ]);

  return [
    ...subjects.map((r) => ({ type: "subject" as const, id: r.id })),
    ...assignments.map((r) => ({ type: "assignment" as const, id: r.id })),
    ...exams.map((r) => ({ type: "exam" as const, id: r.id })),
  ];
};

/**
 * Replace an item's links with `refs`. Link rows are join rows, not content,
 * so they are replaced outright rather than soft-deleted — there is no
 * history in "which subjects was this note tagged with last Tuesday".
 */
export const setLinks = async (
  db: Db,
  userId: string,
  itemType: LinkItemType,
  itemId: number,
  refs: LinkRef[],
) => {
  const valid = await ownedRefs(db, userId, refs);
  const clear = db
    .delete(contentLink)
    .where(
      and(
        eq(contentLink.userId, userId),
        eq(contentLink.itemType, itemType),
        eq(contentLink.itemId, itemId),
      ),
    );

  if (valid.length === 0) {
    await clear;
    return;
  }

  const now = new Date().toISOString();
  // One batch, so a failure cannot leave the item with its old links cleared
  // and its new ones missing.
  await db.batch([
    clear,
    db.insert(contentLink).values(
      valid.map((r) => ({
        itemType,
        itemId,
        targetType: r.type,
        targetId: r.id,
        userId,
        updatedAt: now,
      })),
    ),
  ]);
};

/** The item's current links as form values, for pre-ticking the picker. */
export const linkValuesOf = async (
  db: Db,
  userId: string,
  itemType: LinkItemType,
  itemId: number,
): Promise<string[]> => {
  const rows = await db
    .select({ type: contentLink.targetType, id: contentLink.targetId })
    .from(contentLink)
    .where(
      and(
        eq(contentLink.userId, userId),
        eq(contentLink.itemType, itemType),
        eq(contentLink.itemId, itemId),
      ),
    );
  return rows.map((r) => refKey({ type: r.type, id: r.id }));
};

/** Every subject with its assignments and exams, for the link picker. */
export const linkOptions = async (db: Db, userId: string): Promise<LinkOptionGroup[]> => {
  const [semesters, subjects, assignments, exams] = await Promise.all([
    db
      .select({ id: semester.id, name: semester.name, startDate: semester.startDate })
      .from(semester)
      .where(and(eq(semester.userId, userId), isNull(semester.deletedAt))),
    db
      .select()
      .from(subject)
      .where(and(eq(subject.userId, userId), isNull(subject.deletedAt)))
      .orderBy(asc(subject.name)),
    db
      .select({ id: assignment.id, title: assignment.title, subjectId: assignment.subjectId })
      .from(assignment)
      .where(and(eq(assignment.userId, userId), isNull(assignment.deletedAt)))
      .orderBy(asc(assignment.dueDate)),
    db
      .select({ id: exam.id, title: exam.title, subjectId: exam.subjectId })
      .from(exam)
      .where(and(eq(exam.userId, userId), isNull(exam.deletedAt)))
      .orderBy(asc(exam.date)),
  ]);

  const semesterById = new Map(semesters.map((s) => [s.id, s]));

  return subjects
    .filter((s) => semesterById.has(s.semesterId))
    .sort(
      (a, b) =>
        // Newest semester first: that is almost always the one being linked.
        semesterById
          .get(b.semesterId)!
          .startDate.localeCompare(semesterById.get(a.semesterId)!.startDate) ||
        a.name.localeCompare(b.name),
    )
    .map((s) => ({
      subject: { id: s.id, name: s.name, code: s.code, colour: s.colour },
      semesterName: semesterById.get(s.semesterId)!.name,
      assignments: assignments.filter((a) => a.subjectId === s.id),
      exams: exams.filter((e) => e.subjectId === s.id),
    }));
};

/**
 * For each item, the live academic items it links to — the chips under a
 * note's title.
 */
export const targetsFor = async (
  db: Db,
  userId: string,
  itemType: LinkItemType,
  itemIds: number[],
): Promise<Map<number, TargetLabel[]>> => {
  const result = new Map<number, TargetLabel[]>();
  if (itemIds.length === 0) return result;

  const links = await db
    .select()
    .from(contentLink)
    .where(
      and(
        eq(contentLink.userId, userId),
        eq(contentLink.itemType, itemType),
        inArray(contentLink.itemId, itemIds),
      ),
    );
  if (links.length === 0) return result;

  const ids = (type: LinkTargetType) =>
    links.filter((l) => l.targetType === type).map((l) => l.targetId);
  const assignmentIds = ids("assignment");
  const examIds = ids("exam");

  const [subjects, assignments, exams] = await Promise.all([
    db
      .select({ id: subject.id, name: subject.name, code: subject.code, colour: subject.colour })
      .from(subject)
      .where(and(eq(subject.userId, userId), isNull(subject.deletedAt))),
    assignmentIds.length
      ? db
          .select({ id: assignment.id, title: assignment.title, subjectId: assignment.subjectId })
          .from(assignment)
          .where(
            and(
              eq(assignment.userId, userId),
              isNull(assignment.deletedAt),
              inArray(assignment.id, assignmentIds),
            ),
          )
      : [],
    examIds.length
      ? db
          .select({ id: exam.id, title: exam.title, subjectId: exam.subjectId })
          .from(exam)
          .where(and(eq(exam.userId, userId), isNull(exam.deletedAt), inArray(exam.id, examIds)))
      : [],
  ]);

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const assignmentById = new Map(assignments.map((a) => [a.id, a]));
  const examById = new Map(exams.map((e) => [e.id, e]));

  const labelFor = (type: LinkTargetType, id: number): TargetLabel | null => {
    if (type === "subject") {
      const s = subjectById.get(id);
      return s
        ? { type, id, label: s.code || s.name, colour: s.colour, href: targetHref(type, id) }
        : null;
    }
    const row = type === "assignment" ? assignmentById.get(id) : examById.get(id);
    const parent = row ? subjectById.get(row.subjectId) : undefined;
    // An assessment whose subject was deleted is gone too, as far as the user is concerned.
    if (!row || !parent) return null;
    return { type, id, label: row.title, colour: parent.colour, href: targetHref(type, id) };
  };

  for (const link of links) {
    const label = labelFor(link.targetType, link.targetId);
    if (!label) continue;
    const list = result.get(link.itemId) ?? [];
    list.push(label);
    result.set(link.itemId, list);
  }
  return result;
};

/**
 * For each academic item, the live study material linked to it — the "related
 * material" on a subject page or an assignment card.
 */
export const materialFor = async (
  db: Db,
  userId: string,
  targetType: LinkTargetType,
  targetIds: number[],
): Promise<Map<number, Material[]>> => {
  const result = new Map<number, Material[]>();
  if (targetIds.length === 0) return result;

  const links = await db
    .select()
    .from(contentLink)
    .where(
      and(
        eq(contentLink.userId, userId),
        eq(contentLink.targetType, targetType),
        inArray(contentLink.targetId, targetIds),
      ),
    );
  if (links.length === 0) return result;

  const ids = (type: LinkItemType) => links.filter((l) => l.itemType === type).map((l) => l.itemId);
  const [noteIds, resourceIds, setIds] = [ids("note"), ids("resource"), ids("flashcard_set")];

  const [notes, resources, sets] = await Promise.all([
    noteIds.length
      ? db
          .select({ id: note.id, title: note.title, isPublic: note.isPublic })
          .from(note)
          .where(and(eq(note.userId, userId), isNull(note.deletedAt), inArray(note.id, noteIds)))
      : [],
    resourceIds.length
      ? db
          .select({ id: resource.id, title: resource.title, isPublic: resource.isPublic })
          .from(resource)
          .where(
            and(
              eq(resource.userId, userId),
              isNull(resource.deletedAt),
              inArray(resource.id, resourceIds),
            ),
          )
      : [],
    setIds.length
      ? db
          .select({
            id: flashcardSet.id,
            title: flashcardSet.title,
            isPublic: flashcardSet.isPublic,
          })
          .from(flashcardSet)
          .where(
            and(
              eq(flashcardSet.userId, userId),
              isNull(flashcardSet.deletedAt),
              inArray(flashcardSet.id, setIds),
            ),
          )
      : [],
  ]);

  const byType: Record<LinkItemType, Map<number, { title: string; isPublic: boolean }>> = {
    note: new Map(notes.map((n) => [n.id, n])),
    resource: new Map(resources.map((r) => [r.id, r])),
    flashcard_set: new Map(sets.map((s) => [s.id, s])),
  };

  for (const link of links) {
    const item = byType[link.itemType].get(link.itemId);
    if (!item) continue;
    const list = result.get(link.targetId) ?? [];
    list.push({
      type: link.itemType,
      id: link.itemId,
      title: item.title,
      isPublic: item.isPublic,
      href: itemHref(link.itemType, link.itemId),
    });
    result.set(link.targetId, list);
  }
  return result;
};
