---
description: Motion for React (motion/react) with LazyMotion, AnimatePresence, reduced motion and accessible animated text.
globs: ["**/*.tsx", "**/*.jsx"]
---

# Motion

Rules for the latest stable Motion for React (`motion/react`, formerly Framer Motion), which needs React 18 or later. Never install or import `framer-motion`.

## Choosing a Tool

- Hover, focus and simple state changes use CSS transitions. Motion handles exit animations, gestures, layout animations, scroll-linked values and sequences.
- Route and shared-element transitions driven by React updates use React `<ViewTransition>` (React 19.3). Motion animates inside components.
- Imperative animations on a few elements use `useAnimate` from `motion/react-mini` (WAAPI only). `motion/react` is for sequences, motion values and independent transforms.

## Bundle

- `LazyMotion` with `domAnimation` and `strict`, and `m` components from `motion/react-m`, so the full `motion` component never ships.
- `domMax` (drag, pan, layout animations) loads asynchronously: `features={() => import("./features").then((mod) => mod.default)}`.
- Motion components live in client components at the leaves. Pages stay server-rendered.

## Behaviour

- `MotionConfig reducedMotion="user"` at the root. `useReducedMotion` covers what it does not, such as autoplaying video and parallax.
- Animate `x`, `y`, `scale`, `rotate` and `opacity`. Size and position changes use the `layout` prop, never animated `width`, `height` or `top`.
- Every direct child of `AnimatePresence` has a stable unique `key`. `initial={false}` skips the entrance of children present on first render.
- A custom component directly inside `AnimatePresence mode="popLayout"` accepts `ref` and passes it to its DOM node.
- The LCP element (hero heading or image) is visible at first paint. Entrance animations start below it.
- Scroll reveals use `whileInView` with `viewport={{ once: true }}`.
- Text inside animated or masked elements stays whole in the HTML. Split words or letters only in `aria-hidden` copies next to a readable original.
