// worker/views/study/flashcards.tsx

import type {
  CardConfidence,
  SelectFlashcard,
  SelectFlashcardSet,
  StudyMode,
} from "@server/schema/flashcard.schema";
import type { LinkOptionGroup, TargetLabel } from "@server/services/links.service";
import type { StudyStep } from "@server/services/flashcards.service";
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  Badge,
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
  ProgressBar,
  PublicPill,
  Section,
  TEXTAREA,
  TargetChips,
  VisibilityToggle,
  type Tone,
} from "./ui";

const CONFIDENCE: Record<CardConfidence, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "neutral" },
  learning: { label: "Learning", tone: "warning" },
  known: { label: "Got it", tone: "success" },
};

// ==========================================
// SET LIST
// ==========================================

export const FlashcardSetListPage = ({
  sets,
  counts,
  targets,
}: {
  sets: SelectFlashcardSet[];
  counts: Map<number, { total: number; known: number }>;
  targets: Map<number, TargetLabel[]>;
}) => (
  <Page
    title="Flashcards"
    eyebrow="Revision"
    eyebrowIcon="layers"
    subtitle={
      sets.length
        ? "Pick a set and flip through a few."
        : "Make a set, add some cards, test yourself."
    }
    actions={
      <a href="/flashcards/new" class={BTN_PRIMARY}>
        <i data-lucide="plus" class="h-4 w-4"></i> New set
      </a>
    }
  >
    {sets.length === 0 ? (
      <EmptyState
        icon="layers"
        title="No flashcard sets yet"
        body="A set per topic works well: definitions, formulas, the bones of the hand."
        action={
          <a href="/flashcards/new" class={BTN_PRIMARY}>
            <i data-lucide="plus" class="h-4 w-4"></i> New set
          </a>
        }
      />
    ) : (
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => {
          const count = counts.get(set.id) ?? { total: 0, known: 0 };
          return (
            <article id={`set-${set.id}`} class={`${CARD} relative flex flex-col gap-3 p-5`}>
              {/* A little stack of cards behind the title — the one decoration here. */}
              <div class="flex items-start justify-between gap-2">
                <div class="relative h-10 w-12 shrink-0" aria-hidden="true">
                  <span class="absolute left-2 top-0 h-8 w-10 rotate-6 rounded-md border bg-secondary"></span>
                  <span class="absolute left-0 top-1 flex h-8 w-10 -rotate-3 items-center justify-center rounded-md border bg-card text-primary">
                    <i data-lucide="layers" class="h-4 w-4"></i>
                  </span>
                </div>
                <PublicPill isPublic={set.isPublic} />
              </div>
              <div class="min-w-0">
                <h3 class="font-serif text-lg font-semibold leading-snug">
                  <a href={`/flashcards/${set.id}`} class="hover:text-primary">
                    {set.title}
                  </a>
                </h3>
                {set.description ? (
                  <p class="line-clamp-2 text-sm text-muted-foreground">{set.description}</p>
                ) : null}
              </div>
              <TargetChips targets={targets.get(set.id)} />
              <div class="mt-auto space-y-1.5 pt-1">
                <div class="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {count.total} card{count.total === 1 ? "" : "s"}
                  </span>
                  {count.total ? <span>{count.known} known</span> : null}
                </div>
                <ProgressBar
                  value={count.known}
                  max={count.total}
                  label={`${set.title}: cards known`}
                />
              </div>
              <div class="flex gap-2">
                {count.total ? (
                  <a href={`/flashcards/${set.id}/study`} class={`${BTN_PRIMARY} flex-1`}>
                    <i data-lucide="play" class="h-4 w-4"></i> Study
                  </a>
                ) : null}
                <a href={`/flashcards/${set.id}`} class={`${BTN_OUTLINE} flex-1`}>
                  {count.total ? "Cards" : "Add cards"}
                </a>
              </div>
            </article>
          );
        })}
      </div>
    )}
  </Page>
);

// ==========================================
// SET DETAIL + CARDS
// ==========================================

