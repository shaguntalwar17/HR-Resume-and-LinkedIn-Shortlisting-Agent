import { ReportType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { requireSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { buildJobReportHtml, buildJobReportPayload } from "@/lib/reporting/job-report";
import { reportGenerateSchema } from "@/lib/validation/platform";

export const runtime = "nodejs";

function filenameSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function buildPdf(report: ReturnType<typeof buildJobReportPayload>) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([900, 1200]);
  const heading = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 1140;
  page.drawText("HireWise AI - Hiring Intelligence Report", { x: 40, y, size: 18, font: heading });
  y -= 28;
  page.drawText(`Organization: ${report.organization}`, { x: 40, y, size: 11, font: body });
  y -= 16;
  page.drawText(`Job: ${report.job.title}`, { x: 40, y, size: 11, font: body });
  y -= 16;
  page.drawText(
    `Evaluated: ${report.executiveSummary.totalEvaluated} | Shortlisted: ${report.executiveSummary.shortlistedCount} | Avg: ${report.executiveSummary.averageScore}`,
    { x: 40, y, size: 11, font: body }
  );
  y -= 24;
  page.drawText("Ranked Candidates", { x: 40, y, size: 13, font: heading });
  y -= 16;

  for (const candidate of report.candidates.slice(0, 18)) {
    const row = `${candidate.rank}. ${candidate.name} | ${candidate.overallScore} | ${candidate.recommendation} | ${candidate.status}`;
    page.drawText(row.slice(0, 130), { x: 44, y, size: 10, font: body });
    y -= 13;
    if (y < 90) break;
  }

  y -= 10;
  page.drawText("Methodology", { x: 40, y, size: 12, font: heading });
  y -= 14;
  page.drawText(report.methodology.note.slice(0, 140), { x: 44, y, size: 10, font: body });
  y -= 20;
  page.drawText("Responsible AI Disclaimer", { x: 40, y, size: 12, font: heading });
  y -= 14;
  page.drawText(report.responsibleAiDisclaimer.slice(0, 140), { x: 44, y, size: 10, font: body });

  return pdf.save();
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireSession(request);
  if (!user || errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const payload = reportGenerateSchema.parse(body);

    const job = await prisma.jobRequisition.findFirst({
      where: {
        id: payload.jobId,
        organizationId: user.organizationId,
      },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    const applications = await prisma.applicationEvaluation.findMany({
      where: { jobId: job.id },
      include: {
        candidate: true,
        reviews: {
          include: { reviewer: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const reportPayload = buildJobReportPayload({
      organizationName: organization?.name ?? user.organizationName,
      job,
      applications,
    });
    const html = buildJobReportHtml(reportPayload);
    const reportType = payload.type as ReportType;
    const baseName = `${filenameSafe(job.title)}-${Date.now()}`;

    const dbReport = await prisma.report.create({
      data: {
        jobId: job.id,
        generatedById: user.userId,
        reportType,
        generatedJson: reportPayload,
      },
    });

    if (payload.type === "JSON") {
      return new NextResponse(JSON.stringify(reportPayload, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${baseName}.json"`,
          "x-report-id": dbReport.id,
        },
      });
    }

    if (payload.type === "HTML" || payload.type === "EXECUTIVE_SUMMARY") {
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.html"`,
          "x-report-id": dbReport.id,
        },
      });
    }

    const pdfBytes = await buildPdf(reportPayload);
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
        "x-report-id": dbReport.id,
      },
    });
  } catch (error) {
    console.error("Generate report error", error);
    return NextResponse.json({ error: "Failed to generate report." }, { status: 500 });
  }
}
