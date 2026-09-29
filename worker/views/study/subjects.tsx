// worker/views/study/subjects.tsx

import type { SelectSemester } from "@server/schema/semester.schema";
import type { SelectSubject } from "@server/schema/subject.schema";
import type { SelectAssignment, SelectExam } from "@server/schema/assessment.schema";
import type { SelectStudySession } from "@server/schema/study-session.schema";
import type { Material } from "@server/services/links.service";
import { sessionMinutes, type AboutLabel } from "@server/services/study.service";
import { subjectResult } from "@server/lib/grades";
import { AssignmentCard, ExamCard, isOpen } from "./assessments";
import { SessionCard } from "./planner";
import {
  BTN_OUTLINE,
  CARD,
  ColourPicker,
  DeleteButton,
  EmptyState,
  Field,
  FormCard,
  INPUT,
  Page,
  PublicPill,
  SELECT,
  Section,
  TEXTAREA,
  colourOf,
} from "./ui";
import { formatMinutes, formatNumber, formatPercent } from "./format";

interface SubjectPageProps {
  subject: SelectSubject;
  semester?: SelectSemester;
  assignments: SelectAssignment[];
  exams: SelectExam[];
  sessions: SelectStudySession[];
  aboutOf: (s: SelectStudySession) => AboutLabel | undefined;
  material: Material[];
  assessmentMaterial: { assignment: Map<number, Material[]>; exam: Map<number, Material[]> };
  today: string;
  locale: string;
}

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div class="min-w-0">
    <p class="text-sm text-muted-foreground">{label}</p>
    <p class="font-serif text-2xl tabular-nums">{value}</p>
    {hint ? <p class="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const MATERIAL_META = {
  note: { icon: "notebook-pen", label: "Notes", add: "/notes/new" },
  resource: { icon: "link", label: "Resources", add: "/resources/new" },
  flashcard_set: { icon: "layers", label: "Flashcards", add: "/flashcards/new" },
} as const;

