// worker/views/study/exams.tsx

import type { SelectExam } from "@server/schema/assessment.schema";
import type { Material } from "@server/services/links.service";
import { daysUntil } from "@server/lib/dates";
import { ExamCard, type SubjectLite } from "./assessments";
import { BTN_PRIMARY, EmptyState, Page, Section } from "./ui";

interface Props {
  exams: SelectExam[];
  subjects: Map<number, SubjectLite>;
  material: Map<number, Material[]>;
  today: string;
  locale: string;
  hasSubjects: boolean;
}

export const ExamListPage = ({ exams, subjects, material, today, locale, hasSubjects }: Props) => {
  const upcoming = exams.filter((e) => daysUntil(e.date, today) >= 0);
  const past = exams.filter((e) => daysUntil(e.date, today) < 0).reverse();
  const next = upcoming[0];

  const card = (e: SelectExam) => (
    <ExamCard
      e={e}
      subject={subjects.get(e.subjectId)}
      material={material.get(e.id)}
      today={today}
      locale={locale}
    />
  );

  return (
    <Page
      title="Exams"
      subtitle={
        next
          ? `Next up: ${next.title}, ${daysUntil(next.date, today) === 0 ? "today — good luck!" : `in ${daysUntil(next.date, today)} day${daysUntil(next.date, today) === 1 ? "" : "s"}`}`
          : "No exams on the horizon."
      }
      actions={
        hasSubjects ? (
          <a href="/exams/new" class={BTN_PRIMARY}>
            <i data-lucide="plus" class="h-4 w-4"></i> New exam
          </a>
        ) : null
      }
    >
      {exams.length === 0 ? (
        <EmptyState
          icon="graduation-cap"
          title="No exams yet"
          body={
            hasSubjects
              ? "Add one to start the countdown and plan some revision."
              : "Add a subject first — exams live inside subjects."
          }
          action={
            <a href={hasSubjects ? "/exams/new" : "/semesters"} class={BTN_PRIMARY}>
              <i data-lucide="plus" class="h-4 w-4"></i>{" "}
              {hasSubjects ? "New exam" : "Add a subject"}
            </a>
          }
        />
      ) : (
        <div class="space-y-8">
          <Section title="Coming up" icon="hourglass">
            {upcoming.length ? (
              <div class="grid gap-3 md:grid-cols-2">{upcoming.map(card)}</div>
            ) : (
              <EmptyState
                compact
                icon="party-popper"
                title="Nothing coming up"
                body="Every exam is behind you."
              />
            )}
          </Section>
          {past.length ? (
            <Section title="Behind you" icon="history">
              <div class="grid gap-3 md:grid-cols-2">{past.map(card)}</div>
            </Section>
          ) : null}
        </div>
      )}
    </Page>
  );
};
