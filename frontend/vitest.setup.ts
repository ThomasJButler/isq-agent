// Registers jest-dom matchers (toBeInTheDocument, toHaveClass, ...) on
// Vitest's `expect` and augments its types. Imported once via
// `test.setupFiles` so every test file has them available.
import "@testing-library/jest-dom/vitest";