export const CardList = ({ setId, cards }: { setId: number; cards: SelectFlashcard[] }) => (
  <ol id="card-list" class="space-y-2">
    {cards.length === 0 ? (
      <li>
        <EmptyState
          compact
          icon="square-stack"
          title="No cards yet"
          body="Add the first one above."
        />
      </li>
    ) : (
      cards.map((card, i) => (
        <li id={`card-${card.id}`} class={`${CARD} flex gap-3 p-3`}>
          <span class="flex h-11 w-8 shrink-0 items-center justify-center text-xs font-semibold tabular-nums text-muted-foreground">
            {i + 1}
          </span>
          <div class="grid min-w-0 flex-1 gap-2 py-1 sm:grid-cols-2 sm:gap-4">
            <p class="whitespace-pre-line break-words text-sm font-medium">{card.front}</p>
            <p class="whitespace-pre-line break-words text-sm text-muted-foreground">{card.back}</p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
            <Badge tone={CONFIDENCE[card.confidence].tone}>
              {CONFIDENCE[card.confidence].label}
            </Badge>
            <div class="flex">
              <button
                type="button"
                hx-post={`/flashcards/${setId}/cards/${card.id}/move?dir=up`}
                hx-target="#card-list"
                hx-swap="outerHTML"
                disabled={i === 0}
                aria-label="Move up"
                class={`${ICON_BTN} disabled:opacity-30`}
              >
                <i data-lucide="arrow-up" class="h-4 w-4"></i>
              </button>
              <button
                type="button"
                hx-post={`/flashcards/${setId}/cards/${card.id}/move?dir=down`}
                hx-target="#card-list"
                hx-swap="outerHTML"
                disabled={i === cards.length - 1}
                aria-label="Move down"
                class={`${ICON_BTN} disabled:opacity-30`}
              >
                <i data-lucide="arrow-down" class="h-4 w-4"></i>
              </button>
              <a
                href={`/flashcards/${setId}/cards/${card.id}/edit`}
                aria-label="Edit card"
                class={ICON_BTN}
              >
                <i data-lucide="pencil" class="h-4 w-4"></i>
              </a>
              <DeleteButton
                url={`/flashcards/${setId}/cards/${card.id}`}
                what={card.front.slice(0, 40)}
                target={`card-${card.id}`}
              />
            </div>
          </div>
        </li>
      ))
    )}
  </ol>
);

