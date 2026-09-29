// worker/views/study/notes.tsx

import type { SelectNote, NoteAccent } from "@server/schema/note.schema";
import { NOTE_ACCENTS } from "@server/schema/note.schema";
import type { LinkOptionGroup, TargetLabel } from "@server/services/links.service";
import { formatDateShort } from "@views/lib/utils";
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD,
  Checkbox,
  DeleteButton,
  EmptyState,
  Field,
  FormCard,
  ICON_BTN,
  INPUT,
  LinkPicker,
  Page,
  PublicPill,
  TEXTAREA,
  TargetChips,
  VisibilityToggle,
} from "./ui";

/**
 * Accent slot → theme tokens, written out in full because Tailwind never
 * generates an interpolated class name.
 */
const ACCENTS: Record<NoteAccent, { bar: string; swatch: string; label: string }> = {
  neutral: { bar: "bg-border", swatch: "bg-muted-foreground/40", label: "Plain" },
  "1": { bar: "bg-chart-1", swatch: "bg-chart-1", label: "Leaf" },
  "2": { bar: "bg-chart-2", swatch: "bg-chart-2", label: "Honey" },
  "3": { bar: "bg-chart-3", swatch: "bg-chart-3", label: "Lake" },
  "4": { bar: "bg-chart-4", swatch: "bg-chart-4", label: "Sunny" },
  "5": { bar: "bg-chart-5", swatch: "bg-chart-5", label: "Clay" },
};

const accentOf = (n: SelectNote) => ACCENTS[n.accent as NoteAccent] ?? ACCENTS.neutral;

interface NoteListProps {
  notes: SelectNote[];
  targets: Map<number, TargetLabel[]>;
  locale: string;
  query: string;
  pinnedOnly: boolean;
}

// ==========================================
// CARD + GRID
// ==========================================

export const NoteCard = ({
  note,
  targets,
  locale,
}: {
  note: SelectNote;
  targets?: TargetLabel[];
  locale: string;
}) => (
  <article
    id={`note-${note.id}`}
    class={`${CARD} relative mt-3 flex flex-col transition-all hover:-translate-y-0.5 hover:rotate-[0.4deg] hover:shadow-md`}
  >
    {/* A strip of washi tape in the note's colour holds it to the page. */}
    <span aria-hidden="true" class={`washi ${accentOf(note).bar}`}></span>
    <div class="flex flex-1 flex-col gap-2 p-5 pt-6">
      <div class="flex items-start justify-between gap-2">
        <h3 class="min-w-0 font-serif text-lg font-medium leading-snug line-clamp-2">
          <a href={`/notes/${note.id}`} class="after:absolute after:inset-0 hover:text-primary">
            {note.title}
          </a>
        </h3>
        {note.pinned ? (
          <i data-lucide="pin" class="h-4 w-4 shrink-0 text-primary" title="Pinned"></i>
        ) : null}
      </div>
      {note.body ? (
        <p class="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">{note.body}</p>
      ) : (
        <p class="text-sm italic text-muted-foreground/70">Empty for now</p>
      )}
      {/* Above the card-wide link, so the chips stay clickable. */}
      <div class="relative z-10">
        <TargetChips targets={targets} />
      </div>
      <div class="relative z-10 mt-auto flex items-center justify-between gap-2 pt-2">
        <span class="flex items-center gap-2 text-xs text-muted-foreground">
          {formatDateShort(note.updatedAt, locale)}
          <PublicPill isPublic={note.isPublic} />
        </span>
        <div class="flex items-center">
          <a href={`/notes/${note.id}/edit`} aria-label={`Edit ${note.title}`} class={ICON_BTN}>
            <i data-lucide="pencil" class="h-4 w-4"></i>
          </a>
          <DeleteButton url={`/notes/${note.id}`} what={note.title} target={`note-${note.id}`} />
        </div>
      </div>
    </div>
  </article>
);

export const NoteGrid = ({ notes, targets, locale, query, pinnedOnly }: NoteListProps) => {
  const filtered = Boolean(query) || pinnedOnly;
  return (
    <div id="note-grid" class="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {notes.length === 0 ? (
        <div class="col-span-full">
          <EmptyState
            icon={filtered ? "search-x" : "notebook-pen"}
            title={filtered ? "Nothing matches that" : "Your notebook is empty"}
            body={
              filtered
                ? "Try a different search, or clear the filters."
                : "Jot down a summary, a formula, a thought from the lecture."
            }
            action={
              filtered ? (
                <a href="/notes" class={BTN_OUTLINE}>
                  <i data-lucide="rotate-ccw" class="h-4 w-4"></i> Clear filters
                </a>
              ) : (
                <a href="/notes/new" class={BTN_PRIMARY}>
                  <i data-lucide="plus" class="h-4 w-4"></i> New note
                </a>
              )
            }
          />
        </div>
      ) : (
        notes.map((n) => <NoteCard note={n} targets={targets.get(n.id)} locale={locale} />)
      )}
    </div>
  );
};

// ==========================================
// LIST PAGE
// ==========================================

