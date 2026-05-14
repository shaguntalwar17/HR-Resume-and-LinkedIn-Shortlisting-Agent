import { NextResponse } from "next/server";

import { extractTextFromUpload } from "@/lib/parsers/file-parser";
import { parseJobDescription } from "@/lib/parsers/jd-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const jdTextInput = `${formData.get("jdText") ?? ""}`.trim();
    const jdFile = formData.get("jdFile");

    let fileText = "";
    if (jdFile instanceof File && jdFile.size > 0) {
      fileText = await extractTextFromUpload(jdFile);
    }

    const rawText = [jdTextInput, fileText].filter(Boolean).join("\n\n").trim();
    if (!rawText) {
      return NextResponse.json(
        { error: "Please provide JD text or upload a JD file." },
        { status: 400 }
      );
    }

    const parsed = parseJobDescription(rawText);
    return NextResponse.json({ jd: parsed });
  } catch (error) {
    console.error("JD parse error", error);
    return NextResponse.json({ error: "Failed to parse job description." }, { status: 500 });
  }
}
