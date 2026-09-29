// worker/views/study/today.tsx
//
// The first screen after signing in. Answers "what should I do now?" before
// anything else, then "what's coming?", then "where was I?".

import type { SelectSemester } from "@server/schema/semester.schema";
import type { SelectAssignment, SelectExam } from "@server/schema/assessment.schema";
import type { SelectStudySession } from "@server/schema/study-session.schema";
import type { LinkItemType } from "@server/schema/content-link.schema";
import { sessionMinutes, type AboutLabel } from "@server/services/study.service";
import { daysUntil } from "@server/lib/dates";
import { AssignmentLine, type SubjectLite } from "./assessments";
import { SessionCard } from "./planner";
import { BTN_OUTLINE, BTN_PRIMARY, CARD, Dot, EmptyState, ProgressBar, Section } from "./ui";
import { formatDay, formatMinutes, formatTime, formatWeekday, relativeDay } from "./format";

export interface RecentItem {
  type: LinkItemType;
  id: number;
  title: string;
  updatedAt: string;
  href: string;
}

interface TodayProps {
  name: string;
  hour: number;
  today: string;
  weekStart: string;
  locale: string;
  semester: SelectSemester | null;
  hasSubjects: boolean;
  subjects: Map<number, SubjectLite>;
  weekSessions: SelectStudySession[];
  aboutOf: (s: SelectStudySession) => AboutLabel | undefined;
  assignments: SelectAssignment[];
  exams: SelectExam[];
  recent: RecentItem[];
  learningCards: number;
}

const greeting = (hour: number) =>
  hour < 5
    ? { text: "Burning the midnight oil", icon: "moon" }
    : hour < 12
      ? { text: "Good morning", icon: "coffee" }
      : hour < 17
        ? { text: "Good afternoon", icon: "sun" }
        : hour < 21
          ? { text: "Good evening", icon: "sunset" }
          : { text: "Winding down", icon: "moon" };

const RECENT_ICON: Record<LinkItemType, string> = {
  note: "notebook-pen",
  resource: "link",
  flashcard_set: "layers",
};

const QUICK_ACTIONS = [
  { href: "/planner/new", icon: "calendar-plus", label: "Plan a session" },
  { href: "/notes/new", icon: "notebook-pen", label: "Write a note" },
  { href: "/assignments/new", icon: "clipboard-list", label: "Add assignment" },
  { href: "/flashcards", icon: "layers", label: "Flashcards" },
  { href: "/resources/new", icon: "link", label: "Save a link" },
];

