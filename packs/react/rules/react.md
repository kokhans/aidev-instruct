---
description: "React rules for every supported version, 16.14 to 19: pure components, keys, minimal state, effects and removed legacy APIs."
globs: ["**/*.tsx", "**/*.jsx"]
---

# React

## Components

- Components and hooks are pure. Render never mutates props, state or values already passed to JSX.
- List keys are stable IDs from the data, never the array index of a list that changes.
- Function components take defaults as parameter defaults, never `defaultProps`. Props are typed with TypeScript, never `propTypes`. React 19 ignores both on function components.
- No string refs, `findDOMNode`, legacy context (`contextTypes`, `getChildContext`) or `UNSAFE_` lifecycle methods. React 19 removes the first three.
- Each independent area of the UI sits inside its own error boundary, so one failure does not blank the page.

## State and Effects

- State holds the minimum. Anything computable from props or state is computed during render.
- State that must reset when an identity changes resets through a new `key`, not an effect that copies props into state.
- Effects only sync with systems outside React. Event logic stays in event handlers.
- Every effect that subscribes, starts a timer or sends a request returns a cleanup that undoes it.
