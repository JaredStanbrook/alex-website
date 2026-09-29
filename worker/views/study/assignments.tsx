// worker/views/study/assignments.tsx

import type { SelectAssignment } from "@server/schema/assessment.schema";
import type { Material } from "@server/services/links.service";
import { daysUntil } from "@server/lib/dates";
import { AssignmentCard, isOpen, type SubjectLite } from "./assessments";
import { BTN_PRIMARY, EmptyState, Page, Section } from "./ui";

export type AssignmentFilter = "open" | "done" | "all";

const FILTERS: { key: AssignmentFilter; label: string }[] = [
  { key: "open", label: "To do" },
  { key: "done", label: "Done" },
  { key: "all", label: "Everything" },
];

export const FilterTabs = <K extends string>({
  base,
  param,
  current,
  options,
}: {
  base: string;
  param: string;
  current: K;
  options: { key: K; label: string; count?: number }[];
}) => (
  <nav class="inline-flex rounded-xl bg-muted p-1" aria-label="Filter">
    {options.map((o) => (
      <a
        href={`${base}?${param}=${o.key}`}
        aria-current={current === o.key ? "page" : undefined}
        class={`inline-flex h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors ${
          current === o.key
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {o.label}
        {o.count !== undefined ? (
          <span class="text-xs tabular-nums opacity-70">{o.count}</span>
        ) : null}
      </a>
    ))}
  </nav>
);

interface Props {
  assignments: SelectAssignment[];
  subjects: Map<number, SubjectLite>;
  material: Map<number, Material[]>;
  show: AssignmentFilter;
  today: string;
  locale: string;
  hasSubjects: boolean;
}

export const AssignmentListPage = ({
  assignments,
  subjects,
  material,
  show,
  today,
  locale,
  hasSubjects,
}: Props) => {
  const open = assignments.filter(isOpen);
  const done = assignments.filter((a) => !isOpen(a)).reverse();

  const card = (a: SelectAssignment) => (
    <AssignmentCard
      a={a}
      subject={subjects.get(a.subjectId)}
      material={material.get(a.id)}
      today={today}
      locale={locale}
    />
  );
  const list = (items: SelectAssignment[]) => (
    <div class="grid gap-3 md:grid-cols-2">{items.map(card)}</div>
  );

  const overdue = open.filter((a) => daysUntil(a.dueDate, today) < 0);
  const thisWeek = open.filter((a) => {
    const d = daysUntil(a.dueDate, today);
    return d >= 0 && d <= 7;
  });
  const later = open.filter((a) => daysUntil(a.dueDate, today) > 7);

  return (
    <Page
      title="Assignments"
      subtitle={
        open.length === 0
          ? "Nothing outstanding. Enjoy the breathing room."
          : `${open.length} still to hand in${overdue.length ? `, ${overdue.length} of them overdue` : ""}.`
      }
      actions={
        hasSubjects ? (
          <a href="/assignments/new" class={BTN_PRIMARY}>
            <i data-lucide="plus" class="h-4 w-4"></i> New assignment
          </a>
        ) : null
      }
    >
      <FilterTabs
        base="/assignments"
        param="show"
        current={show}
        options={FILTERS.map((f) => ({
          ...f,
          count:
            f.key === "open" ? open.length : f.key === "done" ? done.length : assignments.length,
        }))}
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon="clipboard-list"
          title="No assignments yet"
          body={
            hasSubjects
              ? "Add your first one and it'll show up here, sorted by due date."
              : "Add a subject first — assignments live inside subjects."
          }
          action={
            <a href={hasSubjects ? "/assignments/new" : "/semesters"} class={BTN_PRIMARY}>
              <i data-lucide="plus" class="h-4 w-4"></i>{" "}
              {hasSubjects ? "New assignment" : "Add a subject"}
            </a>
          }
        />
      ) : show === "open" ? (
        open.length === 0 ? (
          <EmptyState
            icon="party-popper"
            title="All caught up"
            body="Every assignment is submitted or marked."
          />
        ) : (
          <div class="space-y-8">
            {overdue.length ? (
              <Section title="Overdue" icon="alarm-clock">
                {list(overdue)}
              </Section>
            ) : null}
            {thisWeek.length ? (
              <Section title="Next seven days" icon="calendar">
                {list(thisWeek)}
              </Section>
            ) : null}
            {later.length ? (
              <Section title="Later on" icon="calendar-days">
                {list(later)}
              </Section>
            ) : null}
          </div>
        )
      ) : show === "done" ? (
        done.length === 0 ? (
          <EmptyState
            icon="clipboard-check"
            title="Nothing handed in yet"
            body="Submitted and marked work will collect here."
          />
        ) : (
          list(done)
        )
      ) : (
        list(assignments)
      )}
    </Page>
  );
};