export const MaterialList = ({ items }: { items: Material[] }) => (
  <div class="space-y-4">
    {(Object.keys(MATERIAL_META) as (keyof typeof MATERIAL_META)[]).map((type) => {
      const own = items.filter((m) => m.type === type);
      if (own.length === 0) return null;
      return (
        <div class="space-y-1">
          <p class="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
            <i data-lucide={MATERIAL_META[type].icon} class="h-3.5 w-3.5"></i>
            {MATERIAL_META[type].label}
          </p>
          <ul>
            {own.map((m) => (
              <li>
                <a
                  href={m.href}
                  class="flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 text-sm hover:bg-accent/60"
                >
                  <span class="truncate">{m.title}</span>
                  <PublicPill isPublic={m.isPublic} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    })}
  </div>
);

export const SubjectPage = ({
  subject: s,
  semester,
  assignments,
  exams,
  sessions,
  aboutOf,
  material,
  assessmentMaterial,
  today,
  locale,
}: SubjectPageProps) => {
  const result = subjectResult(s.finalMark, [...assignments, ...exams]);
  const done = sessions.filter((x) => x.status === "done");
  const minutes = done.reduce((sum, x) => sum + sessionMinutes(x), 0);
  const upcomingSessions = sessions
    .filter((x) => x.status === "planned" && x.date >= today)
    .reverse()
    .slice(0, 5);
  const recentSessions = done.slice(0, 5);
  const openCount = assignments.filter(isOpen).length;
  const colour = colourOf(s.colour);

  return (
    <Page
      title={s.name}
      back={{
        href: semester ? `/semesters?id=${semester.id}` : "/semesters",
        label: semester?.name ?? "Subjects",
      }}
      subtitle={s.code ?? undefined}
      actions={
        <>
          <a href={`/subjects/${s.id}/edit`} class={BTN_OUTLINE}>
            <i data-lucide="pencil" class="h-4 w-4"></i> Edit
          </a>
          <DeleteButton
            url={`/subjects/${s.id}`}
            what={`${s.name}, with its assignments and exams`}
            label
          />
        </>
      }
    >
      <div class={`${CARD} relative overflow-hidden`}>
        <div class={`absolute inset-0 ${colour.soft}`}></div>
        <div class="relative space-y-4 p-5">
          {s.description ? (
            <p class="max-w-2xl text-sm whitespace-pre-line">{s.description}</p>
          ) : null}
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Grade"
              value={
                result.percent === null
                  ? "—"
                  : `${formatPercent(result.percent)} ${result.band!.short}`
              }
              hint={
                result.source === "final"
                  ? "Final"
                  : result.source === "estimate"
                    ? `So far, from ${formatNumber(result.weightMarked)}% of the marks`
                    : "No marks yet"
              }
            />
            <Stat
              label="To do"
              value={String(openCount)}
              hint={openCount === 1 ? "assignment" : "assignments"}
            />
            <Stat
              label="Studied"
              value={minutes ? formatMinutes(minutes) : "0m"}
              hint={`${done.length} session${done.length === 1 ? "" : "s"}`}
            />
            <Stat label="Credits" value={formatNumber(s.credits)} />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <a href={`/assignments/new?subject=${s.id}`} class={BTN_OUTLINE}>
          <i data-lucide="clipboard-list" class="h-4 w-4"></i> Assignment
        </a>
        <a href={`/exams/new?subject=${s.id}`} class={BTN_OUTLINE}>
          <i data-lucide="graduation-cap" class="h-4 w-4"></i> Exam
        </a>
        <a href={`/planner/new?about=subject:${s.id}`} class={BTN_OUTLINE}>
          <i data-lucide="calendar-plus" class="h-4 w-4"></i> Study session
        </a>
        <a href={`/notes/new?link=subject:${s.id}`} class={BTN_OUTLINE}>
          <i data-lucide="notebook-pen" class="h-4 w-4"></i> Note
        </a>
      </div>

      <div class="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div class="min-w-0 space-y-8">
          <Section title="Assignments" icon="clipboard-list">
            {assignments.length ? (
              <div class="space-y-3">
                {assignments.map((a) => (
                  <AssignmentCard
                    a={a}
                    subject={s}
                    material={assessmentMaterial.assignment.get(a.id)}
                    today={today}
                    locale={locale}
                    showSubject={false}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon="clipboard-list"
                title="No assignments"
                body="Nothing set yet — lucky you."
              />
            )}
          </Section>

          <Section title="Exams" icon="graduation-cap">
            {exams.length ? (
              <div class="space-y-3">
                {exams.map((e) => (
                  <ExamCard
                    e={e}
                    subject={s}
                    material={assessmentMaterial.exam.get(e.id)}
                    today={today}
                    locale={locale}
                    showSubject={false}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon="graduation-cap"
                title="No exams"
                body="Add one when the timetable comes out."
              />
            )}
          </Section>
        </div>

        <aside class="min-w-0 space-y-8">
          <Section title="Study sessions" icon="calendar-days">
            {upcomingSessions.length || recentSessions.length ? (
              <div class="space-y-2">
                {upcomingSessions.map((x) => (
                  <SessionCard s={x} about={aboutOf(x)} locale={locale} showDate />
                ))}
                {recentSessions.length ? (
                  <p class="pt-2 text-sm font-bold text-muted-foreground">Recently done</p>
                ) : null}
                {recentSessions.map((x) => (
                  <SessionCard s={x} about={aboutOf(x)} locale={locale} showDate />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon="calendar-days"
                title="No sessions yet"
                body="Plan one from the button above."
              />
            )}
          </Section>

          <Section title="Study material" icon="library">
            {material.length ? (
              <MaterialList items={material} />
            ) : (
              <EmptyState
                compact
                icon="library"
                title="Nothing linked"
                body="Link notes, resources and flashcards to this subject and they'll gather here."
              />
            )}
          </Section>
        </aside>
      </div>
    </Page>
  );
};

export const SubjectFormPage = ({
  s,
  semesters,
  semesterId,
}: {
  s?: SelectSubject;
  semesters: SelectSemester[];
  semesterId?: number;
}) => (
  <Page
    title={s ? "Edit subject" : "New subject"}
    back={{ href: s ? `/subjects/${s.id}` : "/semesters", label: s ? s.name : "Subjects" }}
    width="narrow"
  >
    <FormCard
      action={s ? `/subjects/${s.id}` : "/subjects"}
      submitLabel={s ? "Save changes" : "Add subject"}
      cancelHref={s ? `/subjects/${s.id}` : "/semesters"}
    >
      <div class="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <Field id="name" label="Name">
          <input
            id="name"
            name="name"
            required
            maxlength={120}
            value={s?.name ?? ""}
            placeholder="e.g. Human Physiology"
            class={INPUT}
          />
        </Field>
        <Field id="code" label="Code" hint="Optional">
          <input
            id="code"
            name="code"
            maxlength={20}
            value={s?.code ?? ""}
            placeholder="PHYS1001"
            class={INPUT}
          />
        </Field>
      </div>
      <Field id="semesterId" label="Semester">
        <select id="semesterId" name="semesterId" required class={SELECT}>
          {semesters.map((sem) => (
            <option value={String(sem.id)} selected={sem.id === (s?.semesterId ?? semesterId)}>
              {sem.name}
            </option>
          ))}
        </select>
      </Field>
      <ColourPicker name="colour" current={s?.colour ?? "1"} />
      <Field id="description" label="Description" hint="Optional">
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Lecturer, class times, what it's about…"
          class={TEXTAREA}
        >
          {s?.description ?? ""}
        </textarea>
      </Field>
      <div class="grid gap-4 sm:grid-cols-2">
        <Field id="credits" label="Credit points" hint="How much it counts towards your GPA.">
          <input
            id="credits"
            name="credits"
            type="number"
            step="any"
            min="0"
            inputmode="decimal"
            value={s?.credits ?? 1}
            class={INPUT}
          />
        </Field>
        <Field id="finalMark" label="Final mark %" hint="Leave empty until results are out.">
          <input
            id="finalMark"
            name="finalMark"
            type="number"
            step="any"
            min="0"
            max="100"
            inputmode="decimal"
            value={s?.finalMark ?? ""}
            class={INPUT}
          />
        </Field>
      </div>
    </FormCard>
  </Page>
);
