# Setup Notes: Shared Page Size Dropdown

This project standardizes pagination controls using a shared component to ensure consistent UX across list pages.

## Component

- Path: `src/components/PageSizeDropdown.tsx`
- Props:
  - `value: number` – current items-per-page
  - `onChange: (n: number) => void` – handler to update items-per-page
  - `className?: string` – optional additional classes
- Options: `25/page`, `50/page`, `100/page`, `200/page`
- Styling: Tailwind CSS with dark-mode support

## Integration Steps

1. Import the component:
   ```tsx
   import PageSizeDropdown from '../components/PageSizeDropdown';
   ```
2. Use it in pagination controls:
   ```tsx
   <PageSizeDropdown
     value={limit}
     onChange={(n) => {
       // Local state example
       setLimit(n);
       setPage(1);
     }}
   />
   ```
3. For Redux-powered pages, dispatch actions and reset page:
   ```tsx
   const handleLimitChange = (n: number) => {
     dispatch(setLimit(n));
     dispatch(setPage(1));
   };
   ```

## Verification

- Run type checks: `npm run check`
- Run lint: `npm run lint`

## Notes

- Always reset to page 1 on items-per-page change to avoid empty views
- Keep options consistent with the shared component for uniform UX
- Use `dark:` Tailwind variants for consistent theme behavior