export const NoteListPage = (props: NoteListProps & { total: number; pinnedCount: number }) => (
  <Page
    title="Notes"
    eyebrow="Your notebook"
    eyebrowIcon="notebook-pen"
    subtitle={
      props.total === 0
        ? "Nothing written yet."
        : `${props.total} note${props.total === 1 ? "" : "s"}${props.pinnedCount ? ` · ${props.pinnedCount} pinned` : ""}`
    }
    actions={
      <a href="/notes/new" class={BTN_PRIMARY}>
        <i data-lucide="plus" class="h-4 w-4"></i> New note
      </a>
    }
  >
    {/* The controls carry the HTMX attributes, not the form, so search and the
        pinned toggle always send each other's state. With JavaScript off it is
        a plain GET form. */}
    <form action="/notes" method="get" class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <i
          data-lucide="search"
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        ></i>
        <input
          type="search"
          name="q"
          value={props.query}
          placeholder="Search your notes…"
          autocomplete="off"
          aria-label="Search notes"
          hx-get="/notes"
          hx-trigger="input changed delay:300ms, search"
          hx-target="#note-grid"
          hx-swap="outerHTML"
          hx-include="closest form"
          hx-push-url="true"
          class={`${INPUT} pl-9`}
        />
      </div>
      <label
        class={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${
          props.pinnedOnly
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-input hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <input
          type="checkbox"
          name="pinned"
          value="1"
          checked={props.pinnedOnly}
          hx-get="/notes"
          hx-trigger="change"
          hx-target="#note-grid"
          hx-swap="outerHTML"
          hx-include="closest form"
          hx-push-url="true"
          class="sr-only"
          aria-label="Show pinned notes only"
        />
        <i data-lucide="pin" class="h-4 w-4"></i>
        Pinned
        <span class="text-xs tabular-nums opacity-70">{props.pinnedCount}</span>
      </label>
    </form>
    <NoteGrid {...props} />
  </Page>
);

// ==========================================
// DETAIL
// ==========================================

export const NoteDetailPage = ({
  note,
  targets,
  locale,
}: {
  note: SelectNote;
  targets?: TargetLabel[];
  locale: string;
}) => (
  <Page
    title={note.title}
    back={{ href: "/notes", label: "Notes" }}
    width="narrow"
    subtitle={`Last edited ${formatDateShort(note.updatedAt, locale)}`}
    actions={
      <>
        <VisibilityToggle base="/notes" id={note.id} isPublic={note.isPublic} />
        <a href={`/notes/${note.id}/edit`} class={BTN_OUTLINE}>
          <i data-lucide="pencil" class="h-4 w-4"></i> Edit
        </a>
        <DeleteButton url={`/notes/${note.id}`} what={note.title} />
      </>
    }
  >
    <TargetChips targets={targets} />
    {/* Lined paper with a margin, taped at the top: the note as a page. */}
    <article class={`${CARD} index-card relative mt-4`}>
      <span aria-hidden="true" class={`washi ${accentOf(note).bar}`}></span>
      <div class="pb-8 pl-12 pr-6 pt-[1.7rem] sm:pr-8">
        {note.body ? (
          <div class="text-base leading-8 whitespace-pre-wrap break-words">{note.body}</div>
        ) : (
          <p class="italic text-muted-foreground">
            This note is empty.{" "}
            <a href={`/notes/${note.id}/edit`} class="underline underline-offset-4">
              Write something?
            </a>
          </p>
        )}
      </div>
    </article>
    {note.isPublic ? (
      <p class="flex items-center gap-2 text-sm text-muted-foreground">
        <i data-lucide="globe" class="h-4 w-4"></i>
        Visitors can read this at
        <a
          href={`/public/notes/${note.id}`}
          class="underline underline-offset-4 hover:text-primary"
        >
          /public/notes/{note.id}
        </a>
      </p>
    ) : null}
  </Page>
);

// ==========================================
// FORM
// ==========================================

export const NoteFormPage = ({
  note,
  groups,
  links,
}: {
  note?: SelectNote;
  groups: LinkOptionGroup[];
  links: string[];
}) => {
  const current = (note?.accent as NoteAccent) ?? "neutral";
  return (
    <Page
      title={note ? "Edit note" : "New note"}
      back={{ href: note ? `/notes/${note.id}` : "/notes", label: note ? note.title : "Notes" }}
      width="narrow"
    >
      <FormCard
        action={note ? `/notes/${note.id}` : "/notes"}
        submitLabel={note ? "Save changes" : "Save note"}
        cancelHref={note ? `/notes/${note.id}` : "/notes"}
      >
        <Field id="title" label="Title">
          <input
            id="title"
            name="title"
            required
            maxlength={120}
            value={note?.title ?? ""}
            placeholder="What's this about?"
            class={INPUT}
          />
        </Field>
        <Field id="body" label="Note">
          <textarea
            id="body"
            name="body"
            rows={14}
            maxlength={50000}
            placeholder="Write away…"
            class={TEXTAREA}
          >
            {note?.body ?? ""}
          </textarea>
        </Field>
        <LinkPicker groups={groups} selected={links} />
        <fieldset class="space-y-1.5">
          <legend class="text-sm font-medium">Colour</legend>
          <div class="flex flex-wrap items-center gap-1">
            {NOTE_ACCENTS.map((key) => (
              <label
                class="inline-flex h-11 w-11 cursor-pointer items-center justify-center"
                title={ACCENTS[key].label}
              >
                <input
                  type="radio"
                  name="accent"
                  value={key}
                  checked={current === key}
                  class="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  class={`block h-7 w-7 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-all peer-checked:ring-ring peer-focus-visible:ring-ring ${ACCENTS[key].swatch}`}
                ></span>
                <span class="sr-only">{ACCENTS[key].label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <Checkbox name="pinned" checked={note?.pinned ?? false} label="Pin to the top" />
          <Checkbox
            name="isPublic"
            checked={note?.isPublic ?? false}
            label="Make public"
            hint="Visitors can read it on your public page. Links to your subjects stay private."
          />
        </div>
      </FormCard>
    </Page>
  );
};
