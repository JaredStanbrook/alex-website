// worker/views/study/public.tsx
//
// What a visitor sees. Only rows the owner marked public reach these views.

import type { AppConfig } from "@server/config/app.config";
import type { PublicContent } from "@server/routes/study/public";
import { formatDateShort } from "@views/lib/utils";
import { hostOf } from "./resources";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, EmptyState, Page, Section } from "./ui";

const PublicSections = ({ content }: { content: PublicContent }) => {
  const { notes, resources, sets } = content;
  if (notes.length + resources.length + sets.length === 0) {
    return (
      <EmptyState
        icon="leaf"
        title="Nothing shared yet"
        body="When notes, links or flashcards are made public, they'll appear here."
      />
    );
  }

  return (
    <div class="space-y-10">
      {sets.length ? (
        <Section title="Flashcards" icon="layers">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((s) => (
              <a
                href={`/public/flashcards/${s.id}/study`}
                class={`${CARD} flex flex-col gap-1 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md`}
              >
                <span class="font-serif text-lg font-semibold">{s.title}</span>
                {s.description ? (
                  <span class="line-clamp-2 text-sm text-muted-foreground">{s.description}</span>
                ) : null}
                <span class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Flip through <i data-lucide="arrow-right" class="h-4 w-4"></i>
                </span>
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {notes.length ? (
        <Section title="Notes" icon="notebook-pen">
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <a
                href={`/public/notes/${n.id}`}
                class={`${CARD} flex flex-col gap-2 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md`}
              >
                <span class="font-medium">{n.title}</span>
                {n.body ? (
                  <span class="line-clamp-3 text-sm text-muted-foreground whitespace-pre-line">
                    {n.body}
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        </Section>
      ) : null}

      {resources.length ? (
        <Section title="Useful links" icon="library">
          <ul class={`${CARD} divide-y`}>
            {resources.map((r) => (
              <li>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  hx-boost="false"
                  class="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-accent/40"
                >
                  <i data-lucide="link" class="h-4 w-4 shrink-0 text-primary"></i>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{r.title}</span>
                    <span class="block truncate text-xs text-muted-foreground">
                      {r.description || hostOf(r.url)}
                    </span>
                  </span>
                  <i data-lucide="external-link" class="h-4 w-4 shrink-0 text-muted-foreground"></i>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
};

export const PublicHome = ({
  app,
  content,
  signedIn,
}: {
  app: AppConfig;
  content: PublicContent;
  signedIn: boolean;
}) => (
  <div class="mx-auto w-full max-w-5xl space-y-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 animate-in fade-in duration-300">
    <section class="space-y-4 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <i data-lucide="sprout" class="h-7 w-7"></i>
      </div>
      <h1 class="font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        {app.name}
      </h1>
      {app.tagline ? (
        <p class="mx-auto max-w-xl text-lg text-muted-foreground text-balance">{app.tagline}</p>
      ) : null}
      <p class="mx-auto max-w-md text-sm text-muted-foreground">
        A personal study space. A few notes and flashcards are shared below — help yourself.
      </p>
      {signedIn ? (
        <p class="text-sm text-muted-foreground">
          You're signed in, but this study hub belongs to its owner, so there's nothing more to see.
        </p>
      ) : null}
    </section>
    <PublicSections content={content} />
  </div>
);

export const PublicIndexPage = ({ app, content }: { app: AppConfig; content: PublicContent }) => (
  <Page
    title="Shared stuff"
    eyebrow={app.name}
    eyebrowIcon="leaf"
    subtitle="Notes, links and flashcards shared publicly. Take what's useful."
  >
    <PublicSections content={content} />
  </Page>
);

export const PublicNotePage = ({
  note,
  locale,
}: {
  note: PublicContent["notes"][number];
  locale: string;
}) => (
  <Page
    title={note.title}
    back={{ href: "/public", label: "Shared stuff" }}
    width="narrow"
    subtitle={`Updated ${formatDateShort(note.updatedAt, locale)}`}
  >
    <article class={`${CARD} p-6 sm:p-8`}>
      {note.body ? (
        <div class="text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words">
          {note.body}
        </div>
      ) : (
        <p class="italic text-muted-foreground">This note is empty.</p>
      )}
    </article>
    <div class="flex flex-wrap gap-2">
      <a href="/public" class={BTN_OUTLINE}>
        <i data-lucide="arrow-left" class="h-4 w-4"></i> More shared stuff
      </a>
      <a href="/" class={BTN_PRIMARY}>
        Home
      </a>
    </div>
  </Page>
);
