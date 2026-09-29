import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";

import app from "../worker/app";
import type { AppEnv } from "../worker/types";
import { users } from "../worker/schema/auth.schema";
import { semester } from "../worker/schema/semester.schema";
import { subject } from "../worker/schema/subject.schema";
import { note } from "../worker/schema/note.schema";
import { flashcard, flashcardSet } from "../worker/schema/flashcard.schema";
import { bandFor, gpaOf, percentOf, subjectResult } from "../worker/lib/grades";
import { pickCurrentSemester } from "../worker/services/study.service";
import { stepAfter } from "../worker/services/flashcards.service";
import {
  linkValuesOf,
  parseLinkRefs,
  setLinks,
  targetsFor,
} from "../worker/services/links.service";
import { createRealDb } from "./utils/realDb";

/**
 * The study hub's own rules. The maths is tested directly; everything that is
 * really a claim about a `where` clause — whose rows, which ones are public —
 * runs against a real database, because the fake db ignores `where` entirely.
 */

describe("grades", () => {
  it("reads a mark with no total as a percentage", () => {
    expect(percentOf({ mark: 17, maxMark: 20 })).toBe(85);
    expect(percentOf({ mark: 72, maxMark: null })).toBe(72);
    expect(percentOf({ mark: null, maxMark: 20 })).toBeNull();
  });

  it("puts every mark in a band, including the edges", () => {
    expect(bandFor(80).short).toBe("HD");
    expect(bandFor(79.99).short).toBe("D");
    expect(bandFor(50).short).toBe("P");
    expect(bandFor(0).short).toBe("N");
  });

  it("weights the estimate by each assessment's weight", () => {
    const r = subjectResult(null, [
      { mark: 18, maxMark: 20, weight: 20 }, // 90%
      { mark: 60, maxMark: 100, weight: 60 }, // 60%
      { mark: null, maxMark: null, weight: 20 }, // not marked: ignored
    ]);
    expect(r.source).toBe("estimate");
    expect(r.percent).toBeCloseTo((90 * 20 + 60 * 60) / 80);
    expect(r.weightMarked).toBe(80);
  });

  it("averages evenly when nothing has a weight", () => {
    const r = subjectResult(null, [
      { mark: 80, maxMark: null, weight: null },
      { mark: 60, maxMark: null, weight: null },
    ]);
    expect(r.percent).toBe(70);
  });

  it("prefers the final mark, and says so", () => {
    const r = subjectResult(55, [{ mark: 90, maxMark: 100, weight: 100 }]);
    expect(r).toMatchObject({ percent: 55, source: "final" });
  });

  it("computes a credit-weighted GPA over graded subjects only", () => {
    const gpa = gpaOf([
      { credits: 6, result: subjectResult(85, []) }, // 7
      { credits: 12, result: subjectResult(65, []) }, // 5
      { credits: 6, result: subjectResult(null, []) }, // ungraded: left out
    ]);
    expect(gpa.value).toBeCloseTo((7 * 6 + 5 * 12) / 18);
    expect(gpa.credits).toBe(18);
    expect(gpa.provisional).toBe(false);
    expect(gpaOf([]).value).toBeNull();
  });
});

describe("current semester", () => {
  const s = (startDate: string, endDate: string, isCurrent = false) => ({
    startDate,
    endDate,
    isCurrent,
  });

  it("prefers an explicit choice, then today's, then the next, then the latest", () => {
    const past = s("2026-02-01", "2026-06-01");
    const now = s("2026-07-01", "2026-11-01");
    const next = s("2027-02-01", "2027-06-01");

    expect(pickCurrentSemester([past, now, next], "2026-08-01")).toBe(now);
    expect(pickCurrentSemester([past, { ...next, isCurrent: true }], "2026-08-01")?.startDate).toBe(
      "2027-02-01",
    );
    expect(pickCurrentSemester([past, next], "2026-12-01")).toBe(next);
    expect(pickCurrentSemester([past], "2026-12-01")).toBe(past);
    expect(pickCurrentSemester([], "2026-12-01")).toBeNull();
  });
});

describe("flashcard study order", () => {
  const card = (id: number, position: number) => ({ id, position }) as any;
  const deck = [card(1, 1), card(2, 2), card(3, 5)];

  it("walks the deck by position, so a card leaving it does not skip the next", () => {
    expect(stepAfter(deck).card?.id).toBe(1);
    expect(stepAfter(deck, 2)).toMatchObject({ index: 3, total: 3 });
    expect(stepAfter(deck, 2).card?.id).toBe(3);
    // Card 2 was just marked known and left the deck: still lands on card 3.
    expect(stepAfter([deck[0], deck[2]], 2).card?.id).toBe(3);
    expect(stepAfter(deck, 5).card).toBeNull();
  });
});

describe("links", () => {
  it("parses only well-formed refs, once each", () => {
    expect(
      parseLinkRefs(["subject:3", "subject:3", "exam:0", "note:2", "assignment:x", "exam:4"]),
    ).toEqual([
      { type: "subject", id: 3 },
      { type: "exam", id: 4 },
    ]);
  });
});

// ==========================================
// AGAINST A REAL DATABASE
// ==========================================

let db: any;
const now = new Date().toISOString();

const seedUser = async (id: string) => {
  await db.insert(users).values({ id, email: `${id}@example.com`, updatedAt: now });
};

