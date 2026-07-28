# Navigation Flow

The app primarily controls top-level navigation using a state variable `appScreen` in `App.tsx` instead of a pure stack navigator. This allows for simple, robust switching between entirely different app experiences (e.g., setup vs. main app).

## Top-Level Screens (`appScreen` state)
- `welcome`: Initial role selection.
- `profile`: User profile setup.
- `home`: Main app interface (renders `TabNavigator`).
- `caretaker-home`: Caretaker interface (renders `CaretakerTabNavigator`).
- `crisis`: Crisis mode screen.
- `recovery`: Post-crisis summary.
- `speech`, `plans`, `caretaker-gate`: Auxiliary screens.

## Tab Navigators
- **TabNavigator** (User): Home, Library, Insights, Device, Settings.
- **CaretakerTabNavigator**: Dashboard, Analysis, Profile.
