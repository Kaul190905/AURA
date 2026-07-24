# Instructions for Gemini

Welcome to the AuraMobile project! To minimize token usage and accelerate your understanding of the codebase, please rely on the documentation located within this `.vault/` directory.

## Navigating the Project:

1. **Initial Context**: Before reading extensive source code files, review the `.vault/architecture.md`, `.vault/navigation.md`, and `.vault/state.md` files. They contain a distilled overview of the app's structure.
2. **Token Efficiency**: By reading these markdown files first, you can avoid issuing excessive `view_file` or `grep_search` commands on core files, preserving token limits and speeding up your responses.
3. **Maintain Consistency**: The vault files describe the primary architectural decisions (e.g., using `AppContext` for state, specific React Navigation setups). Ensure your code changes respect and follow these documented conventions.
4. **Living Documentation**: If your task involves altering the core navigation flow or state management, make sure to update these `.vault/` markdown files so that they remain a reliable source of truth.
