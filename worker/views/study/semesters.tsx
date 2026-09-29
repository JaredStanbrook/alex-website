// worker/views/study/semesters.tsx

import type { SelectSemester } from "@server/schema/semester.schema";
import type { SelectSubject } from "@server/schema/subject.schema";
import type { SelectAssignment, SelectExam } from "@server/schema/assessment.schema";
import { daysUntil } from "@server/lib/dates";
import { subjectResult } from "@server/lib/grades";
import { isOpen } from "./assessments";
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
  Page,
  Section,
  TEXTAREA,
  colourOf,
} from "./ui";
import { Blossom } from "./florals";
import { formatDate, formatDay, formatPercent, relativeDay } from "./format";

interface SemesterPageProps {
  semesters: SelectSemester[];
  selected: SelectSemester | null;
  currentId?: number;
  subjects: SelectSubject[];
  assignments: SelectAssignment[];
  exams: SelectExam[];
  today: string;
  locale: string;
}

const weekOf = (s: SelectSemester, today: string) => {
  if (today < s.startDate || today > s.endDate) return null;
  const week = Math.floor(-daysUntil(s.startDate, today) / 7) + 1;
  const total = Math.ceil((daysUntil(s.endDate, s.startDate) + 1) / 7);
  return { week, total };
};

export const SemesterPage = ({
  semesters,
  selected,
  currentId,
  subjects,
  assignments,
  exams,
  today,
  locale,
}: SemesterPageProps) => {
  if (!selected) {
    return (
      <Page title="Subjects">
        <EmptyState
          icon="sprout"
          title="Let's set up your first semester"
          body="A semester holds your subjects, and subjects hold assignments and exams. Start here and everything else slots in."
          action={
            <a href="/semesters/new" class={BTN_PRIMARY}>
              <i data-lucide="plus" class="h-4 w-4"></i> New semester
            </a>
          }
        />
      </Page>
    );
  }

  const progress = weekOf(selected, today);

  return (
    <Page
      title={selected.name}
      subtitle={
        <>
          {selected.id === currentId ? "Your current semester, " : ""}
          {formatDate(selected.startDate, locale)} to {formatDate(selected.endDate, locale)}
          {progress ? `, now in week ${progress.week} of ${progress.total}` : ""}
        </>
      }
      actions={
        <>
          <a href={`/subjects/new?semester=${selected.id}`} class={BTN_PRIMARY}>
            <i data-lucide="plus" class="h-4 w-4"></i> Add subject
          </a>
          <a href="/semesters/new" class={BTN_OUTLINE}>
            <i data-lucide="calendar-plus" class="h-4 w-4"></i> New semester
          </a>
        </>
      }
    >
      {semesters.length > 1 ? (
        <nav
          aria-label="Semesters"
          class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {semesters.map((s) => (
            <a
              href={`/semesters?id=${s.id}`}
              aria-current={s.id === selected.id ? "page" : undefined}
              class={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
                s.id === selected.id
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-input bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.id === currentId ? <i data-lucide="star" class="h-3.5 w-3.5"></i> : null}
              {s.name}
            </a>
          ))}
        </nav>
      ) : null}

      <div class={`${CARD} flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p class="min-w-0 flex-1 text-sm text-muted-foreground">
          {selected.description || "No description. That's fine — it's a semester, not an essay."}
        </p>
        <div class="flex items-center gap-1">
          {selected.id !== currentId ? (
            <form method="post" action={`/semesters/${selected.id}/current`}>
              <button type="submit" class={BTN_OUTLINE}>
                <i data-lucide="star" class="h-4 w-4"></i> Make current
              </button>
            </form>
          ) : null}
          <a href={`/semesters/${selected.id}/edit`} aria-label="Edit semester" class={ICON_BTN}>
            <i data-lucide="pencil" class="h-4 w-4"></i>
          </a>
          <DeleteButton
            url={`/semesters/${selected.id}`}
            what={`${selected.name} and all its subjects`}
          />
        </div>
      </div>

      {progress ? (
        <div class="space-y-1.5">
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>Semester progress</span>
            <span>
              Week {progress.week} of {progress.total}
            </span>
          </div>
          <div class="flex gap-1" aria-hidden="true">
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                class={`h-2 flex-1 rounded-full ${i < progress.week ? "bg-primary" : "bg-muted"}`}
              ></span>
            ))}
          </div>
        </div>
      ) : null}

      <Section title="Subjects" icon="book-open">
        {subjects.length === 0 ? (
          <EmptyState
            icon="book-open"
            title="No subjects in this semester yet"
            body="Add the units you're taking. Each gets its own colour, so you can spot it anywhere."
            action={
              <a href={`/subjects/new?semester=${selected.id}`} class={BTN_PRIMARY}>
                <i data-lucide="plus" class="h-4 w-4"></i> Add subject
              </a>
            }
          />
        ) : (
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => {
              const own = assignments.filter((a) => a.subjectId === s.id);
              const ownExams = exams.filter((e) => e.subjectId === s.id);
              const open = own.filter(isOpen).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
              const nextExam = ownExams
                .filter((e) => daysUntil(e.date, today) >= 0)
                .sort((a, b) => a.date.localeCompare(b.date))[0];
              const result = subjectResult(s.finalMark, [...own, ...ownExams]);
              const colour = colourOf(s.colour);

              return (
                <a
                  href={`/subjects/${s.id}`}
                  class={`${CARD} group relative block overflow-hidden`}
                >
                  {/* A pressed flower in the subject's colour, peeking in. It is
                      the subject's colour marker, so there is no side bar too. */}
                  <Blossom
                    class="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rotate-12 opacity-70"
                    petal={colour.fill}
                  />
                  <div class="space-y-3 p-5">
                    <div class="flex items-start justify-between gap-2 pr-9">
                      <div class="min-w-0">
                        {s.code ? <p class="text-sm text-muted-foreground">{s.code}</p> : null}
                        <h3 class="font-serif text-[1.35rem] leading-snug">{s.name}</h3>
                      </div>
                      {result.percent !== null ? (
                        <Badge tone="success">
                          {formatPercent(result.percent)} {result.band!.short}
                        </Badge>
                      ) : null}
                    </div>
                    <ul class="space-y-1.5 text-sm text-muted-foreground">
                      <li class="flex items-center gap-2">
                        <i data-lucide="clipboard-list" class="h-3.5 w-3.5"></i>
                        {open.length === 0
                          ? "Nothing due"
                          : `${open[0].title}, due ${formatDay(open[0].dueDate, locale)}`}
                      </li>
                      <li class="flex items-center gap-2">
                        <i data-lucide="graduation-cap" class="h-3.5 w-3.5"></i>
                        {nextExam
                          ? `${nextExam.title} ${relativeDay(nextExam.date, today)}`
                          : "No exams coming up"}
                      </li>
                    </ul>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </Section>
    </Page>
  );
};

export const SemesterFormPage = ({ s, today }: { s?: SelectSemester; today: string }) => (
  <Page
    title={s ? "Edit semester" : "New semester"}
    back={{ href: s ? `/semesters?id=${s.id}` : "/semesters", label: "Subjects" }}
    width="narrow"
  >
    <FormCard
      action={s ? `/semesters/${s.id}` : "/semesters"}
      submitLabel={s ? "Save changes" : "Create semester"}
      cancelHref="/semesters"
    >
      <Field id="name" label="Name">
        <input
          id="name"
          name="name"
          required
          maxlength={80}
          value={s?.name ?? ""}
          placeholder="e.g. Semester 1, 2026"
          class={INPUT}
        />
      </Field>
      <div class="grid gap-4 sm:grid-cols-2">
        <Field id="startDate" label="Starts">
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            value={s?.startDate ?? today}
            class={INPUT}
          />
        </Field>
        <Field id="endDate" label="Ends">
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            value={s?.endDate ?? ""}
            class={INPUT}
          />
        </Field>
      </div>
      <Field id="description" label="Description" hint="Optional">
        <textarea
          id="description"
          name="description"
          rows={3}
          maxlength={500}
          placeholder="Goals for the semester, a motto, anything."
          class={TEXTAREA}
        >
          {s?.description ?? ""}
        </textarea>
      </Field>
      <Checkbox
        name="isCurrent"
        checked={s?.isCurrent ?? false}
        label="This is my current semester"
        hint="Today and the Subjects page open on it. Otherwise the one running today is used."
      />
    </FormCard>
  </Page>
);
