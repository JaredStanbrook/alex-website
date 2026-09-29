// worker/routes/study/public.tsx
//
// Signed-out pages for content the owner has explicitly made public.
//
// Every query here filters on `isPublic` and `deletedAt` in the WHERE clause,
// so a private row is never loaded, not merely hidden. Nothing academic is
// shown — no subjects, assessments, sessions or grades — and link chips are
// left off on purpose: which subject a note belongs to is private too.

import { Hono } from "hono";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { AppEnv, Variables } from "@server/types";
import { note } from "@server/schema/note.schema";
import { resource } from "@server/schema/resource.schema";
import { flashcardSet, studyQuerySchema } from "@server/schema/flashcard.schema";
import { deckOf, stepAfter } from "@server/services/flashcards.service";
import { PublicIndexPage, PublicNotePage } from "@views/study/public";
import { StudyPage } from "@views/study/flashcards";
import { form, idParam } from "./helpers";

export const publicRoute = new Hono<AppEnv>();

const publicNote = and(eq(note.isPublic, true), isNull(note.deletedAt));
const publicResource = and(eq(resource.isPublic, true), isNull(resource.deletedAt));
const publicSet = and(eq(flashcardSet.isPublic, true), isNull(flashcardSet.deletedAt));

export const loadPublicContent = async (db: Variables["db"]) => {
  const [notes, resources, sets] = await Promise.all([
    db
      .select({ id: note.id, title: note.title, body: note.body, updatedAt: note.updatedAt })
      .from(note)
      .where(publicNote)
      .orderBy(desc(note.updatedAt)),
    db
      .select({
        id: resource.id,
        title: resource.title,
        url: resource.url,
        description: resource.description,
      })
      .from(resource)
      .where(publicResource)
      .orderBy(desc(resource.createdAt)),
    db
      .select({
        id: flashcardSet.id,
        title: flashcardSet.title,
        description: flashcardSet.description,
      })
      .from(flashcardSet)
      .where(publicSet)
      .orderBy(desc(flashcardSet.updatedAt)),
  ]);
  return { notes, resources, sets };
};

export type PublicContent = Awaited<ReturnType<typeof loadPublicContent>>;

publicRoute.get("/", async (c) => {
  const content = await loadPublicContent(c.var.db);
  return c.render(<PublicIndexPage app={c.var.app} content={content} />, {
    title: "Shared notes & flashcards",
    description: `Study notes, links and flashcards shared from ${c.var.app.name}.`,
  });
});

publicRoute.get("/notes/:id", async (c) => {
  const id = idParam(c);
  const [row] = await c.var.db
    .select({ id: note.id, title: note.title, body: note.body, updatedAt: note.updatedAt })
    .from(note)
    .where(and(eq(note.id, id), publicNote));
  if (!row) return c.notFound();

  return c.render(<PublicNotePage note={row} locale={c.var.app.locale} />, {
    title: row.title,
    description: (row.body ?? "").replace(/\s+/g, " ").slice(0, 155) || undefined,
    type: "article",
  });
});

const findPublicSet = async (db: Variables["db"], id: number) => {
  const [set] = await db
    .select()
    .from(flashcardSet)
    .where(and(eq(flashcardSet.id, id), publicSet));
  return set;
};

publicRoute.get("/flashcards/:id", (c) => c.redirect(`/public/flashcards/${idParam(c)}/study`));

publicRoute.get("/flashcards/:id/study", form(studyQuerySchema, "query"), async (c) => {
  const id = idParam(c);
  const set = await findPublicSet(c.var.db, id);
  if (!set) return c.notFound();

  // Visitors always see the whole set; "just the tricky ones" is the owner's.
  const deck = await deckOf(c.var.db, set.userId, id, "all");
  return c.render(
    <StudyPage
      set={set}
      step={stepAfter(deck, c.req.valid("query").after)}
      mode="all"
      base={`/public/flashcards/${id}`}
    />,
    { title: set.title, description: set.description ?? undefined },
  );
});
