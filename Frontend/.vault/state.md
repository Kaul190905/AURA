# State Management

AuraMobile manages global state through a comprehensive Context in `src/AppContext.ts`.

## AppState Interface
The context exposes a wide variety of state and updater functions:
- **User Settings**: `userRole`, `profile`, `ageGroup`, `commStyle`.
- **Crisis & Risk**: `isCrisisMode`, `risk`, `primaryTrigger`.
- **Environmental Data**: `noise`, `light`.
- **Data Models**: `notifications`, `history`, `strategies`, `accommodations`.

## Data Flow
- Environmental data (e.g., `noise`, `light`) is stored in context.
- `risk` and `suggestions` are recomputed in `App.tsx` dynamically using `useMemo` based on the environmental data and user's profile.
- All deeply nested components access and modify these through `useContext(AppContext)`.
