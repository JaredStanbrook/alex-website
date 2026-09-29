// worker/routes/study/helpers.ts
//
// Plumbing shared by every study router: the admin guard, form validation
// that answers in a way the page can show, and the delete response.

import { Hono, type Context, type Env, type ValidationTargets } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";

import type { AppEnv } from "@server/types";
import { requireRole } from "@server/middleware/guard.middleware";
import { flashToast, htmxRedirect, htmxToast } from "@server/lib/htmx-helpers";
import { today } from "@server/lib/dates";

/**
 * A router only the site owner reaches. Visitors see nothing here — public
 * content is served by routes/study/public.tsx, which reads only rows marked
 * public.
 */
export const studyRouter = () => {
  const router = new Hono<AppEnv>();
  router.use("*", requireRole("admin"));
  return router;
};

/**
 * Validate a form body, and on failure say why in a toast.
 *
 * The default zValidator answer is a JSON error object, which a boosted form
 * cannot display: the page just sits there. 422 keeps HTMX from swapping the
 * half-filled form away, and the HX-Trigger toast tells the user which field
 * to fix. With JavaScript off the plain-text body is at least legible.
 */
export const form = <T extends ZodType, Target extends keyof ValidationTargets = "form">(
  schema: T,
  target: Target = "form" as Target,
) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue?.message ?? "Something in the form needs another look";
      htmxToast(c, message, { type: "error" });
      return c.text(message, 422);
    }
  });

/** A positive integer `:id`, or a 404 — never NaN reaching a query. */
export const idParam = (c: Context, name = "id"): number => {
  const id = Number(c.req.param(name));
  if (!Number.isInteger(id) || id <= 0) throw new HTTPException(404, { message: "Not found" });
  return id;
};

export const userOf = (c: Context<AppEnv>) => c.var.auth.user!;

/** Today, in the site's zone — what the person reading the page calls today. */
export const todayOf = (c: Context<AppEnv>) => today(c.var.app.timezone);

export const nowIso = () => new Date().toISOString();

/**
 * Answer a soft delete.
 *
 * From a list the button targets its card, so an empty 200 removes it. From a
 * detail page there is no card to remove, so the answer is a redirect to the
 * list instead. And if nothing changed, say so and leave the page alone — an
 * empty 200 there would remove a card that is still in the database.
 */
export const deleted = <E extends Env>(
  c: Context<E>,
  changed: number,
  { noun, listHref }: { noun: string; listHref: string },
) => {
  if (changed === 0) {
    htmxToast(c, `That ${noun} could not be deleted. It may already be gone.`, { type: "error" });
    return c.body(null, 204);
  }

  if (!c.req.header("HX-Target")) {
    flashToast(c, `Deleted that ${noun}`);
    return htmxRedirect(c, listHref);
  }

  htmxToast(c, `Deleted that ${noun}`);
  return c.body(null, 200);
};

/** Back to where a form came from, if that is somewhere on this site. */
export const safeReturn = (value: string | undefined, fallback: string) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;

/**
 * Send the browser somewhere else from a GET, whether it arrived as a boosted
 * HTMX request or a plain page load. HX-Redirect does a full navigation, so
 * the flash toast set alongside it is shown on arrival.
 */
export const htmxRedirectTo = (c: Context, url: string) =>
  c.req.header("HX-Request") ? htmxRedirect(c, url) : c.redirect(url);
