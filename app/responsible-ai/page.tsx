import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, Scale, Lock, UserCheck, EyeOff } from "lucide-react";

export default function ResponsibleAiPage() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <ShieldCheck className="w-64 h-64 -mt-10 -mr-10" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl font-extrabold tracking-tight mb-4 flex items-center gap-3">
            <Scale className="h-8 w-8 text-indigo-400" /> Responsible AI Governance
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed font-medium">
            HireWise AI operates strictly as an <strong>assistive intelligence tool</strong> designed to augment, not replace, human judgment. <span className="text-indigo-300">Final hiring decisions must always remain with authorized human reviewers.</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-l-4 border-l-rose-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-700">
              <EyeOff className="h-5 w-5" /> Strict Exclusion of Protected Attributes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-700 text-sm leading-relaxed space-y-4">
            <p>
              The AI Agent is strictly prohibited from considering sensitive demographic data during the evaluation process.
            </p>
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
              <p className="font-semibold text-rose-900 mb-2">Explicitly Ignored Attributes:</p>
              <div className="flex flex-wrap gap-2">
                {["Gender", "Religion", "Race", "Caste", "Marital Status", "Disability", "Age", "Nationality", "Candidate Photo"].map((attr) => (
                  <span key={attr} className="bg-white text-rose-700 px-2 py-1 rounded-md text-xs font-bold border border-rose-200 shadow-sm">
                    {attr}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              If these attributes are detected in a resume or profile, they are masked or flagged for recruiter awareness, but mathematically excluded from the rubric score and ranking algorithms.
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <UserCheck className="h-5 w-5" /> Human-in-the-Loop Requirement
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-700 text-sm leading-relaxed space-y-4">
            <p>
              The platform mandates a &quot;Human-in-the-Loop&quot; (HITL) workflow for all candidate evaluations.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <div className="mt-0.5 bg-emerald-100 text-emerald-700 rounded-full p-0.5"><AlertTriangle className="h-3 w-3" /></div>
                <span><strong>Mandatory Review:</strong> Every shortlisted or rejected recommendation requires an explicit human review and approval.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 bg-emerald-100 text-emerald-700 rounded-full p-0.5"><AlertTriangle className="h-3 w-3" /></div>
                <span><strong>Explainable AI:</strong> All AI scores are broken down into a 5-dimension rubric with verifiable evidence snippets.</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 bg-emerald-100 text-emerald-700 rounded-full p-0.5"><AlertTriangle className="h-3 w-3" /></div>
                <span><strong>Full Override Authority:</strong> Reviewers can override AI scores at any time by providing a mandatory justification note.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-600" /> Audit Logs & Data Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="text-slate-700 text-sm leading-relaxed space-y-4">
          <p>
            To maintain accountability, every action taken by the AI or human reviewers is persistently recorded in the system&apos;s Audit Logs. This includes:
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-semibold text-slate-800 mb-1">Status Changes</p>
              <p className="text-xs text-slate-500">Tracking every movement of a candidate through the hiring pipeline.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-semibold text-slate-800 mb-1">Manual Overrides</p>
              <p className="text-xs text-slate-500">Logging the reviewer, time, original score, new score, and required justification.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="font-semibold text-slate-800 mb-1">Data Retention</p>
              <p className="text-xs text-slate-500">Adhering to organizational policies for safe removal of candidate PII.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
