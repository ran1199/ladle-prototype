import { AppFrame } from "@/components/AppFrame";

// Everything inside the app (the five tabs) shares the frame, tab bar and welcome sheet.
// CASE_STUDY_URL is set in Vercel; when it's empty, the case study links are hidden.
export default function AppLayout({ children }: LayoutProps<"/">) {
  const caseStudyUrl = process.env.CASE_STUDY_URL?.trim() ?? "";
  return <AppFrame caseStudyUrl={caseStudyUrl}>{children}</AppFrame>;
}
