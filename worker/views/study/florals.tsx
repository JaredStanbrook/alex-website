// worker/views/study/florals.tsx
//
// Hand-drawn floral ornaments. Pure decoration: every one is aria-hidden and
// coloured with theme tokens (`fill-chart-*`, `stroke-*`, `currentColor`), so
// they recolour with the theme instead of being artwork for one mode.
//
// Colour classes are written out whole — Tailwind only generates class names
// it can find complete in the source.

import type { Child } from "hono/jsx";

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

// ==========================================
// THE BOUQUET
// ==========================================
//
// The one memorable thing in the app (docs/design.md): a small hand-tied
// bouquet on the Today page — rose, marigold daisy, cornflower, heather and a
// bud. Stems carry `pathLength="1"` so CSS can draw them in; flowers and
// leaves carry `bloom` and a stagger index. All of it is skipped under
// prefers-reduced-motion (see index.css).

const bloom = (i: number) => `--i:${i}`;

/**
 * Position and animation live on separate elements on purpose: the bloom
 * animation sets CSS `transform`, which would replace an SVG `transform`
 * attribute on the same element and send the flower to the origin.
 */
const Placed = ({ at, i, children }: { at: string; i: number; children?: Child }) => (
  <g transform={at}>
    <g class="bloom" style={bloom(i)}>
      {children}
    </g>
  </g>
);

const Leaf = ({
  x,
  y,
  r,
  s = 1,
  i,
}: {
  x: number;
  y: number;
  r: number;
  s?: number;
  i: number;
}) => (
  <Placed at={`translate(${x} ${y}) rotate(${r}) scale(${s})`} i={i}>
    <path d={leaf} class="fill-chart-2" />
  </Placed>
);

export const Bouquet = ({ class: cls = "h-72 w-60" }: { class?: string }) => (
  <svg
    viewBox="0 0 260 300"
    class={`bouquet ${cls}`}
    aria-hidden="true"
    focusable="false"
    fill="none"
  >
    {/* Stems, gathered at the tie. */}
    <g class="stroke-chart-2" stroke-width="2.4" stroke-linecap="round">
      <path class="stem" pathLength="1" d="M130 282C128 220 126 150 130 84" />
      <path class="stem" pathLength="1" d="M130 282C120 220 96 162 74 122" />
      <path class="stem" pathLength="1" d="M130 282C140 220 168 162 190 118" />
      <path class="stem" pathLength="1" d="M130 282C110 240 72 212 44 180" />
      <path class="stem" pathLength="1" d="M130 282C150 246 194 218 220 186" />
    </g>

    {/* Leaves along the stems. */}
    <Leaf x={127} y={190} r={-150} s={1.3} i={0} />
    <Leaf x={129} y={150} r={-30} s={1.2} i={1} />
    <Leaf x={104} y={196} r={-120} s={1.1} i={2} />
    <Leaf x={156} y={194} r={-60} s={1.1} i={3} />
    <Leaf x={86} y={222} r={-160} s={1} i={4} />
    <Leaf x={178} y={228} r={-20} s={1} i={5} />

    {/* Heather: a spray of tiny bells up the far-left stem. */}
    <g class="bloom fill-chart-5" style={bloom(6)}>
      {[
        [44, 176, 4.2],
        [52, 170, 3.6],
        [40, 166, 3.4],
        [50, 160, 3],
        [58, 184, 3.4],
        [36, 184, 3],
        [46, 152, 2.6],
      ].map(([cx, cy, r]) => (
        <circle cx={cx} cy={cy} r={r} />
      ))}
    </g>

    {/* Marigold daisy. */}
    <Placed at="translate(72 116)" i={7}>
      {Array.from({ length: 12 }, (_, k) => (
        <ellipse
          cx="0"
          cy="-15"
          rx="4.2"
          ry="11"
          transform={`rotate(${k * 30})`}
          class="fill-chart-4"
        />
      ))}
      <circle r="7.5" class="fill-chart-2" />
    </Placed>

    {/* Cornflower: ragged, star-like petals. */}
    <Placed at="translate(192 112)" i={8}>
      {Array.from({ length: 9 }, (_, k) => (
        <path
          d="M-5 -6L0 -22 5 -6Z M-3 -18l-4 -4M3 -18l4 -4"
          transform={`rotate(${k * 40})`}
          class="fill-chart-3 stroke-chart-3"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      ))}
      <circle r="6" class="fill-chart-5" />
    </Placed>

    {/* A bud, still closed. */}
    <Placed at="translate(222 182) rotate(35)" i={9}>
      <path d="M0 -14C8 -8 8 4 0 8 -8 4 -8 -8 0 -14Z" class="fill-chart-1" />
      <path
        d="M-6 4C-4 10 4 10 6 4"
        class="stroke-chart-2"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </Placed>

    {/* The rose: layered petals, with the page colour drawing the folds. */}
    <Placed at="translate(130 76)" i={10}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          cx="0"
          cy="-14"
          rx="13"
          ry="15"
          transform={`rotate(${a})`}
          class="fill-chart-1"
          opacity="0.75"
        />
      ))}
      <circle r="17" class="fill-chart-1" />
      <path
        d="M-9 2C-9 -8 3 -12 8 -4 12 2 6 10 -1 8 -7 6 -6 -2 0 -3 4 -3 4 2 1 3"
        class="stroke-background"
        stroke-width="2.2"
        stroke-linecap="round"
      />
      <path
        d="M-15 6C-10 16 10 17 15 7"
        class="stroke-background"
        stroke-width="2"
        stroke-linecap="round"
      />
    </Placed>

    {/* A ribbon tying it together. */}
    <Placed at="translate(130 252)" i={11}>
      <path d="M0 0C-14 -14 -30 -10 -26 0 -22 10 -10 6 0 0Z" class="fill-primary" />
      <path d="M0 0C14 -14 30 -10 26 0 22 10 10 6 0 0Z" class="fill-primary" />
      <path
        d="M-2 2L-14 26M2 2L12 28"
        class="stroke-primary"
        stroke-width="4"
        stroke-linecap="round"
      />
      <circle r="4.5" class="fill-primary" />
    </Placed>
  </svg>
);