export const FlashcardSetPage = ({
  set,
  cards,
  targets,
}: {
  set: SelectFlashcardSet;
  cards: SelectFlashcard[];
  targets?: TargetLabel[];
}) => {
  const learning = cards.filter((c) => c.confidence !== "known").length;
  return (
    <Page
      title={set.title}
      back={{ href: "/flashcards", label: "Flashcards" }}
      subtitle={set.description ?? undefined}
      actions={
        <>
          <VisibilityToggle base="/flashcards" id={set.id} isPublic={set.isPublic} />
          <a href={`/flashcards/${set.id}/edit`} class={BTN_OUTLINE}>
            <i data-lucide="pencil" class="h-4 w-4"></i> Edit
          </a>
          <DeleteButton url={`/flashcards/${set.id}`} what={set.title} />
        </>
      }
    >
      <TargetChips targets={targets} />

      {cards.length ? (
        <div class={`${CARD} flex flex-wrap items-center justify-between gap-3 p-4`}>
          <p class="text-sm text-muted-foreground">
            {cards.length} card{cards.length === 1 ? "" : "s"} · {cards.length - learning} known
          </p>
          <div class="flex flex-wrap gap-2">
            <a href={`/flashcards/${set.id}/study`} class={BTN_PRIMARY}>
              <i data-lucide="play" class="h-4 w-4"></i> Study all
            </a>
            {learning > 0 && learning < cards.length ? (
              <a href={`/flashcards/${set.id}/study?mode=learning`} class={BTN_OUTLINE}>
                <i data-lucide="target" class="h-4 w-4"></i> Just the tricky {learning}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <Section title="Add a card" icon="plus">
        {/* hx-on resets the form once the new card is in, so the next one can
            be typed straight away. */}
        <form
          hx-post={`/flashcards/${set.id}/cards`}
          hx-target="#card-list"
          hx-swap="outerHTML"
          hx-on--after-request="if (event.detail.successful) { this.reset(); this.querySelector('textarea').focus(); }"
          class={`${CARD} grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}
        >
          <Field id="front" label="Front">
            <textarea
              id="front"
              name="front"
              required
              rows={2}
              maxlength={2000}
              placeholder="Question or term"
              class={TEXTAREA}
            ></textarea>
          </Field>
          <Field id="back" label="Back">
            <textarea
              id="back"
              name="back"
              required
              rows={2}
              maxlength={5000}
              placeholder="Answer or definition"
              class={TEXTAREA}
            ></textarea>
          </Field>
          <button type="submit" class={BTN_PRIMARY}>
            <i data-lucide="plus" class="h-4 w-4"></i> Add
          </button>
        </form>
      </Section>

      <Section title="Cards" icon="square-stack">
        <CardList setId={set.id} cards={cards} />
      </Section>

      {set.isPublic ? (
        <p class="flex items-center gap-2 text-sm text-muted-foreground">
          <i data-lucide="globe" class="h-4 w-4"></i>
          Visitors can study this at
          <a
            href={`/public/flashcards/${set.id}`}
            class="underline underline-offset-4 hover:text-primary"
          >
            /public/flashcards/{set.id}
          </a>
        </p>
      ) : null}
    </Page>
  );
};

export const CardEditPage = ({ card }: { card: SelectFlashcard }) => (
  <Page
    title="Edit card"
    back={{ href: `/flashcards/${card.setId}`, label: "Back to the set" }}
    width="narrow"
  >
    <FormCard
      action={`/flashcards/${card.setId}/cards/${card.id}`}
      submitLabel="Save card"
      cancelHref={`/flashcards/${card.setId}`}
    >
      <Field id="front" label="Front">
        <textarea id="front" name="front" required rows={3} maxlength={2000} class={TEXTAREA}>
          {card.front}
        </textarea>
      </Field>
      <Field id="back" label="Back">
        <textarea id="back" name="back" required rows={5} maxlength={5000} class={TEXTAREA}>
          {card.back}
        </textarea>
      </Field>
    </FormCard>
  </Page>
);

export const FlashcardSetFormPage = ({
  set,
  groups,
  links,
}: {
  set?: SelectFlashcardSet;
  groups: LinkOptionGroup[];
  links: string[];
}) => (
  <Page
    title={set ? "Edit set" : "New flashcard set"}
    back={{
      href: set ? `/flashcards/${set.id}` : "/flashcards",
      label: set ? set.title : "Flashcards",
    }}
    width="narrow"
  >
    <FormCard
      action={set ? `/flashcards/${set.id}` : "/flashcards"}
      submitLabel={set ? "Save changes" : "Create set"}
      cancelHref={set ? `/flashcards/${set.id}` : "/flashcards"}
    >
      <Field id="title" label="Name">
        <input
          id="title"
          name="title"
          required
          maxlength={160}
          value={set?.title ?? ""}
          placeholder="e.g. Cranial nerves"
          class={INPUT}
        />
      </Field>
      <Field id="description" label="Description" hint="Optional">
        <textarea id="description" name="description" rows={2} class={TEXTAREA}>
          {set?.description ?? ""}
        </textarea>
      </Field>
      <LinkPicker groups={groups} selected={links} />
      <Checkbox
        name="isPublic"
        checked={set?.isPublic ?? false}
        label="Make public"
        hint="Visitors can flip through it, but their answers aren't recorded."
      />
    </FormCard>
  </Page>
);

// ==========================================
// STUDY
// ==========================================

interface StudyProps {
  step: StudyStep;
  mode: StudyMode;
  /** `/flashcards/3` or `/public/flashcards/3`. */
  base: string;
  /** The owner's answers are recorded; a visitor just flips through. */
  owner?: boolean;
}

/**
 * One card at a time. The answer sits in a <details>, so revealing it needs
 * no JavaScript and is announced properly by screen readers; the "how did it
 * go" buttons live inside it so they only appear once the answer is seen.
 */
export const StudyStage = ({ step, mode, base, owner = false }: StudyProps) => {
  const { card, index, total } = step;

  if (!card) {
    return (
      <div id="study-stage" class="space-y-4">
        <div class={`${CARD} flex flex-col items-center gap-3 px-6 py-14 text-center`}>
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
            <i data-lucide={total ? "party-popper" : "sparkles"} class="h-7 w-7"></i>
          </div>
          <p class="font-serif text-2xl font-semibold">
            {total
              ? "That's the lot!"
              : mode === "learning"
                ? "Nothing tricky left"
                : "No cards here yet"}
          </p>
          <p class="max-w-sm text-sm text-muted-foreground">
            {total
              ? "Nice work. Take a breather, or go round again."
              : mode === "learning"
                ? "You've marked every card as known. Brilliant."
                : "Add some cards to this set first."}
          </p>
          <div class="flex flex-wrap justify-center gap-2 pt-2">
            {total ? (
              <a href={`${base}/study?mode=${mode}`} class={BTN_PRIMARY}>
                <i data-lucide="rotate-ccw" class="h-4 w-4"></i> Go again
              </a>
            ) : null}
            {owner && mode === "all" && total ? (
              <a href={`${base}/study?mode=learning`} class={BTN_OUTLINE}>
                <i data-lucide="target" class="h-4 w-4"></i> Just the tricky ones
              </a>
            ) : null}
            <a href={owner ? base : "/public"} class={BTN_OUTLINE}>
              {owner ? "Back to the set" : "More shared stuff"}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="study-stage" class="space-y-4">
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs text-muted-foreground">
          <span>
            Card {index} of {total}
          </span>
          {mode === "learning" ? <span>Tricky ones only</span> : null}
        </div>
        <ProgressBar value={index - 1} max={total} label="Progress through the set" />
      </div>

      <div class={`${CARD} overflow-hidden`}>
        {/* A ruled index card with a rose margin line. */}
        <div class="index-card flex min-h-56 items-center justify-center py-10 pl-12 pr-6 text-center">
          <p class="font-serif text-2xl leading-relaxed whitespace-pre-line break-words sm:text-3xl">
            {card.front}
          </p>
        </div>
        <details class="group border-t">
          <summary class="flex min-h-14 cursor-pointer list-none items-center justify-center gap-2 bg-accent/50 text-sm font-semibold text-primary hover:bg-accent [&::-webkit-details-marker]:hidden group-open:hidden">
            <i data-lucide="eye" class="h-4 w-4"></i> Show answer
          </summary>
          <div class="space-y-5 bg-secondary/40 p-6 text-center">
            <p class="font-hand text-3xl leading-snug whitespace-pre-line break-words sm:text-4xl">
              {card.back}
            </p>
            {owner ? (
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  hx-post={`${base}/cards/${card.id}/review`}
                  hx-vals={JSON.stringify({ result: "learning", mode })}
                  hx-target="#study-stage"
                  hx-swap="outerHTML"
                  class={BTN_OUTLINE}
                >
                  <i data-lucide="repeat" class="h-4 w-4"></i> Still learning
                </button>
                <button
                  type="button"
                  hx-post={`${base}/cards/${card.id}/review`}
                  hx-vals={JSON.stringify({ result: "known", mode })}
                  hx-target="#study-stage"
                  hx-swap="outerHTML"
                  class={BTN_PRIMARY}
                >
                  <i data-lucide="check" class="h-4 w-4"></i> Got it
                </button>
              </div>
            ) : (
              <a href={`${base}/study?after=${card.position}`} class={`${BTN_PRIMARY} w-full`}>
                Next card <i data-lucide="arrow-right" class="h-4 w-4"></i>
              </a>
            )}
          </div>
        </details>
      </div>

      <div class="flex justify-center">
        <a
          href={`${base}/study?mode=${mode}&after=${card.position}`}
          class="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          Skip <i data-lucide="skip-forward" class="h-4 w-4"></i>
        </a>
      </div>
    </div>
  );
};

export const StudyPage = ({ set, ...props }: StudyProps & { set: SelectFlashcardSet }) => (
  <Page
    title={set.title}
    back={{
      href: props.owner ? props.base : "/public",
      label: props.owner ? "Back to the set" : "Shared stuff",
    }}
    width="narrow"
    subtitle={props.owner ? "Answer in your head, then check." : "Flip through at your own pace."}
  >
    <StudyStage {...props} />
  </Page>
);
