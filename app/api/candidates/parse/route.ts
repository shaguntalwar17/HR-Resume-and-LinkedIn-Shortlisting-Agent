import { NextResponse } from "next/server";

import {
  parseCandidateFromLinkedInJson,
  parseCandidateFromResumeText,
} from "@/lib/parsers/candidate-parser";
import { extractTextFromUpload } from "@/lib/parsers/file-parser";
import { ParsedLinkedInInput } from "@/lib/types";

export const runtime = "nodejs";

function parseLinkedInPayload(linkedInInput: string): ParsedLinkedInInput[] {
  if (!linkedInInput.trim()) return [];
  const parsed = JSON.parse(linkedInInput) as ParsedLinkedInInput | ParsedLinkedInInput[];
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const resumeFiles = formData.getAll("resumeFiles");
    const linkedInInput = `${formData.get("linkedInJson") ?? ""}`;
    const candidates = [];

    for (const entry of resumeFiles) {
      if (!(entry instanceof File)) continue;
      if (entry.size === 0) continue;
      const text = await extractTextFromUpload(entry);
      candidates.push(parseCandidateFromResumeText(text, entry.name, "resume"));
    }

    try {
      const linkedInProfiles = parseLinkedInPayload(linkedInInput);
      linkedInProfiles.forEach((profile, index) => {
        candidates.push(parseCandidateFromLinkedInJson(profile, `linkedin-profile-${index + 1}.json`));
      });
    } catch {
      return NextResponse.json(
        { error: "LinkedIn JSON is invalid. Provide valid JSON object or array." },
        { status: 400 }
      );
    }

    if (!candidates.length) {
      return NextResponse.json(
        { error: "Upload at least one resume file or provide LinkedIn JSON." },
        { status: 400 }
      );
    }

    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("Candidate parse error", error);
    return NextResponse.json({ error: "Failed to parse candidate files." }, { status: 500 });
  }
}
