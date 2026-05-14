import { promises as fs } from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

import { EvaluationRun, OverrideEntry, RecruiterNote } from "@/lib/types";

const STORE_PATH = path.join(process.cwd(), "data", "evaluation-runs.json");
let inMemoryRuns: EvaluationRun[] = [];

async function readStore(): Promise<EvaluationRun[]> {
  try {
    const content = await fs.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(content) as EvaluationRun[];
    inMemoryRuns = parsed;
    return parsed;
  } catch {
    return inMemoryRuns;
  }
}

async function writeStore(runs: EvaluationRun[]): Promise<void> {
  inMemoryRuns = runs;
  try {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(runs, null, 2), "utf-8");
  } catch {
    // Ignore write failures in read-only serverless environments.
  }
}

export async function listEvaluationRuns(): Promise<EvaluationRun[]> {
  const runs = await readStore();
  return runs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getEvaluationRun(runId: string): Promise<EvaluationRun | null> {
  const runs = await readStore();
  return runs.find((run) => run.id === runId) ?? null;
}

export async function saveEvaluationRun(run: EvaluationRun): Promise<EvaluationRun> {
  const runs = await readStore();
  const index = runs.findIndex((entry) => entry.id === run.id);
  const nextRun = { ...run, updatedAt: new Date().toISOString() };

  if (index === -1) {
    runs.push(nextRun);
  } else {
    runs[index] = nextRun;
  }

  await writeStore(runs);
  return nextRun;
}

export async function createEvaluationRun(
  run: Omit<EvaluationRun, "id" | "createdAt" | "updatedAt">
): Promise<EvaluationRun> {
  const now = new Date().toISOString();
  const fullRun: EvaluationRun = {
    ...run,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };

  await saveEvaluationRun(fullRun);
  return fullRun;
}

export async function appendOverrideLog(runId: string, entry: Omit<OverrideEntry, "id" | "timestamp">) {
  const run = await getEvaluationRun(runId);
  if (!run) {
    return null;
  }

  const override: OverrideEntry = {
    ...entry,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };

  run.overrideHistory = [override, ...run.overrideHistory];
  const saved = await saveEvaluationRun(run);
  return { run: saved, override };
}

export async function appendRecruiterNote(
  runId: string,
  note: Omit<RecruiterNote, "id" | "timestamp">
) {
  const run = await getEvaluationRun(runId);
  if (!run) {
    return null;
  }

  const entry: RecruiterNote = {
    ...note,
    id: uuidv4(),
    timestamp: new Date().toISOString(),
  };

  run.recruiterNotes = [entry, ...run.recruiterNotes];
  const saved = await saveEvaluationRun(run);
  return { run: saved, note: entry };
}
