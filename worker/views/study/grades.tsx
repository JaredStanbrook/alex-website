// worker/views/study/grades.tsx

import type { SelectSemester } from "@server/schema/semester.schema";
import type { SelectSubject } from "@server/schema/subject.schema";
import type { SelectAssignment, SelectExam } from "@server/schema/assessment.schema";
import {
  GPA_MAX,
  GRADE_BANDS,
  gpaOf,
  percentOf,
  subjectResult,
  type Gpa,
  type SubjectResult,
} from "@server/lib/grades";
import { Badge, CARD, Dot, EmptyState, INPUT, Page, BTN_PRIMARY } from "./ui";
import { formatNumber, formatPercent } from "./format";

interface Props {
  semesters: SelectSemester[];
  subjects: SelectSubject[];
  assignments: SelectAssignment[];
  exams: SelectExam[];
}

const GpaDial = ({ gpa, label }: { gpa: Gpa; label: string }) => (
  <div class="min-w-0">
    <p class="text-sm text-muted-foreground">{label}</p>
    <p class="font-serif text-4xl tabular-nums">
      {gpa.value === null ? "—" : gpa.value.toFixed(2)}
      <span class="text-base font-normal text-muted-foreground"> / {GPA_MAX}</span>
    </p>
    <p class="text-xs text-muted-foreground">
      {gpa.value === null
        ? "No grades yet"
        : `${formatNumber(gpa.credits)} credit${gpa.credits === 1 ? "" : "s"}${gpa.provisional ? ", some still estimates" : ""}`}
    </p>
  </div>
);

const ResultBadge = ({ result }: { result: SubjectResult }) =>
  result.percent === null ? (
    <Badge>No marks yet</Badge>
  ) : (
    <Badge tone={result.band!.points > 0 ? "success" : "danger"}>
      {formatPercent(result.percent)} {result.band!.short}
      {result.source === "estimate" ? " so far" : ""}
    </Badge>
  );

const KIND_ICON = { assignments: "clipboard-list", exams: "graduation-cap" } as const;

/** Small number inputs, still 44px tall. */
const NUM = `${INPUT} w-full min-w-0 px-2 text-center tabular-nums normal-case tracking-normal text-foreground`;

const MarkRow = ({
  kind,
  a,
}: {
  kind: "assignments" | "exams";
  a: SelectAssignment | SelectExam;
}) => {
  const pct = percentOf(a);
  return (
    <form
      method="post"
      action={`/grades/${kind}/${a.id}`}
      class="grid grid-cols-[1fr_auto] items-center gap-2 py-2 sm:grid-cols-[1fr_16rem_auto]"
    >
      <div class="min-w-0">
        <p class="flex items-center gap-1.5 truncate text-sm font-medium">
          <i data-lucide={KIND_ICON[kind]} class="h-3.5 w-3.5 shrink-0 text-muted-foreground"></i>
          <span class="truncate">{a.title}</span>
        </p>
        <p class="text-xs text-muted-foreground">
          {pct === null ? "Not marked" : formatPercent(pct)}
        </p>
      </div>
      <div class="col-span-2 grid grid-cols-3 gap-1.5 sm:col-span-1">
        <label class="space-y-0.5 text-sm text-muted-foreground">
          <span>Mark</span>
          <input
            name="mark"
            type="number"
            step="any"
            min="0"
            inputmode="decimal"
            value={a.mark ?? ""}
            class={NUM}
          />
        </label>
        <label class="space-y-0.5 text-sm text-muted-foreground">
          <span>Out of</span>
          <input
            name="maxMark"
            type="number"
            step="any"
            min="0"
            inputmode="decimal"
            value={a.maxMark ?? ""}
            class={NUM}
          />
        </label>
        <label class="space-y-0.5 text-sm text-muted-foreground">
          <span>Weight %</span>
          <input
            name="weight"
            type="number"
            step="any"
            min="0"
            max="100"
            inputmode="decimal"
            value={a.weight ?? ""}
            class={NUM}
          />
        </label>
      </div>
      <button
        type="submit"
        aria-label={`Save mark for ${a.title}`}
        class="col-start-2 row-start-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-primary hover:bg-primary/10 sm:col-start-auto sm:row-start-auto"
      >
        <i data-lucide="check" class="h-4 w-4"></i>
      </button>
    </form>
  );
};

