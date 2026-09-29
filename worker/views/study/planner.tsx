// worker/views/study/planner.tsx

import type { SelectStudySession, SessionStatus } from "@server/schema/study-session.schema";
import { SESSION_STATUSES } from "@server/schema/study-session.schema";
import type { AboutLabel } from "@server/services/study.service";
import type { LinkOptionGroup } from "@server/services/links.service";
import { sessionMinutes } from "@server/services/study.service";
import { addDays } from "@server/lib/dates";
import {
  BTN_OUTLINE,
  BTN_PRIMARY,
  CARD,
  DeleteButton,
  Dot,
  Field,
  FormCard,
  ICON_BTN,
  INPUT,
  Page,
  ProgressBar,
  SELECT,
  TEXTAREA,
} from "./ui";
import { formatDay, formatMinutes, formatTime, formatWeekday } from "./format";

const STATUS_LABEL: Record<SessionStatus, string> = {
  planned: "Planned",
  done: "Done",
  skipped: "Skipped",
};

const timeRange = (s: SelectStudySession, locale: string) => {
  const minutes = sessionMinutes(s);
  const parts: string[] = [];
  if (s.startTime)
    parts.push(
      s.endTime
        ? `${formatTime(s.startTime, locale)} – ${formatTime(s.endTime, locale)}`
        : formatTime(s.startTime, locale),
    );
  if (minutes) parts.push(formatMinutes(minutes));
  return parts.join(" · ") || "Any time";
};

// ==========================================
// SESSION CARD
// ==========================================

