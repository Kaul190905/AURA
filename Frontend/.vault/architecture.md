# Architecture Overview

AuraMobile is a React Native application built to manage sensory overload and provide coping strategies.

## Key Technologies
- **Framework**: React Native 0.86.0
- **Navigation**: React Navigation (Native, Bottom Tabs, Stack)
- **State Management**: React Context (`AppContext.tsx`) instead of Redux/Zustand.
- **Styling**: Custom theme file (`src/theme.ts`)
- **Icons**: `lucide-react-native`
- **Charts**: `react-native-gifted-charts`

## Core Concepts
- **Roles**: Supports `user` and `caregiver` roles, pivoting the UI and features accordingly.
- **Risk Calculation**: Computes a risk score based on noise, light, self-report, and user profile (via `computeRisk` in `utils.ts`).
- **Trigger Profiles**: Tracks user triggers like sound, light, crowd, etc.
