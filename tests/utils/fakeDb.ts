import { users, authLogs } from "../../worker/schema/auth.schema";
import { note } from "../../worker/schema/note.schema";
import { semester } from "../../worker/schema/semester.schema";
import { subject } from "../../worker/schema/subject.schema";
import { assignment, exam } from "../../worker/schema/assessment.schema";
import { resource } from "../../worker/schema/resource.schema";
import { studySession } from "../../worker/schema/study-session.schema";
import { flashcard, flashcardSet } from "../../worker/schema/flashcard.schema";
import { contentLink } from "../../worker/schema/content-link.schema";

/**
 * A hand-rolled stand-in for a Drizzle D1 client.
 *
 * It is deliberately dumb: it records which table a query selected `from` and
 * replays a fixture array. That is enough to smoke-test that every page
 * renders, without a real D1 binding. For query-shape assertions, use
 * `wrangler d1 execute --local` against a real migration instead.
 */

export type MockData = {
  users: any[];
  notes: any[];
  authLogs: any[];
  semesters: any[];
  subjects: any[];
  assignments: any[];
  exams: any[];
  resources: any[];
  sessions: any[];
  flashcardSets: any[];
  flashcards: any[];
  contentLinks: any[];
};

type QueryState = {
  fields?: Record<string, any> | undefined;
  fromTable?: unknown;
};

const resolveSelect = (data: MockData, state: QueryState) => {
  const fields = state.fields || {};

  // Joined selections are keyed by alias — match on the alias set.
  if ("log" in fields && "user" in fields) {
    return data.authLogs.map((log) => ({ log, user: data.users[0] ?? null }));
  }

  if ("count" in fields) {
    return [{ count: data.notes.length }];
  }

  switch (state.fromTable) {
    case users:
      return data.users;
    case note:
      return data.notes;
    case authLogs:
      return data.authLogs;
    case semester:
      return data.semesters;
    case subject:
      return data.subjects;
    case assignment:
      return data.assignments;
    case exam:
      return data.exams;
    case resource:
      return data.resources;
    case studySession:
      return data.sessions;
    case flashcardSet:
      return data.flashcardSets;
    case flashcard:
      return data.flashcards;
    case contentLink:
      return data.contentLinks;
    default:
      return [];
  }
};

const createQuery = (data: MockData, fields?: Record<string, any>) => {
  const state: QueryState = { fields };
  const query: any = {
    from(table: unknown) {
      state.fromTable = table;
      return query;
    },
    where: () => query,
    innerJoin: () => query,
    leftJoin: () => query,
    groupBy: () => query,
    orderBy: () => query,
    limit: () => query,
    offset: () => query,
    get() {
      return Promise.resolve(resolveSelect(data, state)[0]);
    },
    returning() {
      return Promise.resolve(resolveSelect(data, state));
    },
    then(resolve: any, reject: any) {
      return Promise.resolve(resolveSelect(data, state)).then(resolve, reject);
    },
  };
  return query;
};

export const createFakeDb = (data: MockData) => ({
  select(fields?: Record<string, any>) {
    return createQuery(data, fields);
  },
  insert() {
    return {
      values() {
        return {
          returning() {
            return Promise.resolve([]);
          },
          then(resolve: any, reject: any) {
            return Promise.resolve([]).then(resolve, reject);
          },
        };
      },
    };
  },
  /**
   * Resolves to the table's fixture rows, so a `.returning()` update reads as
   * "one row changed" and the route renders its success path.
   */
  update(table: unknown) {
    const rows = () => Promise.resolve(resolveSelect(data, { fromTable: table }).slice(0, 1));
    return {
      set() {
        return {
          where() {
            return {
              returning: rows,
              then(resolve: any, reject: any) {
                return rows().then(resolve, reject);
              },
            };
          },
        };
      },
    };
  },
  delete() {
    return {
      where() {
        return {
          then(resolve: any, reject: any) {
            return Promise.resolve([]).then(resolve, reject);
          },
        };
      },
    };
  },
  batch(queries: unknown[]) {
    return Promise.all(queries);
  },
});

export const createMockData = (): MockData => {
  const now = new Date().toISOString();
  const userId = "user-1";

  const today = new Date().toISOString().slice(0, 10);
  const owned = { userId, createdAt: now, updatedAt: now, deletedAt: null };

  return {
    semesters: [
      {
        id: 1,
        name: "Semester 2",
        startDate: today,
        endDate: today,
        description: null,
        isCurrent: true,
        ...owned,
      },
    ],
    subjects: [
      {
        id: 1,
        semesterId: 1,
        name: "Human Physiology",
        code: "PHYS1001",
        description: null,
        colour: "2",
        credits: 6,
        finalMark: null,
        ...owned,
      },
    ],
    assignments: [
      {
        id: 1,
        subjectId: 1,
        title: "Lab report",
        description: "1500 words",
        dueDate: today,
        status: "in_progress",
        mark: 17,
        maxMark: 20,
        weight: 30,
        ...owned,
      },
    ],
    exams: [
      {
        id: 1,
        subjectId: 1,
        title: "Final exam",
        description: null,
        date: today,
        time: "09:30",
        mark: null,
        maxMark: null,
        weight: 50,
        ...owned,
      },
    ],
    resources: [
      {
        id: 1,
        title: "Lecture recording",
        url: "https://example.com/lecture",
        description: null,
        isPublic: true,
        ...owned,
      },
    ],
    sessions: [
      {
        id: 1,
        title: "Revise chapter 4",
        date: today,
        startTime: "10:00",
        endTime: "11:30",
        durationMinutes: null,
        status: "planned",
        notes: null,
        subjectId: 1,
        assignmentId: 1,
        examId: null,
        completedAt: null,
        ...owned,
      },
    ],
    flashcardSets: [
      {
        id: 1,
        title: "Cranial nerves",
        description: null,
        isPublic: true,
        lastStudiedAt: null,
        ...owned,
      },
    ],
    flashcards: [
      {
        id: 1,
        setId: 1,
        front: "Olfactory nerve?",
        back: "CN I — smell",
        position: 1,
        confidence: "learning",
        reviewCount: 1,
        lastReviewedAt: null,
        ...owned,
      },
    ],
    contentLinks: [
      { id: 1, itemType: "note", itemId: 1, targetType: "subject", targetId: 1, ...owned },
      {
        id: 2,
        itemType: "flashcard_set",
        itemId: 1,
        targetType: "assignment",
        targetId: 1,
        ...owned,
      },
    ],
    users: [
      {
        id: userId,
        username: "testuser",
        email: "test@example.com",
        displayName: "Test User",
        totpEnabled: false,
        isActive: true,
        emailVerified: true,
        phoneNumber: null,
        phoneVerified: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
        roles: ["admin"],
        permissions: ["notes.read", "notes.create", "notes.update", "notes.delete"],
      },
    ],
    notes: [
      {
        id: 1,
        title: "First note",
        body: "Body text",
        pinned: true,
        accent: "1",
        isPublic: true,
        deletedAt: null,
        userId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    authLogs: [
      {
        id: "log-1",
        userId,
        event: "login.success",
        method: "password",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        metadata: null,
        createdAt: now,
      },
    ],
  };
};
