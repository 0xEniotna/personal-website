import portfolioBuckets from "../content/portfolio-buckets.json";
import projects from "../content/projects.json";
import type { PortfolioBucket, ProjectItem } from "./types";

export const portfolioData = portfolioBuckets as PortfolioBucket[];
export const projectData = projects as ProjectItem[];
