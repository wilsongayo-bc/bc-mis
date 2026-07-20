# ADR 002: Standardize Page Size Dropdown via Shared Component

Status: Accepted

## Context

Multiple list pages implemented similar but duplicated pagination selectors (items per page). This led to inconsistent styling, behavior, and maintenance overhead when updating options or UI. The application uses React + Tailwind with Redux on several pages, and supports dark/light themes.

## Decision

Introduce a single reusable component `PageSizeDropdown` (`src/components/PageSizeDropdown.tsx`) to provide a uniform items-per-page selector across list pages with consistent options and styling.

## Details

- Options: `25/page`, `50/page`, `100/page`, `200/page`
- Styling: Tailwind CSS, dark-mode compatible
- Behavior: Changing page size resets pagination to page 1 and triggers data reload
- Integration: Works with local state or Redux; caller passes `value` and `onChange(number)`

## Alternatives Considered

1. Keep inline `<select>` per page
   - Pros: No refactor needed
   - Cons: Inconsistent UX, duplicated code, high maintenance, error-prone

2. Use global Redux slice for shared UI elements
   - Pros: Central state
   - Cons: Over-couples pages; component-only reuse is sufficient and simpler

## Consequences

- Positive: Consistent UX, reduced duplication, faster future changes
- Neutral: Slight initial refactor effort
- Negative: None identified

## Implementation

Component created in `src/components/PageSizeDropdown.tsx` and adopted in:

- `src/pages/ActivityLogs.tsx`
- `src/pages/DocumentRequirements.tsx`
- `src/pages/DocumentCategories.tsx`
- `src/pages/Schedules.tsx`
- `src/pages/UserManagement.tsx`

## Rollout & Migration

- Replace inline selectors with `PageSizeDropdown`
- Ensure `onChange` resets page to 1 and triggers data reload (dispatch `setLimit`/`setPage` for Redux pages)
- Verify via `npm run check` and `npm run lint`

## References

- PR: `feat/page-size-dropdown-standardization`
- README section: “UI Consistency: Page Size Dropdown”
