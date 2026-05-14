import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { buildReportFileName, buildEvaluationMethodologyText } from "@/lib/reporting/generate-report";
import { getEvaluationRun } from "@/lib/store/session-store";

export const runtime = "nodejs";

function drawLine(page: ReturnType<PDFDocument["addPage"]>, text: string, x: number, y: number, size = 11) {
  page.drawText(text, { x, y, size });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  const run = await getEvaluationRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([900, 1200]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.setFont(font);

  let y = 1150;
  page.drawText("HireWise AI — Resume & LinkedIn Shortlisting Report", {
    x: 30,
    y,
    size: 18,
    font: bold,
    color: rgb(0.12, 0.21, 0.38),
  });
  y -= 26;
  drawLine(page, `Role: ${run.jd.roleTitle}`, 30, y);
  y -= 16;
  drawLine(page, `Domain: ${run.jd.domainIndustry} | Min Experience: ${run.jd.minimumExperienceYears} years`, 30, y);
  y -= 22;
  drawLine(page, "Methodology:", 30, y, 12);
  y -= 16;

  const methodology = buildEvaluationMethodologyText();
  const chunks = methodology.match(/.{1,108}(\s|$)/g) ?? [methodology];
  chunks.forEach((chunk) => {
    drawLine(page, chunk.trim(), 40, y, 10);
    y -= 14;
  });

  y -= 10;
  page.drawText("Ranked Candidates", { x: 30, y, size: 13, font: bold });
  y -= 18;
  drawLine(page, "Rank | Name | Score | Recommendation | Skills Match", 30, y, 10);
  y -= 14;

  run.evaluations.forEach((evaluation, index) => {
    const line = `${index + 1} | ${evaluation.candidateName.slice(0, 24)} | ${evaluation.totalScore} | ${evaluation.recommendation} | ${evaluation.skillsMatchPercentage}%`;
    drawLine(page, line, 30, y, 9);
    y -= 12;
  });

  y -= 12;
  page.drawText("Override Log", { x: 30, y, size: 13, font: bold });
  y -= 16;
  if (run.overrideHistory.length === 0) {
    drawLine(page, "No overrides logged.", 30, y, 10);
  } else {
    run.overrideHistory.slice(0, 12).forEach((entry) => {
      drawLine(
        page,
        `${entry.timestamp.slice(0, 10)} | ${entry.candidateId.slice(0, 8)} | ${entry.oldRecommendation} -> ${entry.newRecommendation}`,
        30,
        y,
        9
      );
      y -= 12;
    });
  }

  y -= 22;
  page.drawText("Responsible AI Note", { x: 30, y, size: 13, font: bold, color: rgb(0.78, 0.08, 0.08) });
  y -= 16;
  drawLine(
    page,
    "Sensitive attributes are ignored during scoring. Final hiring decisions must remain human-led.",
    30,
    y,
    10
  );

  const bytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${buildReportFileName("hirewise-report")}.pdf"`,
    },
  });
}
