// worker/views/study/resources.tsx

import type { SelectResource } from "@server/schema/resource.schema";
import type { LinkOptionGroup, TargetLabel } from "@server/services/links.service";
import {
  BTN_PRIMARY,
  CARD,
  Checkbox,
  DeleteButton,
  EmptyState,
  Field,
  FormCard,
  ICON_BTN,
  INPUT,
  LinkPicker,
  Page,
  TEXTAREA,
  TargetChips,
  VisibilityToggle,
} from "./ui";

/** "www.youtube.com" → "youtube.com": the part people recognise. */
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const ResourceCard = ({ r, targets }: { r: SelectResource; targets?: TargetLabel[] }) => (
  <article id={`resource-${r.id}`} class={`${CARD} flex flex-col gap-3 p-4`}>
    <div class="flex items-start gap-3">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <i data-lucide="link" class="h-5 w-5"></i>
      </span>
      <div class="min-w-0 flex-1">
        {/* External, so it opens in a new tab and hands the other site no
            reference back to this one. */}
        <a
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          hx-boost="false"
          class="group inline-flex max-w-full items-center gap-1 font-medium leading-snug hover:text-primary"
        >
          <span class="truncate">{r.title}</span>
          <i
            data-lucide="external-link"
            class="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary"
          ></i>
        </a>
        <p class="truncate text-xs text-muted-foreground">{hostOf(r.url)}</p>
      </div>
    </div>
    {r.description ? (
      <p class="text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">{r.description}</p>
    ) : null}
    <TargetChips targets={targets} />
    <div class="mt-auto flex items-center justify-between gap-2">
      <VisibilityToggle base="/resources" id={r.id} isPublic={r.isPublic} />
      <div class="flex items-center">
        <a href={`/resources/${r.id}/edit`} aria-label={`Edit ${r.title}`} class={ICON_BTN}>
          <i data-lucide="pencil" class="h-4 w-4"></i>
        </a>
        <DeleteButton url={`/resources/${r.id}`} what={r.title} target={`resource-${r.id}`} />
      </div>
    </div>
  </article>
);

export const ResourceListPage = ({
  resources,
  targets,
}: {
  resources: SelectResource[];
  targets: Map<number, TargetLabel[]>;
}) => (
  <Page
    title="Resources"
    subtitle={
      resources.length
        ? `${resources.length} saved link${resources.length === 1 ? "" : "s"}`
        : "Handy links, all in one place."
    }
    actions={
      <a href="/resources/new" class={BTN_PRIMARY}>
        <i data-lucide="plus" class="h-4 w-4"></i> Save a link
      </a>
    }
  >
    {resources.length === 0 ? (
      <EmptyState
        icon="library"
        title="The shelf is empty"
        body="Save lecture recordings, readings, that one brilliant explainer video — and link them to the subjects they help with."
        action={
          <a href="/resources/new" class={BTN_PRIMARY}>
            <i data-lucide="plus" class="h-4 w-4"></i> Save a link
          </a>
        }
      />
    ) : (
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => (
          <ResourceCard r={r} targets={targets.get(r.id)} />
        ))}
      </div>
    )}
  </Page>
);

export const ResourceFormPage = ({
  r,
  groups,
  links,
}: {
  r?: SelectResource;
  groups: LinkOptionGroup[];
  links: string[];
}) => (
  <Page
    title={r ? "Edit resource" : "Save a link"}
    back={{ href: "/resources", label: "Resources" }}
    width="narrow"
  >
    <FormCard
      action={r ? `/resources/${r.id}` : "/resources"}
      submitLabel={r ? "Save changes" : "Save link"}
      cancelHref="/resources"
    >
      <Field id="url" label="Web address">
        <input
          id="url"
          name="url"
          type="url"
          required
          maxlength={2000}
          value={r?.url ?? ""}
          placeholder="https://"
          class={INPUT}
        />
      </Field>
      <Field id="title" label="Name">
        <input
          id="title"
          name="title"
          required
          maxlength={160}
          value={r?.title ?? ""}
          placeholder="e.g. Week 3 lecture recording"
          class={INPUT}
        />
      </Field>
      <Field id="description" label="Why it's useful" hint="Optional">
        <textarea id="description" name="description" rows={3} class={TEXTAREA}>
          {r?.description ?? ""}
        </textarea>
      </Field>
      <LinkPicker groups={groups} selected={links} />
      <Checkbox
        name="isPublic"
        checked={r?.isPublic ?? false}
        label="Make public"
        hint="Shows on your public page for visitors."
      />
    </FormCard>
  </Page>
);
