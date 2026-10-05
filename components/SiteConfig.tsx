"use client";

// Site settings that come from Vercel's environment (read on the server),
// shared with every screen.

import { createContext, useContext } from "react";

export type SiteConfig = { caseStudyUrl: string };

const SiteConfigContext = createContext<SiteConfig>({ caseStudyUrl: "" });

export const SiteConfigProvider = SiteConfigContext.Provider;

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}
