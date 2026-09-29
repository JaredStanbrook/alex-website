// worker/routes/study/flashcards.tsx

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import type { Variables } from "@server/types";
import {
  flashcard,
  flashcardFormSchema,
  flashcardSet,
  flashcardSetFormSchema,
  reviewSchema,
  studyQuerySchema,
} from "@server/schema/flashcard.schema";
import { AccessControl } from "@server/services/access.service";
import {
  linkOptions,
  linkValuesOf,
  parseLinkRefs,
  setLinks,
  targetsFor,
} from "@server/services/links.service";
import { deckOf, stepAfter } from "@server/services/flashcards.service";
import { flashToast, htmxResponse, htmxToast } from "@server/lib/htmx-helpers";
import {
  CardEditPage,
  CardList,
  FlashcardSetFormPage,
  FlashcardSetListPage,
  FlashcardSetPage,
  StudyPage,
  StudyStage,
} from "@views/study/flashcards";
import { VisibilityToggle } from "@views/study/ui";
import { deleted, form, idParam, nowIso, studyRouter, userOf } from "./helpers";

export const flashcardsRoute = studyRouter();
const access = new AccessControl();

const ownedSet = (userId: string, id?: number) =>
  and(
    eq(flashcardSet.userId, userId),
    isNull(flashcardSet.deletedAt),
    id === undefined ? undefined : eq(flashcardSet.id, id),
  );

const ownedCard = (userId: string, setId: number, cardId?: number) =>
  and(
    eq(flashcard.userId, userId),
    eq(flashcard.setId, setId),
    isNull(flashcard.deletedAt),
    cardId === undefined ? undefined : eq(flashcard.id, cardId),
  );

const cardsOf = (db: Variables["db"], userId: string, setId: number) =>
  deckOf(db, userId, setId, "all");

// ==========================================
// SETS
// ==========================================

flashcardsRoute.get("/", async (c) => {
  const user = userOf(c);
  access.authorize(user, "flashcards", "read");
  const { db } = c.var;

  const [sets, counts] = await Promise.all([
    db.select().from(flashcardSet).where(ownedSet(user.id)).orderBy(desc(flashcardSet.updatedAt)),
    db
      .select({
        setId: flashcard.setId,
        total: sql<number>`count(*)`,
        known: sql<number>`sum(case when ${flashcard.confidence} = 'known' then 1 else 0 end)`,
      })
      .from(flashcard)
      .where(and(eq(flashcard.userId, user.id), isNull(flashcard.deletedAt)))
      .groupBy(flashcard.setId),
  ]);
  const targets = await targetsFor(
    db,
    user.id,
    "flashcard_set",
    sets.map((s) => s.id),
  );
  const countBySet = new Map(
    counts.map((r) => [r.setId, { total: Number(r.total) || 0, known: Number(r.known) || 0 }]),
  );

  return c.render(<FlashcardSetListPage sets={sets} counts={countBySet} targets={targets} />, {
    title: "Flashcards",
  });
});

flashcardsRoute.get("/new", async (c) => {
  const user = userOf(c);
  access.authorize(user, "flashcards", "create");
  const groups = await linkOptions(c.var.db, user.id);
  const preset = c.req.query("link");
  return htmxResponse(
    c,
    "New flashcard set",
    <FlashcardSetFormPage groups={groups} links={preset ? [preset] : []} />,
  );
});

flashcardsRoute.post("/", form(flashcardSetFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "flashcards", "create");
  const data = c.req.valid("form");

  const [created] = await c.var.db
    .insert(flashcardSet)
    .values({
      title: data.title,
      description: data.description ?? null,
      isPublic: data.isPublic,
      userId: user.id,
      updatedAt: nowIso(),
    })
    .returning({ id: flashcardSet.id });
  if (created)
    await setLinks(c.var.db, user.id, "flashcard_set", created.id, parseLinkRefs(data.links));

  flashToast(c, "Set created. Time to add some cards!");
  return c.redirect(created ? `/flashcards/${created.id}` : "/flashcards");
});

