// worker/views/study/assessments.tsx
//
// Assignment and exam cards and forms. Shared by their own list pages, the
// subject page and the Today screen, so a card looks the same wherever it is.

import type {
  SelectAssignment,
  SelectExam,
  AssignmentStatus,
} from "@server/schema/assessment.schema";
import { ASSIGNMENT_STATUSES } from "@server/schema/assessment.schema";
import type { SelectSubject } from "@server/schema/subject.schema";
import type { Material } from "@server/services/links.service";
import { daysUntil } from "@server/lib/dates";
import { bandFor, percentOf } from "@server/lib/grades";
import {
  Badge,
  CARD,
  DeleteButton,
  Dot,
  Field,
  FormCard,
  ICON_BTN,
  INPUT,
  MaterialChips,
  Page,
  SELECT,
  TEXTAREA,
  colourOf,
} from "./ui";
import { formatDay, formatNumber, formatPercent, formatTime, relativeDay } from "./format";

export type SubjectLite = Pick<SelectSubject, "id" | "name" | "code" | "colour">;

export interface SubjectOptionGroup {
  semesterName: string;
  subjects: SubjectLite[];
}

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  submitted: "Submitted",
  marked: "Marked",
};

export const isOpen = (a: Pick<SelectAssignment, "status">) =>
  a.status === "todo" || a.status === "in_progress";

const SubjectTag = ({ subject }: { subject?: SubjectLite }) =>
  subject ? (
    <a
      href={`/subjects/${subject.id}`}
      class="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <Dot colour={subject.colour} class="h-2 w-2" />
      <span class="truncate">{subject.code || subject.name}</span>
    </a>
  ) : null;

export const MarkBadge = ({ a }: { a: Pick<SelectAssignment, "mark" | "maxMark" | "weight"> }) => {
  const pct = percentOf(a);
  if (pct === null) {
    return a.weight ? (
      <span class="text-xs text-muted-foreground">Worth {formatNumber(a.weight)}%</span>
    ) : null;
  }
  const band = bandFor(pct);
  return (
    <Badge tone={band.points > 0 ? "success" : "danger"} icon="star">
      {a.maxMark ? `${formatNumber(a.mark!)}/${formatNumber(a.maxMark)}, ` : ""}
      {formatPercent(pct)} {band.short}
    </Badge>
  );
};

// ==========================================
// ASSIGNMENT CARD
// ==========================================

interface AssignmentCardProps {
  a: SelectAssignment;
  subject?: SubjectLite;
  material?: Material[];
  today: string;
  locale: string;
  /** Hide the subject tag on the subject's own page. */
  showSubject?: boolean;
}

