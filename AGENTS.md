# AGENTS.md

## Purpose
Define rules, constraints, and conventions for AI agents contributing to this repo.
Optimize for:
- Low token usage
- Deterministic outputs
- Minimal regressions
- Fast iteration

---

## Core Principles
- Prefer **edits over rewrites**
- Keep diffs **small + localized**
- Avoid unnecessary abstraction
- Follow existing patterns before introducing new ones
- Deterministic > clever

---

## Project Structure
- `/app` → core app logic
- `/components` → reusable UI
- `/lib` → utilities/helpers
- `/api` → server/API handlers
- `/styles` → global styles
- `/tests` → unit/integration tests

Do not create new top-level folders without strong reason.

---

## Coding Rules

### General
- Use consistent formatting (respect existing lint rules)
- Avoid adding dependencies unless required
- No dead code / commented blocks
- No console logs in production code

### Naming
- Functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files: match existing convention

### Complexity
- Max function length: ~50 lines
- Prefer pure functions
- Avoid deep nesting (>3 levels)

---

## Editing Strategy
1. Search for existing implementation
2. Extend instead of duplicating
3. Modify smallest possible surface area
4. Ensure backward compatibility

---

## Testing
- Add/update tests when behavior changes
- Do not remove tests unless invalid
- Cover:
  - Edge cases
  - Error states
  - Critical flows

---

## Regression Safety
- Do not change:
  - Public APIs without updating callers
  - Shared utilities without checking usage
- Run through:
  - Imports
  - Types/contracts
  - Side effects

---

## Performance
- Avoid unnecessary re-renders
- Memoize where beneficial
- Prefer simple solutions over micro-optimizations
- Do not build
- Do not run typecheck

---

## UX/UI
- Prioritize usable layouts on both mobile and desktop
- Prefer responsive edits over device-specific forks
- Preserve touch targets and readability on small screens
- Avoid horizontal overflow unless the pattern explicitly requires it
- Keep navigation, filters, and primary actions accessible at common breakpoints

---

## Security
- Never expose secrets
- Validate all inputs
- Sanitize user-generated content

---

## API Guidelines
- Consistent response shape:
```json
{ "data": ..., "error": null }