export const GradesPage = ({ semesters, subjects, assignments, exams }: Props) => {
  const resultOf = (s: SelectSubject) =>
    subjectResult(s.finalMark, [
      ...assignments.filter((a) => a.subjectId === s.id),
      ...exams.filter((e) => e.subjectId === s.id),
    ]);
  const overall = gpaOf(subjects.map((s) => ({ credits: s.credits, result: resultOf(s) })));

  return (
    <Page
      title="Grades"
      subtitle="Enter marks as they come back. Grades are estimated until a final mark is in."
    >
      {subjects.length === 0 ? (
        <EmptyState
          icon="trophy"
          title="Nothing to grade yet"
          body="Once you have subjects with assignments or exams, their marks and your GPA show up here."
          action={
            <a href="/semesters" class={BTN_PRIMARY}>
              <i data-lucide="book-open" class="h-4 w-4"></i> Set up subjects
            </a>
          }
        />
      ) : (
        <>
          <div class={`${CARD} grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:items-center`}>
            <GpaDial gpa={overall} label="Overall GPA" />
            <details class="text-sm">
              <summary class="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <i data-lucide="info" class="h-4 w-4"></i> How this is worked out
              </summary>
              <div class="space-y-2 pt-2 text-muted-foreground">
                <p>
                  Each subject's grade is its final mark if you've entered one, otherwise the
                  weighted average of the marks so far. GPA is the credit-weighted average of grade
                  points:
                </p>
                <div class="flex flex-wrap gap-1.5">
                  {GRADE_BANDS.map((b) => (
                    <Badge>
                      {b.short} {b.min}%+ = {b.points}
                    </Badge>
                  ))}
                </div>
              </div>
            </details>
          </div>

          {semesters.map((sem) => {
            const own = subjects.filter((s) => s.semesterId === sem.id);
            if (own.length === 0) return null;
            const gpa = gpaOf(own.map((s) => ({ credits: s.credits, result: resultOf(s) })));
            return (
              <section class="space-y-3">
                <div class="flex flex-wrap items-end justify-between gap-2">
                  <h2 class="font-serif text-[1.35rem]">{sem.name}</h2>
                  <p class="text-sm text-muted-foreground">
                    Semester GPA{" "}
                    <span class="font-semibold text-foreground tabular-nums">
                      {gpa.value === null ? "—" : gpa.value.toFixed(2)}
                    </span>
                  </p>
                </div>
                <div class="space-y-3">
                  {own.map((s) => {
                    const result = resultOf(s);
                    const items = [
                      ...assignments
                        .filter((a) => a.subjectId === s.id)
                        .map((a) => ({ kind: "assignments" as const, a })),
                      ...exams
                        .filter((e) => e.subjectId === s.id)
                        .map((a) => ({ kind: "exams" as const, a })),
                    ];
                    return (
                      <details id={`subject-${s.id}`} class={`${CARD} group overflow-hidden`}>
                        <summary class="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                          <Dot colour={s.colour} />
                          <span class="min-w-0 flex-1">
                            <span class="block truncate font-medium">{s.name}</span>
                            <span class="text-xs text-muted-foreground">
                              {s.code ? `${s.code}, ` : ""}
                              {formatNumber(s.credits)} credit{s.credits === 1 ? "" : "s"}
                            </span>
                          </span>
                          <ResultBadge result={result} />
                          <i
                            data-lucide="chevron-down"
                            class="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                          ></i>
                        </summary>
                        <div class="space-y-4 border-t px-4 pb-4 pt-3">
                          {items.length ? (
                            <div class="divide-y">
                              {items.map(({ kind, a }) => (
                                <MarkRow kind={kind} a={a} />
                              ))}
                            </div>
                          ) : (
                            <p class="text-sm text-muted-foreground">
                              No assignments or exams in this subject yet.
                            </p>
                          )}
                          <form
                            method="post"
                            action={`/grades/subjects/${s.id}`}
                            class="flex flex-wrap items-end gap-3 rounded-xl bg-muted/40 p-3"
                          >
                            <label class="space-y-1 text-xs font-medium">
                              <span>Credit points</span>
                              <input
                                name="credits"
                                type="number"
                                step="any"
                                min="0"
                                inputmode="decimal"
                                value={s.credits}
                                class={`${NUM} w-24`}
                              />
                            </label>
                            <label class="space-y-1 text-xs font-medium">
                              <span>Final mark %</span>
                              <input
                                name="finalMark"
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                inputmode="decimal"
                                value={s.finalMark ?? ""}
                                placeholder="—"
                                class={`${NUM} w-28`}
                              />
                            </label>
                            <button type="submit" class={BTN_PRIMARY}>
                              Save
                            </button>
                          </form>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </Page>
  );
};
