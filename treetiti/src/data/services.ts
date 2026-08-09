import i18n from "../i18n/i18n";

export interface ServiceData {
  id: string;
  title: string;
  desc: string;
  overview: string;
  benefits: string[];
  workflow: { step: string; desc: string }[];
  technologies: string[];
  faq: { q: string; a: string }[];
  relatedIds: string[];
}

const idMap = ["ai-website-design", "ai-automation", "ai-workflows", "ai-systems", "ai-ugc", "ai-marketing", "ai-content-creation", "ai-branding", "ai-sales-systems", "ai-video-production", "ai-business-infrastructure", "ai-consulting"];

export const servicesData: ServiceData[] = (i18n.t("serviceDetails", { returnObjects: true }) as any[]).map((s: any, i: number) => ({
  ...s,
  id: idMap[i] || `svc-${i}`,
}));

export function getServiceById(id: string): ServiceData | undefined {
  return servicesData.find(s => s.id === id);
}
