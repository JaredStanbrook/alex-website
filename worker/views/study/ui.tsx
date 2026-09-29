// worker/views/study/ui.tsx
//
// The small kit every study page is built from. One definition of a button, a
// field, a card and a chip, so the pages stay consistent and a restyle is an
// edit here rather than a hunt through twenty files.
//
// Theme tokens only. Subject colours map onto `chart-*` tokens, written out as
// complete class names because Tailwind never generates an interpolated one.

import type { Child } from "hono/jsx";

import type { SubjectColour } from "@server/schema/subject.schema";
import type { LinkOptionGroup, Material, TargetLabel } from "@server/services/links.service";
import { Blossom, FloralRule, Sprig, Wreath } from "./florals";

// ==========================================
// CLASS STRINGS
// ==========================================

const BTN =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50";

export const BTN_PRIMARY = `${BTN} bg-primary text-primary-foreground shadow-sm hover:-translate-y-px hover:bg-primary/90 hover:shadow-md`;
export const BTN_OUTLINE = `${BTN} border border-input bg-card/80 hover:bg-accent hover:text-accent-foreground`;
export const BTN_GHOST = `${BTN} text-muted-foreground hover:bg-accent hover:text-accent-foreground`;
export const BTN_DANGER = `${BTN} border border-destructive/30 text-destructive hover:bg-destructive/10`;

/** Square icon buttons: still 44px, because the target matters more than the glyph. */
export const ICON_BTN =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const ICON_BTN_DANGER =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const INPUT =
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
export const TEXTAREA =
  "flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
export const SELECT = INPUT;

export const CARD = "rounded-[1.4rem] border bg-card text-card-foreground shadow-sm";

// ==========================================
// SUBJECT COLOURS
// ==========================================

export const COLOURS: Record<
  SubjectColour,
  {
    dot: string;
    bar: string;
    soft: string;
    fill: "fill-chart-1" | "fill-chart-2" | "fill-chart-3" | "fill-chart-4" | "fill-chart-5";
    label: string;
  }
> = {
  "1": {
    dot: "bg-chart-1",
    bar: "bg-chart-1",
    soft: "bg-chart-1/15",
    fill: "fill-chart-1",
    label: "Rose",
  },
  "2": {
    dot: "bg-chart-2",
    bar: "bg-chart-2",
    soft: "bg-chart-2/15",
    fill: "fill-chart-2",
    label: "Sage",
  },
  "3": {
    dot: "bg-chart-3",
    bar: "bg-chart-3",
    soft: "bg-chart-3/15",
    fill: "fill-chart-3",
    label: "Denim",
  },
  "4": {
    dot: "bg-chart-4",
    bar: "bg-chart-4",
    soft: "bg-chart-4/15",
    fill: "fill-chart-4",
    label: "Mustard",
  },
  "5": {
    dot: "bg-chart-5",
    bar: "bg-chart-5",
    soft: "bg-chart-5/15",
    fill: "fill-chart-5",
    label: "Lavender",
  },
};

export const colourOf = (c: string | null | undefined) =>
  COLOURS[(c as SubjectColour) ?? "1"] ?? COLOURS["1"];

