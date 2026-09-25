import i18n from "../i18n/i18n";

export interface PortfolioProject {
  id: string;
  title: string;
  tag: string;
  client: string;
  overview: string;
  challenge: string;
  solution: string;
  results: { metric: string; value: string }[];
  technologies: string[];
  timeline: string;
  images: string[];
  relatedIds: string[];
}

const idMap = ["intelligent-automation-suite", "cinematic-ai-interfaces", "autonomous-workflow-engine", "neural-content-pipeline", "real-time-ai-analytics"];

export const portfolioProjects: PortfolioProject[] = (i18n.t("portfolioDetails", { returnObjects: true }) as any[]).map((p: any, i: number) => ({
  ...p,
  id: idMap[i] || `proj-${i}`,
}));

export function getProjectById(id: string): PortfolioProject | undefined {
  return portfolioProjects.find(p => p.id === id);
}