export const AssignmentCard = ({
  a,
  subject,
  material,
  today,
  locale,
  showSubject = true,
}: AssignmentCardProps) => {
  const days = daysUntil(a.dueDate, today);
  const overdue = isOpen(a) && days < 0;
  const soon = isOpen(a) && days >= 0 && days <= 3;

  return (
    <article id={`assignment-${a.id}`} class={`${CARD} relative overflow-hidden`}>
      <div class={`absolute inset-y-0 left-0 w-1.5 ${colourOf(subject?.colour).bar}`}></div>
      <div class="space-y-3 p-4 pl-6">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            {showSubject ? <SubjectTag subject={subject} /> : null}
            <h3
              class={`font-medium leading-snug ${a.status === "marked" || a.status === "submitted" ? "text-muted-foreground" : ""}`}
            >
              {a.title}
            </h3>
            <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span class="inline-flex items-center gap-1">
                <i data-lucide="calendar" class="h-3.5 w-3.5"></i>
                Due {formatDay(a.dueDate, locale)}
              </span>
              {overdue ? (
                <Badge tone="danger" icon="alarm-clock">
                  {relativeDay(a.dueDate, today).replace(" ago", " overdue")}
                </Badge>
              ) : soon ? (
                <Badge tone="warning" icon="alarm-clock">
                  Due {relativeDay(a.dueDate, today)}
                </Badge>
              ) : isOpen(a) ? (
                <span>({relativeDay(a.dueDate, today)})</span>
              ) : null}
            </p>
          </div>
          <div class="flex shrink-0 items-center">
            <a href={`/assignments/${a.id}/edit`} aria-label={`Edit ${a.title}`} class={ICON_BTN}>
              <i data-lucide="pencil" class="h-4 w-4"></i>
            </a>
            <DeleteButton
              url={`/assignments/${a.id}`}
              what={a.title}
              target={`assignment-${a.id}`}
            />
          </div>
        </div>

        {a.description ? (
          <p class="line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">
            {a.description}
          </p>
        ) : null}

        <div class="flex flex-wrap items-center justify-between gap-2">
          <label class="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span class="sr-only">Status of {a.title}</span>
            <select
              name="status"
              hx-post={`/assignments/${a.id}/status`}
              hx-trigger="change"
              hx-target={`#assignment-${a.id}`}
              hx-swap="outerHTML"
              class="h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ASSIGNMENT_STATUSES.map((s) => (
                <option value={s} selected={a.status === s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <MarkBadge a={a} />
        </div>

        <MaterialChips items={material} />
      </div>
    </article>
  );
};

/**
 * One line of the "Coming up" ledger on Today: the date in the margin, what is
 * due, and how far off it is. Assignments and exams share it so they can be
 * read as one list in date order.
 */
export const DueLine = ({
  href,
  title,
  what,
  subject,
  date,
  today,
  locale,
  open = true,
}: {
  href: string;
  title: string;
  /** "Lab report due", "Exam at 9:30 am"… */
  what: string;
  subject?: SubjectLite;
  date: string;
  today: string;
  locale: string;
  /** Only unfinished work can be overdue. */
  open?: boolean;
}) => {
  const days = daysUntil(date, today);
  const late = open && days < 0;
  return (
    <a
      href={href}
      class="grid min-h-11 grid-cols-[4rem_1fr] items-baseline gap-x-3 gap-y-0.5 px-4 py-3 hover:bg-accent/50 sm:grid-cols-[4.5rem_1fr_auto]"
    >
      <span class="text-[0.95rem] leading-tight text-muted-foreground">
        {formatDay(date, locale)}
      </span>
      <span class="min-w-0">
        <span class="block truncate font-bold">{title}</span>
        <span class="flex items-center gap-1.5 text-[0.95rem] text-muted-foreground">
          {subject ? <Dot colour={subject.colour} class="h-2 w-2" /> : null}
          <span class="truncate">
            {subject ? `${subject.code || subject.name}: ` : ""}
            {what}
          </span>
        </span>
      </span>
      <span
        class={`col-start-2 text-[0.95rem] sm:col-start-auto sm:text-right ${late ? "font-bold text-destructive" : days <= 3 ? "font-bold" : "text-muted-foreground"}`}
      >
        {late ? `${-days} day${days === -1 ? "" : "s"} late` : relativeDay(date, today)}
      </span>
    </a>
  );
};

// ==========================================
// EXAM CARD
// ==========================================

interface ExamCardProps {
  e: SelectExam;
  subject?: SubjectLite;
  material?: Material[];
  today: string;
  locale: string;
  showSubject?: boolean;
}

export const ExamCard = ({
  e,
  subject,
  material,
  today,
  locale,
  showSubject = true,
}: ExamCardProps) => {
  const days = daysUntil(e.date, today);
  const past = days < 0;

  return (
    <article
      id={`exam-${e.id}`}
      class={`${CARD} relative overflow-hidden ${past ? "opacity-90" : ""}`}
    >
      <div class={`absolute inset-y-0 left-0 w-1.5 ${colourOf(subject?.colour).bar}`}></div>
      <div class="flex gap-4 p-4 pl-6">
        {/* A little tear-off calendar page: the date is the point of an exam card. */}
        <div class="flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-xl border bg-background text-center shadow-xs">
          <span class="w-full bg-primary/10 py-0.5 text-xs font-bold text-primary">
            {new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(
              new Date(`${e.date}T00:00:00Z`),
            )}
          </span>
          <span class="py-1 font-serif text-2xl leading-none">{Number(e.date.slice(8, 10))}</span>
        </div>

        <div class="min-w-0 flex-1 space-y-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 space-y-1">
              {showSubject ? <SubjectTag subject={subject} /> : null}
              <h3 class="font-medium leading-snug">{e.title}</h3>
              <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>{formatDay(e.date, locale)}</span>
                {e.time ? <span>at {formatTime(e.time, locale)}</span> : null}
                {past ? (
                  <span>(sat)</span>
                ) : days <= 7 ? (
                  <Badge tone="warning" icon="hourglass">
                    {relativeDay(e.date, today)}
                  </Badge>
                ) : (
                  <span>({relativeDay(e.date, today)})</span>
                )}
              </p>
            </div>
            <div class="flex shrink-0 items-center">
              <a href={`/exams/${e.id}/edit`} aria-label={`Edit ${e.title}`} class={ICON_BTN}>
                <i data-lucide="pencil" class="h-4 w-4"></i>
              </a>
              <DeleteButton url={`/exams/${e.id}`} what={e.title} target={`exam-${e.id}`} />
            </div>
          </div>
          {e.description ? (
            <p class="line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">
              {e.description}
            </p>
          ) : null}
          <div class="flex flex-wrap items-center gap-2">
            <MarkBadge a={e} />
            {!past ? (
              <a
                href={`/planner/new?about=exam:${e.id}`}
                class="inline-flex h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <i data-lucide="calendar-plus" class="h-3.5 w-3.5"></i> Plan revision
              </a>
            ) : null}
          </div>
          <MaterialChips items={material} />
        </div>
      </div>
    </article>
  );
};

// ==========================================
// FORMS
// ==========================================

export const SubjectSelect = ({
  groups,
  selected,
}: {
  groups: SubjectOptionGroup[];
  selected?: number;
}) => (
  <Field id="subjectId" label="Subject">
    <select id="subjectId" name="subjectId" required class={SELECT}>
      <option value="">Choose a subject…</option>
      {groups.map((g) => (
        <optgroup label={g.semesterName}>
          {g.subjects.map((s) => (
            <option value={String(s.id)} selected={s.id === selected}>
              {s.code ? `${s.code}: ` : ""}
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  </Field>
);

const MarkFields = ({ a }: { a?: Pick<SelectAssignment, "mark" | "maxMark" | "weight"> }) => (
  <fieldset class="space-y-2">
    <legend class="text-sm font-medium">Marks</legend>
    <p class="text-xs text-muted-foreground">
      All optional. Leave "out of" empty if the mark is already a percentage.
    </p>
    <div class="grid grid-cols-3 gap-3">
      <Field id="mark" label="Mark">
        <input
          id="mark"
          name="mark"
          type="number"
          step="any"
          min="0"
          inputmode="decimal"
          value={a?.mark ?? ""}
          class={INPUT}
        />
      </Field>
      <Field id="maxMark" label="Out of">
        <input
          id="maxMark"
          name="maxMark"
          type="number"
          step="any"
          min="0"
          inputmode="decimal"
          value={a?.maxMark ?? ""}
          class={INPUT}
        />
      </Field>
      <Field id="weight" label="Weight %">
        <input
          id="weight"
          name="weight"
          type="number"
          step="any"
          min="0"
          max="100"
          inputmode="decimal"
          value={a?.weight ?? ""}
          class={INPUT}
        />
      </Field>
    </div>
  </fieldset>
);

const NoSubjectsYet = ({ what }: { what: string }) => (
  <div class={`${CARD} space-y-3 p-6 text-center`}>
    <p class="font-medium">First, a subject</p>
    <p class="text-sm text-muted-foreground">
      Every {what} belongs to a subject. Add one and come back.
    </p>
    <a
      href="/semesters"
      class="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      <i data-lucide="book-open" class="h-4 w-4"></i> Go to subjects
    </a>
  </div>
);

export const AssignmentFormPage = ({
  a,
  groups,
  subjectId,
  today,
}: {
  a?: SelectAssignment;
  groups: SubjectOptionGroup[];
  subjectId?: number;
  today: string;
}) => (
  <Page
    title={a ? "Edit assignment" : "New assignment"}
    back={{ href: "/assignments", label: "Assignments" }}
    width="narrow"
  >
    {groups.length === 0 ? (
      <NoSubjectsYet what="assignment" />
    ) : (
      <FormCard
        action={a ? `/assignments/${a.id}` : "/assignments"}
        submitLabel={a ? "Save changes" : "Add assignment"}
        cancelHref="/assignments"
      >
        <SubjectSelect groups={groups} selected={a?.subjectId ?? subjectId} />
        <Field id="title" label="Title">
          <input
            id="title"
            name="title"
            required
            maxlength={160}
            value={a?.title ?? ""}
            placeholder="e.g. Lab report 2"
            class={INPUT}
          />
        </Field>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field id="dueDate" label="Due date">
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              required
              value={a?.dueDate ?? today}
              class={INPUT}
            />
          </Field>
          <Field id="status" label="Status">
            <select id="status" name="status" class={SELECT}>
              {ASSIGNMENT_STATUSES.map((s) => (
                <option value={s} selected={(a?.status ?? "todo") === s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field id="description" label="Notes on the task">
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Word count, rubric bits, where to submit…"
            class={TEXTAREA}
          >
            {a?.description ?? ""}
          </textarea>
        </Field>
        <MarkFields a={a} />
      </FormCard>
    )}
  </Page>
);

export const ExamFormPage = ({
  e,
  groups,
  subjectId,
  today,
}: {
  e?: SelectExam;
  groups: SubjectOptionGroup[];
  subjectId?: number;
  today: string;
}) => (
  <Page
    title={e ? "Edit exam" : "New exam"}
    back={{ href: "/exams", label: "Exams" }}
    width="narrow"
  >
    {groups.length === 0 ? (
      <NoSubjectsYet what="exam" />
    ) : (
      <FormCard
        action={e ? `/exams/${e.id}` : "/exams"}
        submitLabel={e ? "Save changes" : "Add exam"}
        cancelHref="/exams"
      >
        <SubjectSelect groups={groups} selected={e?.subjectId ?? subjectId} />
        <Field id="title" label="Title">
          <input
            id="title"
            name="title"
            required
            maxlength={160}
            value={e?.title ?? ""}
            placeholder="e.g. Final exam"
            class={INPUT}
          />
        </Field>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field id="date" label="Date">
            <input
              id="date"
              name="date"
              type="date"
              required
              value={e?.date ?? today}
              class={INPUT}
            />
          </Field>
          <Field id="time" label="Start time" hint="Optional">
            <input id="time" name="time" type="time" value={e?.time ?? ""} class={INPUT} />
          </Field>
        </div>
        <Field id="description" label="Details">
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Room, what's allowed in, topics covered…"
            class={TEXTAREA}
          >
            {e?.description ?? ""}
          </textarea>
        </Field>
        <MarkFields a={e} />
      </FormCard>
    )}
  </Page>
);