export const TodayPage = (p: TodayProps) => {
  const hello = greeting(p.hour);
  const firstName = p.name.split(/[\s@]/)[0];
  const todays = p.weekSessions.filter((s) => s.date === p.today);
  const todayLeft = todays.filter((s) => s.status === "planned").length;
  const weekCounted = p.weekSessions.filter((s) => s.status !== "skipped");
  const weekDone = weekCounted.filter((s) => s.status === "done");
  const minutes = weekDone.reduce((sum, s) => sum + sessionMinutes(s), 0);
  const overdue = p.assignments.filter((a) => daysUntil(a.dueDate, p.today) < 0).length;

  const semesterWeek =
    p.semester && p.today >= p.semester.startDate && p.today <= p.semester.endDate
      ? Math.floor(-daysUntil(p.semester.startDate, p.today) / 7) + 1
      : null;

  return (
    <div class="mx-auto w-full max-w-5xl space-y-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-10 animate-in fade-in duration-300">
      <header class="space-y-2">
        <p class="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-primary">
          <i data-lucide={hello.icon} class="h-3.5 w-3.5"></i>
          {formatWeekday(p.today, p.locale)}, {formatDay(p.today, p.locale).replace(/^\S+\s/, "")}
          {p.semester ? ` · ${p.semester.name}${semesterWeek ? `, week ${semesterWeek}` : ""}` : ""}
        </p>
        <h1 class="font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {hello.text}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p class="text-muted-foreground">
          {!p.semester
            ? "Welcome to your study nook. Let's get you set up."
            : todays.length === 0
              ? "Nothing planned today. A good day to plan something — or rest."
              : todayLeft === 0
                ? "Everything for today is done. Lovely work."
                : `${todayLeft} session${todayLeft === 1 ? "" : "s"} to go today.`}
          {overdue ? ` ${overdue} thing${overdue === 1 ? " is" : "s are"} overdue, though.` : ""}
        </p>
      </header>

      {!p.semester || !p.hasSubjects ? (
        <div class={`${CARD} space-y-4 p-6`}>
          <h2 class="font-serif text-xl font-semibold">Getting started</h2>
          <ol class="space-y-3 text-sm">
            <li class="flex items-center gap-3">
              <span
                class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${p.semester ? "bg-success text-success-foreground" : "bg-primary/10 text-primary"}`}
              >
                {p.semester ? <i data-lucide="check" class="h-4 w-4"></i> : "1"}
              </span>
              <span class="flex-1">Create a semester with its start and end dates</span>
              {!p.semester ? (
                <a href="/semesters/new" class={BTN_PRIMARY}>
                  Create
                </a>
              ) : null}
            </li>
            <li class="flex items-center gap-3">
              <span
                class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${p.hasSubjects ? "bg-success text-success-foreground" : "bg-primary/10 text-primary"}`}
              >
                {p.hasSubjects ? <i data-lucide="check" class="h-4 w-4"></i> : "2"}
              </span>
              <span class="flex-1">Add the subjects you're taking</span>
              {p.semester && !p.hasSubjects ? (
                <a href="/subjects/new" class={BTN_PRIMARY}>
                  Add
                </a>
              ) : null}
            </li>
            <li class="flex items-center gap-3">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                3
              </span>
              <span class="flex-1 text-muted-foreground">
                Then assignments, exams, notes and a study plan fall into place
              </span>
            </li>
          </ol>
        </div>
      ) : null}

      <div class="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div class="min-w-0 space-y-8">
          <Section
            title="Today's study"
            icon="calendar-check"
            action={
              <a href={`/planner/new?date=${p.today}`} class={BTN_OUTLINE}>
                <i data-lucide="plus" class="h-4 w-4"></i> Add
              </a>
            }
          >
            {todays.length ? (
              <div class="space-y-2">
                {todays.map((s) => (
                  <SessionCard s={s} about={p.aboutOf(s)} locale={p.locale} />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon="coffee"
                title="A clear day"
                body="Plan a session, or just enjoy the quiet."
              />
            )}
          </Section>

          <Section
            title="Coming up"
            icon="alarm-clock"
            action={
              <a href="/assignments" class="text-sm text-muted-foreground hover:text-primary">
                All deadlines
              </a>
            }
          >
            {p.assignments.length === 0 && p.exams.length === 0 ? (
              <EmptyState
                compact
                icon="sparkles"
                title="Nothing due soon"
                body="No deadlines in the next two weeks."
              />
            ) : (
              <div class={`${CARD} divide-y p-1`}>
                {p.assignments.map((a) => (
                  <AssignmentLine
                    a={a}
                    subject={p.subjects.get(a.subjectId)}
                    today={p.today}
                    locale={p.locale}
                  />
                ))}
                {p.exams.map((e) => {
                  const subject = p.subjects.get(e.subjectId);
                  return (
                    <a
                      href={`/exams#exam-${e.id}`}
                      class="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 hover:bg-accent/60"
                    >
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <i data-lucide="graduation-cap" class="h-4 w-4"></i>
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium">{e.title}</span>
                        <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {subject ? <Dot colour={subject.colour} class="h-2 w-2" /> : null}
                          {subject ? `${subject.code || subject.name} · ` : ""}Exam
                          {e.time ? ` at ${formatTime(e.time, p.locale)}` : ""}
                        </span>
                      </span>
                      <span class="shrink-0 text-right text-xs font-medium">
                        {formatDay(e.date, p.locale)}
                        <span class="block font-normal text-muted-foreground">
                          {relativeDay(e.date, p.today)}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <aside class="min-w-0 space-y-8">
          <Section title="This week" icon="sprout">
            <div class={`${CARD} space-y-3 p-5`}>
              <div class="flex items-end justify-between gap-2">
                <p class="font-serif text-3xl font-semibold tabular-nums">
                  {weekDone.length}
                  <span class="text-base font-normal text-muted-foreground">
                    {" "}
                    / {weekCounted.length} sessions
                  </span>
                </p>
                {minutes ? (
                  <p class="text-sm text-muted-foreground">{formatMinutes(minutes)}</p>
                ) : null}
              </div>
              <ProgressBar
                value={weekDone.length}
                max={weekCounted.length}
                label="Sessions done this week"
              />
              <p class="text-xs text-muted-foreground">
                {weekCounted.length === 0
                  ? "No sessions planned this week yet."
                  : weekDone.length === weekCounted.length
                    ? "Every planned session done. Take a bow."
                    : "Little and often wins the semester."}
              </p>
              <a
                href={`/planner?week=${p.weekStart}`}
                class="inline-flex h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open planner <i data-lucide="arrow-right" class="h-4 w-4"></i>
              </a>
            </div>
            {p.learningCards ? (
              <a
                href="/flashcards"
                class={`${CARD} flex items-center gap-3 p-4 hover:bg-accent/40`}
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <i data-lucide="layers" class="h-5 w-5"></i>
                </span>
                <span class="text-sm">
                  <span class="font-medium">
                    {p.learningCards} flashcard{p.learningCards === 1 ? "" : "s"}
                  </span>{" "}
                  still to master
                </span>
              </a>
            ) : null}
          </Section>

          <Section title="Quick add" icon="zap">
            <div class="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a) => (
                <a
                  href={a.href}
                  class={`${CARD} flex min-h-11 items-center gap-2 px-3 py-3 text-sm font-medium hover:bg-accent/50`}
                >
                  <i data-lucide={a.icon} class="h-4 w-4 text-primary"></i>
                  {a.label}
                </a>
              ))}
            </div>
          </Section>

          <Section title="Recently touched" icon="history">
            {p.recent.length ? (
              <ul class={`${CARD} p-1`}>
                {p.recent.map((r) => (
                  <li>
                    <a
                      href={r.href}
                      class="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-accent/60"
                    >
                      <i
                        data-lucide={RECENT_ICON[r.type]}
                        class="h-4 w-4 shrink-0 text-muted-foreground"
                      ></i>
                      <span class="truncate">{r.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p class="text-sm text-muted-foreground">
                Notes, links and flashcards you work on will show up here.
              </p>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
};
