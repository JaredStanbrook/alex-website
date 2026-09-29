/**
 * Marks → grades → GPA, in one small pure module.
 *
 * Universities disagree about all of this, and the brief deliberately left the
 * rules open. So the rules are kept here, as data, where they are easy to find
 * and change: swap `GRADE_BANDS` for your university's bands and every page
 * follows. The default is the common Australian 7-point scale.
 */

export interface GradeBand {
  /** Lowest percentage that earns this band. */
  min: number;
  short: string;
  name: string;
  points: number;
}

/** Highest first. The last band must start at 0 so every mark lands somewhere. */
export const GRADE_BANDS: GradeBand[] = [
  { min: 80, short: "HD", name: "High Distinction", points: 7 },
  { min: 70, short: "D", name: "Distinction", points: 6 },
  { min: 60, short: "C", name: "Credit", points: 5 },
  { min: 50, short: "P", name: "Pass", points: 4 },
  { min: 0, short: "N", name: "Fail", points: 0 },
];

export const GPA_MAX = Math.max(...GRADE_BANDS.map((b) => b.points));

export const bandFor = (percent: number): GradeBand =>
  GRADE_BANDS.find((b) => percent >= b.min) ?? GRADE_BANDS[GRADE_BANDS.length - 1];

export interface Marked {
  mark: number | null;
  maxMark: number | null;
  weight: number | null;
}

/** A mark with no "out of" is read as a percentage already. */
export const percentOf = (a: Pick<Marked, "mark" | "maxMark">): number | null => {
  if (a.mark === null || a.mark === undefined) return null;
  if (!a.maxMark) return a.mark;
  return (a.mark / a.maxMark) * 100;
};

export interface SubjectResult {
  percent: number | null;
  /** `final` when the official mark is recorded, `estimate` when inferred. */
  source: "final" | "estimate" | null;
  band: GradeBand | null;
  /** How much of the subject's weight has a mark so far, in percent. */
  weightMarked: number;
}

/**
 * A subject's grade: the recorded final mark if there is one, otherwise the
 * weighted average of whatever has been marked so far.
 *
 * When no marked assessment has a weight, each counts equally — a better
 * guess than refusing to estimate at all.
 */
export const subjectResult = (finalMark: number | null, assessments: Marked[]): SubjectResult => {
  const marked = assessments.filter((a) => percentOf(a) !== null);
  const weightMarked = marked.reduce((sum, a) => sum + (a.weight ?? 0), 0);

  if (finalMark !== null && finalMark !== undefined) {
    return { percent: finalMark, source: "final", band: bandFor(finalMark), weightMarked };
  }
  if (marked.length === 0) return { percent: null, source: null, band: null, weightMarked: 0 };

  const weighted = marked.filter((a) => (a.weight ?? 0) > 0);
  const percent =
    weighted.length > 0
      ? weighted.reduce((sum, a) => sum + percentOf(a)! * a.weight!, 0) / weightMarked
      : marked.reduce((sum, a) => sum + percentOf(a)!, 0) / marked.length;

  return { percent, source: "estimate", band: bandFor(percent), weightMarked };
};

export interface GpaInput {
  credits: number;
  result: SubjectResult;
}

export interface Gpa {
  value: number | null;
  /** Credits that contributed. */
  credits: number;
  /** True when any contributing subject is an estimate rather than a final. */
  provisional: boolean;
}

/** Credit-weighted mean of grade points over the subjects that have a grade. */
export const gpaOf = (subjects: GpaInput[]): Gpa => {
  const graded = subjects.filter((s) => s.result.band && s.credits > 0);
  const credits = graded.reduce((sum, s) => sum + s.credits, 0);
  if (credits === 0) return { value: null, credits: 0, provisional: false };

  const points = graded.reduce((sum, s) => sum + s.result.band!.points * s.credits, 0);
  return {
    value: points / credits,
    credits,
    provisional: graded.some((s) => s.result.source === "estimate"),
  };
};
