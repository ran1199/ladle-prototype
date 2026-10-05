"use client";

// The page around the app. On phones the app fills the screen. On screens
// wider than 768px it sits inside an iPhone-style frame, with the side panel
// beside it (or below it on narrower tablets).

import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { SheetHostProvider } from "./Sheet";
import { SidePanel } from "./SidePanel";
import { SiteConfigProvider } from "./SiteConfig";
import { TabBar } from "./TabBar";
import { WelcomeSheet } from "./WelcomeSheet";

/** Fake iPhone status bar, only drawn inside the desktop frame. */
function StatusBar() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-[50px] items-center justify-between px-8 pt-1 text-[15px] font-semibold text-ink min-[769px]:flex"
    >
      <span className="tabular w-14">9:41</span>
      <span className="h-[30px] w-[110px] rounded-full bg-[#000]" />
      <span className="flex w-14 items-center justify-end gap-1">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" stroke="currentColor">
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" opacity="0.5" />
          <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" stroke="none" />
          <path d="M23.5 4v4" strokeLinecap="round" opacity="0.5" />
        </svg>
      </span>
    </div>
  );
}

export function AppFrame({
  caseStudyUrl,
  children,
}: {
  caseStudyUrl: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [sheetHost, setSheetHost] = useState<HTMLDivElement | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const onOpenCountChange = useCallback((n: number) => setSheetOpen(n > 0), []);
  const showTabBar = pathname !== "/camera";

  return (
    <SiteConfigProvider value={{ caseStudyUrl }}>
      <div className="min-[769px]:flex min-[769px]:min-h-dvh min-[769px]:flex-wrap min-[769px]:items-center min-[769px]:justify-center min-[769px]:gap-x-16 min-[769px]:gap-y-4 min-[769px]:p-6">
        {/* The phone: full screen on phones, a framed device on bigger screens. */}
        <div className="phone-frame h-dvh min-[769px]:h-[min(868px,calc(100dvh-48px))] min-[769px]:min-h-[640px] min-[769px]:aspect-[414/868] min-[769px]:shrink-0 min-[769px]:rounded-[60px] min-[769px]:bg-[var(--frame)] min-[769px]:p-3 min-[769px]:shadow-[0_30px_80px_rgb(43_36_32/0.25)]">
          <div className="app-root relative isolate flex h-full flex-col overflow-hidden bg-bg min-[769px]:rounded-[48px]">
            <StatusBar />
            <SheetHostProvider element={sheetHost} onOpenCountChange={onOpenCountChange}>
              <div className="flex min-h-0 flex-1 flex-col" inert={sheetOpen}>
                <main id="main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {children}
                </main>
                {showTabBar && <TabBar />}
              </div>
              <WelcomeSheet caseStudyUrl={caseStudyUrl} />
            </SheetHostProvider>
            {/* Sheets appear here, on top of the app. */}
            <div ref={setSheetHost} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-1/2 z-50 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-ink min-[769px]:block"
            />
          </div>
        </div>

        <div className="hidden w-[400px] max-w-full min-[769px]:block">
          <SidePanel caseStudyUrl={caseStudyUrl} />
        </div>
      </div>
    </SiteConfigProvider>
  );
}
