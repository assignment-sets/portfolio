# Spark ID Card

Reusable, transparent ID-card component with the particle/chalk outline effect
from the full-screen `SparkBadge` scene. It renders **only the card, metal ring,
and lanyard** — no rain, no ground, no background.

## Usage

```tsx
import { SparkIdCard } from "@/components/ui/spark-id-card";

<div className="w-[280px]">
  <SparkIdCard />
</div>
```

With a custom name:

```tsx
<SparkIdCard name="Ada Lovelace" className="w-[320px]" />
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | `"Gourab"` | Text inside the card's display box. Layout stays fixed. |
| `className` | `string` | `""` | Classes for the sizing wrapper. |
| `style` | `CSSProperties` | — | Inline styles for the sizing wrapper. |
| `interactive` | `boolean` | `true` | Enables scoped pointer parallax. |
| `ariaLabel` | `string` | `"Animated ID card for {name}"` | Accessibility label. |

## Sizing

The wrapper defaults to `width: 100%` and `aspect-ratio: 420 / 1000` (card plus
lanyard). Set a width on the parent or pass `className` / `style` to override.
The whole scene scales proportionally.

## Notes

- The canvas is transparent: only white particle strokes are drawn. It is meant
  for dark surfaces.
- The renderer pauses when offscreen or when the tab is hidden, and respects
  `prefers-reduced-motion`.
- The engine (`spark-id-card-engine.ts`) is framework-agnostic if you need to
  mount the effect outside React:

  ```ts
  import { createSparkIdCardEngine } from "@/components/ui/spark-id-card";

  const engine = createSparkIdCardEngine(canvas, { name: "Gourab" });
  // engine.pause(); engine.resume(); engine.destroy();
  ```

- The existing full-screen `SparkBadge` is untouched.