export const Dot = ({ colour, class: extra = "" }: { colour: string; class?: string }) => (
  <span
    aria-hidden="true"
    class={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${colourOf(colour).dot} ${extra}`}
  ></span>
);

// ==========================================
// PAGE SHELL
// ==========================================

interface PageProps {
  title: string;
  eyebrow?: string;
  eyebrowIcon?: string;
  subtitle?: Child;
  actions?: Child;
  back?: { href: string; label: string };
  width?: "narrow" | "wide";
  children?: Child;
}

export const Page = ({
  title,
  eyebrow,
  subtitle,
  actions,
  back,
  width = "wide",
  children,
}: PageProps) => (
  <div
    class={`mx-auto w-full ${width === "narrow" ? "max-w-2xl" : "max-w-5xl"} space-y-7 px-4 pb-20 pt-9 sm:px-6 sm:pt-12 animate-in fade-in duration-500`}
  >
    <header class="relative space-y-4">
      {/* A sprig tucked into the corner of every page, like a pressed flower
          in a notebook. Decoration only, and hidden where space is tight. */}
      <Sprig class="pointer-events-none absolute -top-4 right-0 hidden h-16 w-32 -scale-x-100 opacity-80 md:block" />
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0 space-y-1">
          {back ? (
            <a
              href={back.href}
              class="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <i data-lucide="arrow-left" class="h-4 w-4"></i>
              {back.label}
            </a>
          ) : eyebrow ? (
            <p class="flex items-center gap-1.5 font-hand text-2xl leading-none text-primary">
              <Blossom class="h-4 w-4" />
              {eyebrow}
            </p>
          ) : null}
          <h1 class="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          {subtitle ? <p class="pt-1 text-[0.95rem] text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div class="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <FloralRule />
    </header>
    {children}
  </div>
);

export const Section = ({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: string;
  action?: Child;
  children?: Child;
}) => (
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <h2 class="flex items-center gap-2.5 font-serif text-xl font-medium tracking-tight">
        {icon ? (
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <i data-lucide={icon} class="h-4 w-4"></i>
          </span>
        ) : null}
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

export const EmptyState = ({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  icon: string;
  title: string;
  body?: Child;
  action?: Child;
  compact?: boolean;
}) => (
  <div
    class={`stitched flex flex-col items-center justify-center gap-2 rounded-[1.4rem] border bg-card/70 text-center ${compact ? "px-5 py-7" : "px-6 py-14"}`}
  >
    <div class={`relative flex items-center justify-center ${compact ? "h-16 w-16" : "h-24 w-24"}`}>
      <Wreath class="absolute inset-0 h-full w-full" />
      <i
        data-lucide={icon}
        class={`${compact ? "h-5 w-5" : "h-7 w-7"} relative -mt-1 text-primary`}
      ></i>
    </div>
    <p class={`font-serif font-medium ${compact ? "text-lg" : "text-2xl"}`}>{title}</p>
    {body ? <p class="max-w-sm text-sm text-muted-foreground">{body}</p> : null}
    {action ? <div class="pt-2">{action}</div> : null}
  </div>
);

// ==========================================
// BADGES
// ==========================================

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

/**
 * `warning` is solid rather than tinted: the warning token is a light yellow,
 * and yellow text on a pale wash is unreadable in light mode.
 */
const TONES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  primary: "border-primary/25 bg-primary/10 text-primary",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning bg-warning text-warning-foreground",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

export const Badge = ({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: string;
  children?: Child;
}) => (
  <span
    class={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
  >
    {icon ? <i data-lucide={icon} class="h-3 w-3"></i> : null}
    {children}
  </span>
);

// ==========================================
// FORMS
// ==========================================

export const Field = ({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: Child;
  children?: Child;
}) => (
  <div class="space-y-1.5">
    <label for={id} class="text-sm font-medium">
      {label}
    </label>
    {children}
    {hint ? <p class="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

export const Checkbox = ({
  name,
  checked,
  label,
  hint,
}: {
  name: string;
  checked?: boolean;
  label: string;
  hint?: string;
}) => (
  // The box stays a native 16px checkbox; the label row is 44px, and since the
  // input is inside the label the whole row is the target.
  <label class="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      class="mt-0.5 h-4 w-4 rounded border-input accent-primary"
    />
    <span>
      <span class="font-medium">{label}</span>
      {hint ? <span class="block text-xs text-muted-foreground">{hint}</span> : null}
    </span>
  </label>
);

export const FormCard = ({
  action,
  children,
  submitLabel,
  cancelHref,
}: {
  action: string;
  children?: Child;
  submitLabel: string;
  cancelHref: string;
}) => (
  // A plain POST form. Inside the boosted <main> HTMX submits it and swaps the
  // page; with JavaScript off it still works as an ordinary form.
  <form method="post" action={action} class={`${CARD} space-y-5 p-5 sm:p-6`}>
    {children}
    <div class="flex flex-wrap items-center gap-3 pt-2">
      <button type="submit" class={BTN_PRIMARY}>
        {submitLabel}
      </button>
      <a href={cancelHref} class={BTN_OUTLINE}>
        Cancel
      </a>
    </div>
  </form>
);

export const ColourPicker = ({ name, current }: { name: string; current: string }) => (
  <fieldset class="space-y-1.5">
    <legend class="text-sm font-medium">Colour</legend>
    <div class="flex flex-wrap items-center gap-1">
      {(Object.keys(COLOURS) as SubjectColour[]).map((key) => (
        <label
          class="inline-flex h-11 w-11 cursor-pointer items-center justify-center"
          title={COLOURS[key].label}
        >
          <input
            type="radio"
            name={name}
            value={key}
            checked={current === key}
            class="peer sr-only"
          />
          <span
            aria-hidden="true"
            class={`block h-7 w-7 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-all peer-checked:ring-ring peer-focus-visible:ring-ring ${COLOURS[key].dot}`}
          ></span>
          <span class="sr-only">{COLOURS[key].label}</span>
        </label>
      ))}
    </div>
  </fieldset>
);

// ==========================================
// DELETE
// ==========================================

/**
 * Soft-delete button. On a list, `target` is the card to remove; on a detail
 * page there is no target and the route answers with a redirect instead.
 */
export const DeleteButton = ({
  url,
  what,
  target,
  label = false,
}: {
  url: string;
  what: string;
  target?: string;
  label?: boolean;
}) => (
  <button
    type="button"
    hx-delete={url}
    hx-target={target ? `#${target}` : undefined}
    hx-swap={target ? "outerHTML swap:200ms" : "none"}
    hx-confirm={`Delete "${what}"? You can't undo this from the app.`}
    aria-label={`Delete ${what}`}
    class={label ? BTN_DANGER : ICON_BTN_DANGER}
  >
    <i data-lucide="trash-2" class="h-4 w-4"></i>
    {label ? "Delete" : null}
  </button>
);

// ==========================================
// PUBLIC / PRIVATE
// ==========================================

export const VisibilityToggle = ({
  base,
  id,
  isPublic,
}: {
  /** e.g. "/notes" — the toggle posts to `${base}/${id}/visibility`. */
  base: string;
  id: number;
  isPublic: boolean;
}) => (
  <button
    type="button"
    id={`visibility-${base.slice(1)}-${id}`}
    hx-post={`${base}/${id}/visibility`}
    hx-swap="outerHTML"
    aria-pressed={isPublic ? "true" : "false"}
    title={
      isPublic
        ? "Anyone with the link can see this. Tap to make private."
        : "Only you can see this. Tap to share publicly."
    }
    class={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      isPublic
        ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
        : "border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`}
  >
    <i data-lucide={isPublic ? "globe" : "lock"} class="h-3.5 w-3.5"></i>
    {isPublic ? "Public" : "Private"}
  </button>
);

export const PublicPill = ({ isPublic }: { isPublic: boolean }) =>
  isPublic ? (
    <Badge tone="primary" icon="globe">
      Public
    </Badge>
  ) : null;

// ==========================================
// LINKS
// ==========================================

const TARGET_ICON = {
  subject: "book-open",
  assignment: "clipboard-list",
  exam: "graduation-cap",
} as const;

export const TargetChips = ({ targets }: { targets?: TargetLabel[] }) =>
  targets && targets.length > 0 ? (
    <div class="flex flex-wrap gap-1.5">
      {targets.map((t) => (
        <a
          href={t.href}
          class="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Dot colour={t.colour} class="h-2 w-2" />
          <i data-lucide={TARGET_ICON[t.type]} class="h-3 w-3"></i>
          <span class="truncate">{t.label}</span>
        </a>
      ))}
    </div>
  ) : null;

const MATERIAL_ICON = { note: "notebook-pen", resource: "link", flashcard_set: "layers" } as const;

export const MaterialChips = ({ items }: { items?: Material[] }) =>
  items && items.length > 0 ? (
    <div class="flex flex-wrap gap-1.5">
      {items.map((m) => (
        <a
          href={m.href}
          class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent"
        >
          <i data-lucide={MATERIAL_ICON[m.type]} class="h-3 w-3"></i>
          <span class="truncate">{m.title}</span>
        </a>
      ))}
    </div>
  ) : null;

/**
 * Tick the subjects, assignments and exams a piece of material is about.
 * Closed by default once there is more than a handful, so a long semester
 * does not turn every form into a wall of checkboxes.
 */
export const LinkPicker = ({
  groups,
  selected,
}: {
  groups: LinkOptionGroup[];
  selected: string[];
}) => {
  const isChecked = (value: string) => selected.includes(value);

  return (
    <fieldset class="space-y-2">
      <legend class="text-sm font-medium">Related to</legend>
      {groups.length === 0 ? (
        <p class="text-sm text-muted-foreground">
          Add a{" "}
          <a href="/semesters" class="underline underline-offset-4 hover:text-primary">
            subject
          </a>{" "}
          first, then you can link things to it.
        </p>
      ) : (
        <div class="divide-y rounded-xl border">
          {groups.map((g) => {
            const count = [
              `subject:${g.subject.id}`,
              ...g.assignments.map((a) => `assignment:${a.id}`),
              ...g.exams.map((e) => `exam:${e.id}`),
            ].filter(isChecked).length;
            return (
              <details class="group" open={count > 0 || groups.length <= 2}>
                <summary class="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm [&::-webkit-details-marker]:hidden">
                  <Dot colour={g.subject.colour} />
                  <span class="min-w-0 flex-1 truncate font-medium">
                    {g.subject.code ? `${g.subject.code} · ` : ""}
                    {g.subject.name}
                  </span>
                  <span class="hidden text-xs text-muted-foreground sm:inline">
                    {g.semesterName}
                  </span>
                  {count > 0 ? <Badge tone="primary">{count}</Badge> : null}
                  <i
                    data-lucide="chevron-down"
                    class="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
                  ></i>
                </summary>
                <div class="space-y-0.5 px-3 pb-2">
                  <LinkOption
                    value={`subject:${g.subject.id}`}
                    checked={isChecked(`subject:${g.subject.id}`)}
                    icon="book-open"
                    label="The whole subject"
                  />
                  {g.assignments.map((a) => (
                    <LinkOption
                      value={`assignment:${a.id}`}
                      checked={isChecked(`assignment:${a.id}`)}
                      icon="clipboard-list"
                      label={a.title}
                    />
                  ))}
                  {g.exams.map((e) => (
                    <LinkOption
                      value={`exam:${e.id}`}
                      checked={isChecked(`exam:${e.id}`)}
                      icon="graduation-cap"
                      label={e.title}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </fieldset>
  );
};

const LinkOption = ({
  value,
  checked,
  icon,
  label,
}: {
  value: string;
  checked: boolean;
  icon: string;
  label: string;
}) => (
  <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-accent/60">
    <input
      type="checkbox"
      name="links"
      value={value}
      checked={checked}
      class="h-4 w-4 rounded border-input accent-primary"
    />
    <i data-lucide={icon} class="h-3.5 w-3.5 text-muted-foreground"></i>
    <span class="min-w-0 truncate">{label}</span>
  </label>
);

// ==========================================
// PROGRESS
// ==========================================

export const ProgressBar = ({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      class="relative h-2.5 w-full rounded-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax={String(max)}
      aria-valuenow={String(value)}
    >
      {/* Width from an inline style: a percentage per render is exactly the
          interpolated class Tailwind would never generate. The vine grows a
          flower at its tip. */}
      <div class="relative h-full rounded-full bg-chart-2 transition-all" style={`width: ${pct}%`}>
        {pct > 0 ? <Blossom class="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2" /> : null}
      </div>
    </div>
  );
};
