import type {
  ComplexityEntry,
  IpoEntry,
  Language,
  RepoEntry,
  TimelineEntry,
} from "@/lib/types";
import languagesJson from "@/data/languages.json";
import reposJson from "@/data/repos.json";
import iposJson from "@/data/ipos.json";
import complexityJson from "@/data/complexity.json";
import timelineJson from "@/data/timeline.json";

export const LANGUAGES = languagesJson as Language[];
export const REPOS = reposJson as RepoEntry[];
export const IPOS = iposJson as IpoEntry[];
export const COMPLEXITY = complexityJson as ComplexityEntry[];
export const TIMELINE = timelineJson as TimelineEntry[];

export function languageById(id: string): Language | undefined {
  return LANGUAGES.find((l) => l.id === id);
}
