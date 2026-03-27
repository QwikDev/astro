/**
 * JSX import source strategy for multi-framework Qwik projects.
 *
 * When Qwik coexists with another JSX framework (React, Preact, Solid),
 * the user must choose which framework is "primary" (owns tsconfig jsxImportSource)
 * and which uses per-file pragmas.
 *
 * Note: The interactive CLI prompt for this choice lives in Phase 3.
 * This module is pure logic — it takes the resolved choice as input.
 */

export type JsxStrategy = {
  /** Whether Qwik is the primary JSX factory (owns tsconfig jsxImportSource) */
  qwikIsPrimary: boolean;
  /**
   * Per-file pragma to prepend to Qwik components when secondary.
   * null when primary (tsconfig handles it globally).
   */
  pragma: string | null;
  /**
   * The jsxImportSource value to set in tsconfig when Qwik is primary.
   * null when secondary (another framework owns tsconfig).
   */
  tsconfigSource: string | null;
};

/**
 * Determine the JSX strategy based on whether Qwik is primary or secondary.
 *
 * - "primary": Qwik owns tsconfig jsxImportSource, other frameworks use per-file pragmas
 * - "secondary": Another framework owns tsconfig, Qwik files use per-file @jsxImportSource pragma
 */
export function determineJsxStrategy(choice: "primary" | "secondary"): JsxStrategy {
  if (choice === "primary") {
    return {
      qwikIsPrimary: true,
      pragma: null,
      tsconfigSource: "@qwik.dev/core"
    };
  }

  return {
    qwikIsPrimary: false,
    pragma: "/** @jsxImportSource @qwik.dev/core */",
    tsconfigSource: null
  };
}
