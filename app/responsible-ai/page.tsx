import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const guardrails = [
  "Sensitive attributes (gender, religion, race, caste, marital status, disability, age, nationality) are ignored in scoring.",
  "Human review is mandatory for every shortlisted/rejected decision.",
  "Every override and status update is audit-logged.",
  "Scoring weights are transparent and configurable.",
  "Evidence snippets are displayed for explainability.",
  "Candidate privacy and data retention responsibilities are documented.",
];

export default function ResponsibleAiPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Responsible AI Governance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>
            HireWise AI is a recruiter-assist system, not an autonomous hiring decision maker.
            Final decisions must always remain with authorized human reviewers.
          </p>
          <ul className="space-y-2">
            {guardrails.map((item) => (
              <li key={item} className="rounded-lg border border-slate-200 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bias-Aware Scoring Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              The scoring engine evaluates role-fit signals such as skills, experience, project evidence,
              and communication quality indicators. Protected attributes are excluded.
            </p>
            <p>
              If sensitive attributes appear in resumes, they are flagged for recruiter awareness but not
              used in model or deterministic score computation.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Privacy and Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              Candidate profile data should be retained only as long as needed for hiring operations,
              legal obligations, and organizational policy.
            </p>
            <p>
              Admin/recruiter users can delete candidate records and export reports for audit or regulatory review.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
