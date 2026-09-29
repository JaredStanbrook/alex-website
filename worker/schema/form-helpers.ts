// worker/schema/form-helpers.ts
//
// Zod pieces for what an HTML form actually sends. Everything in a form body
// is a string, an empty field is "" rather than absent, and an unticked
// checkbox is not sent at all — so the validators have to say what each of
// those means rather than letting "" slip into the database.

import { z } from "zod";

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/** `YYYY-MM-DD`, as `<input type="date">` sends it. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Pick a real date");

/** `HH:MM`, as `<input type="time">` sends it. Empty means "no time". */
export const optionalTime = z.preprocess(
  blankToUndefined,
  z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 14:30")
    .optional(),
);

/** Free text where empty means "nothing", stored as null. */
export const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

/** A number field where empty means "not recorded yet". */
export const optionalNumber = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().min(min).max(max).optional());

/** A `<select>` of rows where the empty option means "none". */
export const optionalId = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().positive().optional(),
);

/**
 * An unchecked checkbox is absent from the body entirely, so this has to
 * tolerate `undefined` as well as the "on" the browser sends when ticked.
 */
export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

/**
 * A group of same-named checkboxes. One ticked box arrives as a string, several
 * as an array, none as nothing at all.
 */
export const stringList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]));
