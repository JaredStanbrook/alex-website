// worker/routes/study/notes.tsx
//
// Text notes, linkable to subjects, assignments and exams, and optionally
// public.

import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { note, noteFormSchema, noteFilterSchema, type NoteForm } from "@server/schema/note.schema";
import { AccessControl } from "@server/services/access.service";
import {
  linkOptions,
  linkValuesOf,
  parseLinkRefs,
  setLinks,
  targetsFor,
} from "@server/services/links.service";
import { flashToast, htmxResponse } from "@server/lib/htmx-helpers";
import { NoteDetailPage, NoteFormPage, NoteGrid, NoteListPage } from "@views/study/notes";
import { VisibilityToggle } from "@views/study/ui";
import { deleted, form, idParam, nowIso, studyRouter, userOf } from "./helpers";

export const notesRoute = studyRouter();
const access = new AccessControl();

const owned = (userId: string, id?: number) =>
  and(
    eq(note.userId, userId),
    isNull(note.deletedAt),
    id === undefined ? undefined : eq(note.id, id),
  );

// ==========================================
// LIST  (also serves live search)
// ==========================================
notesRoute.get("/", form(noteFilterSchema, "query"), async (c) => {
  const user = userOf(c);
  access.authorize(user, "notes", "read");
  const { q, pinned } = c.req.valid("query");
  const { db } = c.var;

  // `%` and `_` are LIKE wildcards, so a search for "100%" would otherwise
  // match everything. Escaping them only works if the pattern also declares
  // an escape character — SQLite treats a backslash as an ordinary character
  // without the ESCAPE clause, which is why this uses raw sql rather than
  // Drizzle's `like()`.
  const term = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const matches = (column: typeof note.title | typeof note.body) =>
    sql`${column} LIKE ${term} ESCAPE '\\'`;

  const [notes, all] = await Promise.all([
    db
      .select()
      .from(note)
      .where(
        and(
          owned(user.id),
          pinned ? eq(note.pinned, true) : undefined,
          q ? or(matches(note.title), matches(note.body)) : undefined,
        ),
      )
      .orderBy(desc(note.pinned), desc(note.updatedAt)),
    // Unfiltered counts, so the header keeps showing the totals rather than
    // collapsing to the size of the current result set.
    db.select({ pinned: note.pinned }).from(note).where(owned(user.id)),
  ]);
  const targets = await targetsFor(
    db,
    user.id,
    "note",
    notes.map((n) => n.id),
  );

  const props = { notes, targets, locale: c.var.app.locale, query: q, pinnedOnly: pinned };

  // hx-boost makes every ordinary navigation an HTMX request too, so
  // HX-Request alone cannot tell "searching" from "arrived here by link".
  // The search form names its target, and only that gets the bare grid.
  if (c.req.header("HX-Target") === "note-grid") return c.html(<NoteGrid {...props} />);

  return c.render(
    <NoteListPage {...props} total={all.length} pinnedCount={all.filter((n) => n.pinned).length} />,
    { title: "Notes" },
  );
});

// ==========================================
// CREATE
// ==========================================
notesRoute.get("/new", async (c) => {
  const user = userOf(c);
  access.authorize(user, "notes", "create");
  const groups = await linkOptions(c.var.db, user.id);
  const preset = c.req.query("link");
  return htmxResponse(
    c,
    "New note",
    <NoteFormPage groups={groups} links={preset ? [preset] : []} />,
  );
});

const values = (data: NoteForm) => ({
  title: data.title,
  body: data.body || null,
  pinned: data.pinned,
  isPublic: data.isPublic,
  accent: data.accent,
  updatedAt: nowIso(),
});

notesRoute.post("/", form(noteFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "notes", "create");
  const data = c.req.valid("form");

  const [created] = await c.var.db
    .insert(note)
    .values({ ...values(data), userId: user.id })
    .returning({ id: note.id });
  if (created) await setLinks(c.var.db, user.id, "note", created.id, parseLinkRefs(data.links));

  flashToast(c, "Note saved");
  return c.redirect(created ? `/notes/${created.id}` : "/notes");
});

// ==========================================
// READ
// ==========================================
notesRoute.get("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "notes", "read");

  const [row] = await c.var.db.select().from(note).where(owned(user.id, id));
  if (!row) return c.notFound();
  const targets = await targetsFor(c.var.db, user.id, "note", [id]);

  return c.render(
    <NoteDetailPage note={row} targets={targets.get(id)} locale={c.var.app.locale} />,
    {
      title: row.title,
    },
  );
});

// ==========================================
// UPDATE
// ==========================================
notesRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(note).where(owned(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "notes", "update", existing.userId);

  const [groups, links] = await Promise.all([
    linkOptions(c.var.db, user.id),
    linkValuesOf(c.var.db, user.id, "note", id),
  ]);
  return htmxResponse(
    c,
    "Edit note",
    <NoteFormPage note={existing} groups={groups} links={links} />,
  );
});

notesRoute.post("/:id", form(noteFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "notes", "update", user.id);
  const data = c.req.valid("form");

  const changed = await c.var.db
    .update(note)
    .set(values(data))
    .where(owned(user.id, id))
    .returning({ id: note.id });
  if (changed.length === 0) return c.notFound();
  await setLinks(c.var.db, user.id, "note", id, parseLinkRefs(data.links));

  flashToast(c, "Note saved");
  return c.redirect(`/notes/${id}`);
});

/** Public ⇄ private. Answers with the redrawn toggle. */
notesRoute.post("/:id/visibility", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "notes", "update", user.id);

  const [updated] = await c.var.db
    .update(note)
    .set({ isPublic: sql`NOT ${note.isPublic}`, updatedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ id: note.id, isPublic: note.isPublic });
  if (!updated) return c.notFound();

  return c.html(<VisibilityToggle base="/notes" id={id} isPublic={updated.isPublic} />);
});

// ==========================================
// DELETE (soft)
// ==========================================
notesRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "notes", "delete", user.id);

  const changed = await c.var.db
    .update(note)
    .set({ deletedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ id: note.id });

  return deleted(c, changed.length, { noun: "note", listHref: "/notes" });
});
