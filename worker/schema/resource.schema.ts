// worker/schema/resource.schema.ts
//
// A saved link — a lecture recording, a paper, a handy explainer. Links only:
// version 1 stores no files, so there is no R2 involved.

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { ownershipColumns } from "./common";
import { checkbox, optionalText, stringList } from "./form-helpers";

export const resource = sqliteTable(
  "resource",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    isPublic: integer("is_public", { mode: "boolean" }).default(false).notNull(),
    deletedAt: text("deleted_at"),
    ...ownershipColumns,
  },
  (table) => [index("resource_user_idx").on(table.userId)],
);

export const selectResourceSchema = createSelectSchema(resource);

export const resourceFormSchema = z.object({
  title: z.string().trim().min(1, "Give the link a name").max(160),
  // Only http(s). A `javascript:` URL is a valid URL, and rendering it as an
  // href — on a page visitors can load, once it is public — is a script
  // injection.
  url: z
    .string()
    .trim()
    .url("That does not look like a web address")
    .max(2000)
    .refine((u) => /^https?:\/\//i.test(u), "Links must start with http:// or https://"),
  description: optionalText(2000),
  isPublic: checkbox,
  links: stringList,
});

export type SelectResource = z.infer<typeof selectResourceSchema>;