export const SessionCard = ({
  s,
  about,
  locale,
  showDate = false,
}: {
  s: SelectStudySession;
  about?: AboutLabel;
  locale: string;
  showDate?: boolean;
}) => {
  const done = s.status === "done";
  const skipped = s.status === "skipped";

  return (
    <article
      id={`session-${s.id}`}
      class={`${CARD} flex items-start gap-3 p-3 ${skipped ? "opacity-70" : ""}`}
    >
      {/* The big round tick is the main action of the planner, so it gets the
          most generous target on the card. */}
      <button
        type="button"
        hx-post={`/planner/${s.id}/status`}
        hx-vals={JSON.stringify({ status: done ? "planned" : "done" })}
        hx-target={`#session-${s.id}`}
        hx-swap="outerHTML"
        aria-label={done ? `Mark ${s.title} as not done` : `Mark ${s.title} as done`}
        aria-pressed={done ? "true" : "false"}
        class={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          done
            ? "border-success bg-success text-success-foreground"
            : "border-input text-muted-foreground hover:border-primary hover:text-primary"
        }`}
      >
        <i data-lucide={done ? "check" : "circle-dashed"} class="h-5 w-5"></i>
      </button>

      <div class="min-w-0 flex-1 space-y-1 py-0.5">
        <h3
          class={`font-medium leading-snug ${done ? "text-muted-foreground line-through decoration-2 decoration-success/60" : ""}`}
        >
          {s.title}
        </h3>
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showDate ? <span>{formatDay(s.date, locale)} ·</span> : null}
          <span class="inline-flex items-center gap-1">
            <i data-lucide="clock" class="h-3 w-3"></i>
            {timeRange(s, locale)}
          </span>
          {skipped ? <span>· skipped</span> : null}
        </p>
        {about ? (
          <a
            href={about.href}
            class="inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Dot colour={about.colour} class="h-2 w-2" />
            <i data-lucide={about.icon} class="h-3 w-3"></i>
            <span class="truncate">{about.label}</span>
          </a>
        ) : null}
        {s.notes ? (
          <p class="line-clamp-2 text-xs text-muted-foreground whitespace-pre-line">{s.notes}</p>
        ) : null}
      </div>

      <div class="flex shrink-0 items-center">
        <a href={`/planner/${s.id}/edit`} aria-label={`Edit ${s.title}`} class={ICON_BTN}>
          <i data-lucide="pencil" class="h-4 w-4"></i>
        </a>
        <DeleteButton url={`/planner/${s.id}`} what={s.title} target={`session-${s.id}`} />
      </div>
    </article>
  );
};

// ==========================================
// WEEK VIEW
// ==========================================

interface PlannerProps {
  weekStart: string;
  today: string;
  sessions: SelectStudySession[];
  aboutOf: (s: SelectStudySession) => AboutLabel | undefined;
  locale: string;
}

export const PlannerPage = ({ weekStart, today, sessions, aboutOf, locale }: PlannerProps) => {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const counted = sessions.filter((s) => s.status !== "skipped");
  const done = counted.filter((s) => s.status === "done");
  const minutesDone = done.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const isThisWeek = today >= weekStart && today <= addDays(weekStart, 6);

  return (
    <Page
      title="Planner"
      eyebrow={isThisWeek ? "This week" : `Week of ${formatDay(weekStart, locale)}`}
      eyebrowIcon="calendar-days"
      subtitle={
        counted.length === 0
          ? "A blank week. Pencil in a session or two?"
          : `${done.length} of ${counted.length} sessions done${minutesDone ? ` · ${formatMinutes(minutesDone)} studied` : ""}`
      }
      actions={
        <a href={`/planner/new?date=${isThisWeek ? today : weekStart}`} class={BTN_PRIMARY}>
          <i data-lucide="plus" class="h-4 w-4"></i> Plan a session
        </a>
      }
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <a
            href={`/planner?week=${addDays(weekStart, -7)}`}
            aria-label="Previous week"
            class={ICON_BTN}
          >
            <i data-lucide="chevron-left" class="h-5 w-5"></i>
          </a>
          <a
            href={`/planner?week=${addDays(weekStart, 7)}`}
            aria-label="Next week"
            class={ICON_BTN}
          >
            <i data-lucide="chevron-right" class="h-5 w-5"></i>
          </a>
          {!isThisWeek ? (
            <a href="/planner" class={BTN_OUTLINE}>
              Back to this week
            </a>
          ) : null}
        </div>
        {counted.length > 0 ? (
          <div class="w-full max-w-xs flex-1">
            <ProgressBar value={done.length} max={counted.length} label="Sessions done this week" />
          </div>
        ) : null}
      </div>

      <ol class="space-y-5">
        {days.map((day) => {
          const own = sessions.filter((s) => s.date === day);
          const isToday = day === today;
          return (
            <li class="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
              <div class="flex items-baseline gap-2 sm:flex-col sm:gap-0 sm:pt-2">
                <span class={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                  {isToday ? "Today" : formatWeekday(day, locale)}
                </span>
                <span class="text-xs text-muted-foreground">{formatDay(day, locale)}</span>
              </div>
              <div class="min-w-0 space-y-2">
                {own.map((s) => (
                  <SessionCard s={s} about={aboutOf(s)} locale={locale} />
                ))}
                <a
                  href={`/planner/new?date=${day}`}
                  class={`flex min-h-11 items-center gap-2 rounded-xl border border-dashed px-3 text-sm text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary ${own.length ? "" : "bg-muted/20"}`}
                >
                  <i data-lucide="plus" class="h-4 w-4"></i>
                  {own.length
                    ? "Add another"
                    : day < today
                      ? "Nothing planned"
                      : "Free — add a session"}
                </a>
              </div>
            </li>
          );
        })}
      </ol>
    </Page>
  );
};

// ==========================================
// FORM
// ==========================================

export const AboutSelect = ({
  groups,
  selected,
}: {
  groups: LinkOptionGroup[];
  selected: string;
}) => (
  <Field id="about" label="What's it for?" hint="Optional — pick the most specific thing.">
    <select id="about" name="about" class={SELECT}>
      <option value="">Just studying</option>
      {groups.map((g) => (
        <optgroup
          label={`${g.subject.code || g.subject.name}${g.subject.code ? ` · ${g.subject.name}` : ""}`}
        >
          <option
            value={`subject:${g.subject.id}`}
            selected={selected === `subject:${g.subject.id}`}
          >
            {g.subject.name} (whole subject)
          </option>
          {g.assignments.map((a) => (
            <option value={`assignment:${a.id}`} selected={selected === `assignment:${a.id}`}>
              Assignment: {a.title}
            </option>
          ))}
          {g.exams.map((e) => (
            <option value={`exam:${e.id}`} selected={selected === `exam:${e.id}`}>
              Exam: {e.title}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  </Field>
);

export const aboutValueOf = (
  s: Pick<SelectStudySession, "subjectId" | "assignmentId" | "examId">,
) =>
  s.assignmentId
    ? `assignment:${s.assignmentId}`
    : s.examId
      ? `exam:${s.examId}`
      : s.subjectId
        ? `subject:${s.subjectId}`
        : "";

export const SessionFormPage = ({
  s,
  groups,
  date,
  about,
}: {
  s?: SelectStudySession;
  groups: LinkOptionGroup[];
  date: string;
  about: string;
}) => (
  <Page
    title={s ? "Edit session" : "Plan a study session"}
    back={{ href: `/planner?week=${s?.date ?? date}`, label: "Planner" }}
    width="narrow"
  >
    <FormCard
      action={s ? `/planner/${s.id}` : "/planner"}
      submitLabel={s ? "Save changes" : "Add to planner"}
      cancelHref={`/planner?week=${s?.date ?? date}`}
    >
      <Field id="title" label="What will you work on?">
        <input
          id="title"
          name="title"
          required
          maxlength={160}
          value={s?.title ?? ""}
          placeholder="e.g. Chapter 4 practice questions"
          class={INPUT}
        />
      </Field>
      <AboutSelect groups={groups} selected={about} />
      <Field id="date" label="Day">
        <input id="date" name="date" type="date" required value={s?.date ?? date} class={INPUT} />
      </Field>
      <fieldset class="space-y-2">
        <legend class="text-sm font-medium">When</legend>
        <p class="text-xs text-muted-foreground">
          Set a start and end, or just a length — whatever suits.
        </p>
        <div class="grid grid-cols-3 gap-3">
          <Field id="startTime" label="From">
            <input
              id="startTime"
              name="startTime"
              type="time"
              value={s?.startTime ?? ""}
              class={INPUT}
            />
          </Field>
          <Field id="endTime" label="To">
            <input id="endTime" name="endTime" type="time" value={s?.endTime ?? ""} class={INPUT} />
          </Field>
          <Field id="durationMinutes" label="Minutes">
            <input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min="1"
              max="1440"
              step="5"
              inputmode="numeric"
              value={s?.durationMinutes ?? ""}
              placeholder="45"
              class={INPUT}
            />
          </Field>
        </div>
      </fieldset>
      {s ? (
        <Field id="status" label="Status">
          <select id="status" name="status" class={SELECT}>
            {SESSION_STATUSES.map((st) => (
              <option value={st} selected={s.status === st}>
                {STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field id="notes" label="Notes" hint="Optional">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Where you left off, what to bring…"
          class={TEXTAREA}
        >
          {s?.notes ?? ""}
        </textarea>
      </Field>
    </FormCard>
  </Page>
);
