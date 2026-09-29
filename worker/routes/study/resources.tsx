// worker/routes/study/resources.tsx
//
// Saved links. Links only — no uploads in version 1.

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { resource, resourceFormSchema } from "@server/schema/resource.schema";
import { AccessControl } from "@server/services/access.service";
import {
  linkOptions,
  linkValuesOf,
  parseLinkRefs,
  setLinks,
  targetsFor,
} from "@server/services/links.service";
import { flashToast, htmxResponse } from "@server/lib/htmx-helpers";
import { ResourceFormPage, ResourceListPage } from "@views/study/resources";
import { VisibilityToggle } from "@views/study/ui";
import { deleted, form, idParam, nowIso, studyRouter, userOf } from "./helpers";

export const resourcesRoute = studyRouter();
const access = new AccessControl();

const owned = (userId: string, id?: number) =>
  and(
    eq(resource.userId, userId),
    isNull(resource.deletedAt),
    id === undefined ? undefined : eq(resource.id, id),
  );

resourcesRoute.get("/", async (c) => {
  const user = userOf(c);
  access.authorize(user, "resources", "read");
  const rows = await c.var.db
    .select()
    .from(resource)
    .where(owned(user.id))
    .orderBy(desc(resource.createdAt));
  const targets = await targetsFor(
    c.var.db,
    user.id,
    "resource",
    rows.map((r) => r.id),
  );
  return c.render(<ResourceListPage resources={rows} targets={targets} />, { title: "Resources" });
});

resourcesRoute.get("/new", async (c) => {
  const user = userOf(c);
  access.authorize(user, "resources", "create");
  const groups = await linkOptions(c.var.db, user.id);
  const preset = c.req.query("link");
  return htmxResponse(
    c,
    "New resource",
    <ResourceFormPage groups={groups} links={preset ? [preset] : []} />,
  );
});

resourcesRoute.post("/", form(resourceFormSchema), async (c) => {
  const user = userOf(c);
  access.authorize(user, "resources", "create");
  const data = c.req.valid("form");

  const [created] = await c.var.db
    .insert(resource)
    .values({
      title: data.title,
      url: data.url,
      description: data.description ?? null,
      isPublic: data.isPublic,
      userId: user.id,
      updatedAt: nowIso(),
    })
    .returning({ id: resource.id });
  if (created) await setLinks(c.var.db, user.id, "resource", created.id, parseLinkRefs(data.links));

  flashToast(c, "Link saved to your shelf");
  return c.redirect("/resources");
});

resourcesRoute.get("/:id/edit", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  const [existing] = await c.var.db.select().from(resource).where(owned(user.id, id));
  if (!existing) return c.notFound();
  access.authorize(user, "resources", "update", existing.userId);

  const [groups, links] = await Promise.all([
    linkOptions(c.var.db, user.id),
    linkValuesOf(c.var.db, user.id, "resource", id),
  ]);
  return htmxResponse(
    c,
    "Edit resource",
    <ResourceFormPage r={existing} groups={groups} links={links} />,
  );
});

resourcesRoute.post("/:id", form(resourceFormSchema), async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "resources", "update", user.id);
  const data = c.req.valid("form");

  const changed = await c.var.db
    .update(resource)
    .set({
      title: data.title,
      url: data.url,
      description: data.description ?? null,
      isPublic: data.isPublic,
      updatedAt: nowIso(),
    })
    .where(owned(user.id, id))
    .returning({ id: resource.id });
  if (changed.length === 0) return c.notFound();
  await setLinks(c.var.db, user.id, "resource", id, parseLinkRefs(data.links));

  flashToast(c, "Resource saved");
  return c.redirect("/resources");
});

resourcesRoute.post("/:id/visibility", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "resources", "update", user.id);

  const [updated] = await c.var.db
    .update(resource)
    .set({ isPublic: sql`NOT ${resource.isPublic}`, updatedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ isPublic: resource.isPublic });
  if (!updated) return c.notFound();

  return c.html(<VisibilityToggle base="/resources" id={id} isPublic={updated.isPublic} />);
});

resourcesRoute.delete("/:id", async (c) => {
  const user = userOf(c);
  const id = idParam(c);
  access.authorize(user, "resources", "delete", user.id);

  const changed = await c.var.db
    .update(resource)
    .set({ deletedAt: nowIso() })
    .where(owned(user.id, id))
    .returning({ id: resource.id });

  return deleted(c, changed.length, { noun: "resource", listHref: "/resources" });
});