flashcardsRoute.get("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "flashcards", "read");

  const [set] = await c.var.db.select().from(flashcardSet).where(ownedSet(user.id, id));
  if (!set) return c.notFound();
  const [cards, targets] = await Promise.all([
    cardsOf(c.var.db, user.id, id),
    targetsFor(c.var.db, user.id, "flashcard_set", [id]),
  ]);

  return c.render(<FlashcardSetPage set={set} cards={cards} targets={targets.get(id)} />, {
    title: set.title,
  });
});

flashcardsRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(flashcardSet).where(ownedSet(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "flashcards", "update", existing.userId);

  const [groups, links] = await Promise.all([
    linkOptions(c.var.db, user.id),
    linkValuesOf(c.var.db, user.id, "flashcard_set", id),
  ]);
  return htmxResponse(
    c,
    "Edit set",
    <FlashcardSetFormPage set={existing} groups={groups} links={links} />,
  );
});

flashcardsRoute.post("/:id", form(flashcardSetFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "flashcards", "update", user.id);
  const data = c.req.valid("form");

  const changed = await c.var.db
    .update(flashcardSet)
    .set({
      title: data.title,
      description: data.description ?? null,
      isPublic: data.isPublic,
      updatedAt: nowIso(),
    })
    .where(ownedSet(user.id, id))
    .returning({ id: flashcardSet.id });
  if (changed.length === 0) return c.notFound();
  await setLinks(c.var.db, user.id, "flashcard_set", id, parseLinkRefs(data.links));

  flashToast(c, "Set saved");
  return c.redirect(`/flashcards/${id}`);
});

flashcardsRoute.post("/:id/visibility", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "flashcards", "update", user.id);

  const [updated] = await c.var.db
    .update(flashcardSet)
    .set({ isPublic: sql`NOT ${flashcardSet.isPublic}`, updatedAt: nowIso() })
    .where(ownedSet(user.id, id))
    .returning({ isPublic: flashcardSet.isPublic });
  if (!updated) return c.notFound();

  return c.html(<VisibilityToggle base="/flashcards" id={id} isPublic={updated.isPublic} />);
});

flashcardsRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "flashcards", "delete", user.id);

  const changed = await c.var.db
    .update(flashcardSet)
    .set({ deletedAt: nowIso() })
    .where(ownedSet(user.id, id))
    .returning({ id: flashcardSet.id });

  return deleted(c, changed.length, { noun: "flashcard set", listHref: "/flashcards" });
});

// ==========================================
// CARDS
// ==========================================

/** Add a card. Answers with the redrawn list, so the new card appears in place. */
flashcardsRoute.post("/:id/cards", form(flashcardFormSchema), async (c) => {
  const user = userOf(c);
  const setId = idParam(c);
  access.authorize(user, "flashcards", "create");
  const data = c.req.valid("form");
  const { db } = c.var;

  const [set] = await db
    .select({ id: flashcardSet.id })
    .from(flashcardSet)
    .where(ownedSet(user.id, setId));
  if (!set) return c.notFound();

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${flashcard.position}), 0) + 1` })
    .from(flashcard)
    .where(and(eq(flashcard.userId, user.id), eq(flashcard.setId, setId)));

  await db.batch([
    db.insert(flashcard).values({
      setId,
      front: data.front,
      back: data.back,
      position: Number(next) || 1,
      userId: user.id,
      updatedAt: nowIso(),
    }),
    db.update(flashcardSet).set({ updatedAt: nowIso() }).where(ownedSet(user.id, setId)),
  ]);

  htmxToast(c, "Card added");
  return c.html(<CardList setId={setId} cards={await cardsOf(c.var.db, user.id, setId)} />);
});

flashcardsRoute.get("/:id/cards/:cardId/edit", async (c) => {
  const user = userOf(c);
  const setId = idParam(c);
  const cardId = idParam(c, "cardId");
  const [card] = await c.var.db
    .select()
    .from(flashcard)
    .where(ownedCard(user.id, setId, cardId));
  if (!card) return c.notFound();
  access.authorize(user, "flashcards", "update", card.userId);
  return htmxResponse(c, "Edit card", <CardEditPage card={card} />);
});

flashcardsRoute.post("/:id/cards/:cardId", form(flashcardFormSchema), async (c) => {
  const user = userOf(c);
  const setId = idParam(c);
  const cardId = idParam(c, "cardId");
  access.authorize(user, "flashcards", "update", user.id);
  const data = c.req.valid("form");

  const changed = await c.var.db
    .update(flashcard)
    .set({ front: data.front, back: data.back, updatedAt: nowIso() })
    .where(ownedCard(user.id, setId, cardId))
    .returning({ id: flashcard.id });
  if (changed.length === 0) return c.notFound();

  flashToast(c, "Card saved");
  return c.redirect(`/flashcards/${setId}#card-${cardId}`);
});

