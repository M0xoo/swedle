export type Paradigm =
  | "oop"
  | "functional"
  | "procedural"
  | "multi"
  | "declarative";
export type Execution = "compiled" | "interpreted" | "hybrid";
export type Platform = "linux" | "windows" | "macos";

export type Language = {
  id: string;
  name: string;
  paradigm: Paradigm;
  paradigms: Paradigm[];
  openSource: boolean;
  execution: Execution;
  platforms: Platform[];
  year: number;
};

export type RepoEntry = {
  id: string;
  repo: string;
  label: string;
  stars: number;
};

export type IpoEntry = {
  id: string;
  company: string;
  year: number;
  /** Rough opening / first-day valuation in billions USD */
  openingValuationB: number;
};

export type ComplexityEntry = {
  id: string;
  prompt: string;
  choices: [string, string, string];
  answerIndex: 0 | 1 | 2;
};

export type TimelineEntry = {
  id: string;
  left: string;
  leftYear: number;
  right: string;
  rightYear: number;
  /** Which side happened first (earlier year) */
  earlier: "left" | "right";
};

export type FeedbackTone = "green" | "orange" | "gray";
