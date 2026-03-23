import type { Suite } from "../runner.js";

export const placeholderSuites: Suite[] = [
  {
    name: "placeholder — conformance suites added in Story 5.2",
    run: async () => ({
      passed: true,
      name: "placeholder — conformance suites added in Story 5.2",
    }),
  },
];