const seedSubject = async (userId: string) => {
  const [sem] = await db
    .insert(semester)
    .values({ name: "S1", startDate: "2026-02-01", endDate: "2026-06-01", userId, updatedAt: now })
    .returning();
  const [sub] = await db
    .insert(subject)
    .values({ semesterId: sem.id, name: "Anatomy", userId, updatedAt: now })
    .returning();
  return sub;
};

beforeEach(async () => {
  db = createRealDb().db;
  await seedUser("owner");
  await seedUser("other");
});

describe("links against a real database", () => {
  it("never links to a subject the user does not own", async () => {
    const mine = await seedSubject("owner");
    const theirs = await seedSubject("other");
    const [n] = await db
      .insert(note)
      .values({ title: "Muscles", userId: "owner", updatedAt: now })
      .returning();

    await setLinks(db, "owner", "note", n.id, [
      { type: "subject", id: mine.id },
      { type: "subject", id: theirs.id },
    ]);

    expect(await linkValuesOf(db, "owner", "note", n.id)).toEqual([`subject:${mine.id}`]);
  });

  it("replaces the links rather than adding to them", async () => {
    const a = await seedSubject("owner");
    const b = await seedSubject("owner");
    const [n] = await db
      .insert(note)
      .values({ title: "Bones", userId: "owner", updatedAt: now })
      .returning();

    await setLinks(db, "owner", "note", n.id, [{ type: "subject", id: a.id }]);
    await setLinks(db, "owner", "note", n.id, [{ type: "subject", id: b.id }]);
    expect(await linkValuesOf(db, "owner", "note", n.id)).toEqual([`subject:${b.id}`]);

    await setLinks(db, "owner", "note", n.id, []);
    expect(await linkValuesOf(db, "owner", "note", n.id)).toEqual([]);
  });

  it("stops showing a link once its subject is deleted", async () => {
    const sub = await seedSubject("owner");
    const [n] = await db
      .insert(note)
      .values({ title: "Nerves", userId: "owner", updatedAt: now })
      .returning();
    await setLinks(db, "owner", "note", n.id, [{ type: "subject", id: sub.id }]);
    expect((await targetsFor(db, "owner", "note", [n.id])).get(n.id)).toHaveLength(1);

    const { eq } = await import("drizzle-orm");
    await db.update(subject).set({ deletedAt: now }).where(eq(subject.id, sub.id));
    expect((await targetsFor(db, "owner", "note", [n.id])).get(n.id)).toBeUndefined();
  });
});

describe("what visitors and the owner can reach", () => {
  const appFor = (user: any | null) => {
    const wrapper = new Hono<AppEnv>();
    wrapper.use("*", async (c, next) => {
      c.set("db", db);
      c.set("app", {
        name: "Hub",
        tagline: "",
        locale: "en-AU",
        currency: "AUD",
        timezone: "UTC",
        origin: "http://x",
      });
      c.set("authConfig", { methods: new Set(["password"]) } as any);
      c.set("auth", { user, isRegistrationOpen: async () => false } as any);
      await next();
    });
    wrapper.route("/", app);
    return (path: string) => wrapper.fetch(new Request(`http://localhost${path}`), {} as any);
  };
  const owner = { id: "owner", email: "owner@example.com", roles: ["admin"], permissions: [] };

  it("serves a public note to a visitor, and 404s a private or deleted one", async () => {
    const [shared] = await db
      .insert(note)
      .values({ title: "Shared", isPublic: true, userId: "owner", updatedAt: now })
      .returning();
    const [secret] = await db
      .insert(note)
      .values({ title: "Secret", userId: "owner", updatedAt: now })
      .returning();
    const [gone] = await db
      .insert(note)
      .values({ title: "Gone", isPublic: true, deletedAt: now, userId: "owner", updatedAt: now })
      .returning();

    const visit = appFor(null);
    expect((await visit(`/public/notes/${shared.id}`)).status).toBe(200);
    expect((await visit(`/public/notes/${secret.id}`)).status).toBe(404);
    expect((await visit(`/public/notes/${gone.id}`)).status).toBe(404);

    const index = await (await visit("/public")).text();
    expect(index).toContain("Shared");
    expect(index).not.toContain("Secret");
    expect(index).not.toContain("Gone");
  });

  it("lets a visitor flip through a public set but not a private one", async () => {
    const [open] = await db
      .insert(flashcardSet)
      .values({ title: "Open set", isPublic: true, userId: "owner", updatedAt: now })
      .returning();
    const [closed] = await db
      .insert(flashcardSet)
      .values({ title: "Closed set", userId: "owner", updatedAt: now })
      .returning();
    await db.insert(flashcard).values([
      {
        setId: open.id,
        front: "Front A",
        back: "Back A",
        position: 1,
        userId: "owner",
        updatedAt: now,
      },
      {
        setId: closed.id,
        front: "Front B",
        back: "Back B",
        position: 1,
        userId: "owner",
        updatedAt: now,
      },
    ]);

    const visit = appFor(null);
    const page = await (await visit(`/public/flashcards/${open.id}/study`)).text();
    expect(page).toContain("Front A");
    // No review buttons: a visitor's answers are not recorded.
    expect(page).not.toContain("/review");
    expect((await visit(`/public/flashcards/${closed.id}/study`)).status).toBe(404);
  });

  it("scopes the owner's own pages to the owner's rows", async () => {
    const [theirs] = await db
      .insert(note)
      .values({ title: "Not yours", userId: "other", updatedAt: now })
      .returning();
    const visit = appFor(owner);
    expect((await visit(`/notes/${theirs.id}`)).status).toBe(404);
    expect(await (await visit("/notes")).text()).not.toContain("Not yours");
  });
});
