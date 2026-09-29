// worker/views/study/florals.tsx
//
// Hand-drawn floral ornaments. Pure decoration: every one is aria-hidden and
// coloured with theme tokens (`fill-chart-*`, `stroke-*`, `currentColor`), so
// they recolour with the theme instead of being artwork for one mode.
//
// Colour classes are written out whole — Tailwind only generates class names
// it can find complete in the source.

const PETAL_ANGLES = [0, 72, 144, 216, 288];

type Fill =
  | "fill-chart-1"
  | "fill-chart-2"
  | "fill-chart-3"
  | "fill-chart-4"
  | "fill-chart-5"
  | "fill-primary";

/** A five-petal blossom. */
export const Blossom = ({
  class: cls = "h-4 w-4",
  petal = "fill-chart-1",
  centre = "fill-chart-4",
}: {
  class?: string;
  petal?: Fill;
  centre?: Fill;
}) => (
  <svg viewBox="0 0 24 24" class={`shrink-0 ${cls}`} aria-hidden="true" focusable="false">
    {PETAL_ANGLES.map((a) => (
      <ellipse
        cx="12"
        cy="6.4"
        rx="3.7"
        ry="5.2"
        transform={`rotate(${a} 12 12)`}
        class={petal}
        opacity="0.9"
      />
    ))}
    <circle cx="12" cy="12" r="2.8" class={centre} />
  </svg>
);

/** A leaf, pointing right from the origin, for building sprigs and wreaths. */
const leaf = "M0 0C5-5 13-5 17 0 13 5 5 5 0 0Z";

/** A curving sprig with leaves, a bud and two blossoms. */
export const Sprig = ({ class: cls = "h-16 w-32" }: { class?: string }) => (
  <svg viewBox="0 0 140 70" class={cls} aria-hidden="true" focusable="false" fill="none">
    <path
      d="M6 64C34 50 64 38 118 16"
      class="stroke-chart-2"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M60 41C66 30 70 24 80 18"
      class="stroke-chart-2"
      stroke-width="1.6"
      stroke-linecap="round"
    />
    {[
      [22, 56, -40],
      [36, 50, 30],
      [48, 45, -35],
      [92, 27, 25],
      [100, 23, -45],
    ].map(([x, y, r]) => (
      <path
        d={leaf}
        transform={`translate(${x} ${y}) rotate(${r})`}
        class="fill-chart-2"
        opacity="0.85"
      />
    ))}
    <g transform="translate(106 2) scale(1.25)">
      {PETAL_ANGLES.map((a) => (
        <ellipse
          cx="12"
          cy="6.4"
          rx="3.7"
          ry="5.2"
          transform={`rotate(${a} 12 12)`}
          class="fill-chart-1"
          opacity="0.9"
        />
      ))}
      <circle cx="12" cy="12" r="2.8" class="fill-chart-4" />
    </g>
    <g transform="translate(70 4) scale(.85)">
      {PETAL_ANGLES.map((a) => (
        <ellipse
          cx="12"
          cy="6.4"
          rx="3.7"
          ry="5.2"
          transform={`rotate(${a} 12 12)`}
          class="fill-chart-5"
          opacity="0.85"
        />
      ))}
      <circle cx="12" cy="12" r="2.8" class="fill-chart-4" />
    </g>
    <ellipse
      cx="14"
      cy="58"
      rx="3"
      ry="4.5"
      transform="rotate(-60 14 58)"
      class="fill-chart-1"
      opacity="0.7"
    />
  </svg>
);

/** A ring of leaves with a blossom at its foot, framing an icon. */
export const Wreath = ({ class: cls = "h-20 w-20" }: { class?: string }) => {
  const leaves = [];
  // Leave a gap at the bottom (around 90°) for the blossom.
  for (let deg = 120; deg <= 420; deg += 22) {
    const rad = (deg * Math.PI) / 180;
    const x = 50 + 38 * Math.cos(rad);
    const y = 50 + 38 * Math.sin(rad);
    const flip = deg % 44 === 0 ? 1 : -1;
    leaves.push(
      <path
        d={leaf}
        transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(deg + 90 + flip * 25).toFixed(0)}) scale(.62)`}
        class="fill-chart-2"
        opacity="0.8"
      />,
    );
  }
  return (
    <svg viewBox="0 0 100 100" class={cls} aria-hidden="true" focusable="false" fill="none">
      <circle cx="50" cy="50" r="38" class="stroke-chart-2" stroke-width="1.2" opacity="0.6" />
      {leaves}
      <g transform="translate(38 76)">
        {PETAL_ANGLES.map((a) => (
          <ellipse
            cx="12"
            cy="6.4"
            rx="3.7"
            ry="5.2"
            transform={`rotate(${a} 12 12)`}
            class="fill-chart-1"
          />
        ))}
        <circle cx="12" cy="12" r="2.8" class="fill-chart-4" />
      </g>
    </svg>
  );
};

/** A divider: a thread either side of a little blossom and two leaves. */
export const FloralRule = ({ class: cls = "" }: { class?: string }) => (
  <div class={`flex items-center gap-3 text-border ${cls}`} aria-hidden="true">
    <span class="h-px flex-1 bg-current"></span>
    <svg viewBox="0 0 60 20" class="h-5 w-14 shrink-0" focusable="false">
      <path d={leaf} transform="translate(8 10) scale(.85)" class="fill-chart-2" />
      <path d={leaf} transform="translate(52 10) rotate(180) scale(.85)" class="fill-chart-2" />
      <g transform="translate(21 1) scale(.75)">
        {PETAL_ANGLES.map((a) => (
          <ellipse
            cx="12"
            cy="6.4"
            rx="3.7"
            ry="5.2"
            transform={`rotate(${a} 12 12)`}
            class="fill-chart-1"
          />
        ))}
        <circle cx="12" cy="12" r="2.8" class="fill-chart-4" />
      </g>
    </svg>
    <span class="h-px flex-1 bg-current"></span>
  </div>
);