/** Swap a card with its neighbour. Answers with the redrawn list. */
flashcardsRoute.post("/:id/cards/:cardId/move", async (c) => {
  const user = userOf(c);
  const setId = idParam(c);
  const cardId = idParam(c, "cardId");
  access.authorize(user, "flashcards", "update", user.id);
  const direction = c.req.query("dir") === "up" ? -1 : 1;
  const { db } = c.var;

  const cards = await cardsOf(c.var.db, user.id, setId);
  const i = cards.findIndex((card) => card.id === cardId);
  const j = i + direction;
  if (i >= 0 && j >= 0 && j < cards.length) {
    const [a, b] = [cards[i], cards[j]];
    // Positions can collide after deletes; give them distinct values while swapping.
    const [pa, pb] =
      a.position === b.position ? [b.position + direction, a.position] : [b.position, a.position];
    await db.batch([
      db
        .update(flashcard)
        .set({ position: pa })
        .where(ownedCard(user.id, setId, a.id)),
      db
        .update(flashcard)
        .set({ position: pb })
        .where(ownedCard(user.id, setId, b.id)),
    ]);
  }

  return c.html(<CardList setId={setId} cards={await cardsOf(c.var.db, user.id, setId)} />);
});

flashcardsRoute.delete("/:id/cards/:cardId", async (c) => {
  const user = userOf(c);
  const setId = idParam(c);
  const cardId = idParam(c, "cardId");
  access.authorize(user, "flashcards", "delete", user.id);

  const changed = await c.var.db
    .update(flashcard)
    .set({ deletedAt: nowIso() })
    .where(ownedCard(user.id, setId, cardId))
    .returning({ id: flashcard.id });

  return deleted(c, changed.length, { noun: "card", listHref: `/flashcards/${setId}` });
});

// ==========================================
// STUDY
// ==========================================

flashcardsRoute.get("/:id/study", form(studyQuerySchema, "query"), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "flashcards", "read");
  const { mode, after } = c.req.valid("query");

  const [set] = await c.var.db.select().from(flashcardSet).where(ownedSet(user.id, id));
  if (!set) return c.notFound();
  const deck = await deckOf(c.var.db, user.id, id, mode);

  return c.render(
    <StudyPage
      set={set}
      step={stepAfter(deck, after)}
      mode={mode}
      base={`/flashcards/${id}`}
      owner
    />,
    {
      title: `Study: ${set.title}`,
    },
  );
});

/**
 * Record how a card went and deal the next one. The deck is re-read after
 * the write, so in learning mode a card just marked known has already left it.
 */
flashcardsRoute.post("/:id/cards/:cardId/review", form(reviewSchema), async (c) => {
  const user = userOf(c);
  const setId = idParam(c);
  const cardId = idParam(c, "cardId");
  access.authorize(user, "flashcards", "update", user.id);
  const { result, mode } = c.req.valid("form");
  const { db } = c.var;

  const [card] = await db
    .update(flashcard)
    .set({
      confidence: result,
      reviewCount: sql`${flashcard.reviewCount} + 1`,
      lastReviewedAt: nowIso(),
    })
    .where(ownedCard(user.id, setId, cardId))
    .returning({ position: flashcard.position });
  if (!card) return c.notFound();

  await db.update(flashcardSet).set({ lastStudiedAt: nowIso() }).where(ownedSet(user.id, setId));
  const deck = await deckOf(db, user.id, setId, mode);

  return c.html(
    <StudyStage
      step={stepAfter(deck, card.position)}
      mode={mode}
      base={`/flashcards/${setId}`}
      owner
    />,
  );
});
