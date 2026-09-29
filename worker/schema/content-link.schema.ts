// worker/schema/content-link.schema.ts
//
// Many-to-many links from study material (notes, resources, flashcard sets) to
// the academic items they are about (subjects, assignments, exams).
//
// One polymorphic table rather than nine join tables: every pairing is linked,
// listed and cleared the same way, and nine near-identical tables would be
// nine places to forget an ownership check. The trade is that the ids carry no
// foreign keys — which is why reads always join back to the live row and skip
// soft-deleted ones (see worker/services/links.service.ts).

import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

import { ownershipColumns } from "./common";

export const LINK_ITEM_TYPES = ["note", "resource", "flashcard_set"] as const;
export type LinkItemType = (typeof LINK_ITEM_TYPES)[number];

export const LINK_TARGET_TYPES = ["subject", "assignment", "exam"] as const;
export type LinkTargetType = (typeof LINK_TARGET_TYPES)[number];

export const contentLink = sqliteTable(
  "content_link",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemType: text("item_type", { enum: LINK_ITEM_TYPES }).notNull(),
    itemId: integer("item_id").notNull(),
    targetType: text("target_type", { enum: LINK_TARGET_TYPES }).notNull(),
    targetId: integer("target_id").notNull(),
    ...ownershipColumns,
  },
  (table) => [
    uniqueIndex("content_link_unique_idx").on(
      table.itemType,
      table.itemId,
      table.targetType,
      table.targetId,
    ),
    index("content_link_target_idx").on(table.userId, table.targetType, table.targetId),
    index("content_link_item_idx").on(table.userId, table.itemType, table.itemId),
  ],
);

export type SelectContentLink = typeof contentLink.$inferSelect;
