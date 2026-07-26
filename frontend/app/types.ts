export interface FeedbackResult {
  overall_score: number;
  strengths: string[];
  priority_fixes: string[];
  section_notes: Record<string, string>;
  ats_warnings: string[];
}
