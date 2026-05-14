import { BrainCircuit, FileUp, ListOrdered, ScanSearch } from "lucide-react";

const steps = [
  {
    title: "Add Job Description",
    description: "Paste or upload JD and extract structured requirements automatically.",
    icon: ScanSearch,
  },
  {
    title: "Upload Resumes / LinkedIn JSON",
    description: "Batch ingest candidate documents and profile payloads.",
    icon: FileUp,
  },
  {
    title: "Run AI Evaluation",
    description: "Transparent scoring with deterministic fallback and optional LLM enhancement.",
    icon: BrainCircuit,
  },
  {
    title: "Review Ranked Shortlist",
    description: "Audit rankings, override decisions, add notes, and export reports.",
    icon: ListOrdered,
  },
];

export function WorkflowSteps() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <article key={step.title} className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
              <span>Step {index + 1}</span>
            </div>
            <div className="mb-3 inline-flex rounded-lg bg-sky-100 p-2 text-sky-700">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{step.description}</p>
          </article>
        );
      })}
    </div>
  );
}
