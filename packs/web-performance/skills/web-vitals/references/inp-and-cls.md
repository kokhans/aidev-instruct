# Interaction to Next Paint and Cumulative Layout Shift

## INP Phases

| Phase | Cause | Fix |
| --- | --- | --- |
| Input delay | Long tasks already running: hydration, third-party scripts, timers | Split startup work, load third parties after consent and idle, hydrate less |
| Processing | Heavy event handlers, synchronous state updates over large trees | Update the visible feedback first, defer the rest, memoize or virtualize large lists |
| Presentation delay | Large DOM, expensive layout and style recalculation | Smaller DOM, `content-visibility: auto` on off-screen sections, avoid layout reads after writes |

## Long Tasks

- Any task over 50 ms blocks input. Find them in the DevTools Performance panel and in Long Animation Frames (`PerformanceObserver` with `long-animation-frame`).
- Yield inside long work with `scheduler.yield()` where available, falling back to `setTimeout(resolve, 0)`.
- Move pure computation (parsing, search indexes, image processing) to a Web Worker.
- Debounce input-driven work such as search-as-you-type.
- Third-party tags run after the page is interactive and never inside input handlers.

## CLS Sources

| Source | Fix |
| --- | --- |
| Images, videos, iframes without dimensions | `width` and `height` attributes or `aspect-ratio` |
| Banners, cookie bars, ads inserted at the top | Overlay them, or reserve their space in the initial layout |
| Web font swap | Metric-matched fallback font |
| Client-rendered content above existing content | Skeleton with the final size, or insert below the viewport |
| Animations of `top`, `left`, `width`, `height` | Animate `transform` and `opacity` only |

- Shifts within 500 ms of a user input do not count. Content that expands after a click is fine.
- The back/forward cache restores pages without new shifts, so bfcache eligibility also helps CLS.
