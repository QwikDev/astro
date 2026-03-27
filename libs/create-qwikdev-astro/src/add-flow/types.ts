/**
 * Outcome of multi-framework detection.
 * - "none": no recognized frameworks found
 * - "safe": frameworks found, no conflicts, edits can be applied
 * - "already-configured": frameworks already have include/exclude options
 * - "unsafe": integrations array has dynamic/spread elements that cannot be statically analyzed
 */
export type DetectionOutcome = "none" | "safe" | "already-configured" | "unsafe";

/**
 * Information about a recognized framework integration found in the astro config.
 */
export type FrameworkInfo = {
  name: "react" | "preact" | "solid";
  packageName: string;
  hasInclude: boolean;
  hasExclude: boolean;
  /** Span of the integration call expression in the config source */
  integrationCallSpan: { start: number; end: number };
};

/**
 * A config edit to be applied to the astro config source.
 */
export type ConfigEdit = {
  type: "add-include" | "add-exclude";
  framework: string;
  /** Span at which the edit should be inserted */
  span: { start: number; end: number };
  value: string;
};

/**
 * Result of analyzing an astro.config file for multi-framework integrations.
 */
export type MultiFrameworkResult = {
  outcome: DetectionOutcome;
  frameworks: FrameworkInfo[];
  notes: string[];
  edits: ConfigEdit[];
};
