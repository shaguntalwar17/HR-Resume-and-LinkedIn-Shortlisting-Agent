import bcrypt from "bcryptjs";
import { CandidateSource, PrismaClient } from "@prisma/client";

import { getDemoCandidates } from "@/lib/demo-data/sample-candidates";
import { parseCandidateFromResumeText } from "@/lib/parsers/candidate-parser";
import { mapParsedCandidateToDb } from "@/lib/parsers/candidate-db-mapper";
import { parseJobDescription } from "@/lib/parsers/jd-parser";
import { evaluateApplicationFit } from "@/lib/scoring/platform-evaluator";

const jobDescriptions = [
  `
Job Title: Full Stack AI Engineer
Department: Engineering
Location: Bengaluru / Remote
Employment Type: Full-time
Seniority: Senior
Required Skills: TypeScript, React, Next.js, Node.js, Python, LLM, RAG, SQL, Docker, AWS
Preferred Skills: LangChain, Analytics, Product Thinking, CI/CD
Minimum Experience: 4+ years
Responsibilities:
- Build candidate intelligence workflows
- Create scalable APIs and frontend dashboards
- Improve explainability and scoring systems
`,
  `
Job Title: AI Product Manager
Department: Product
Location: Mumbai / Hybrid
Employment Type: Full-time
Seniority: Mid-Senior
Required Skills: Product Strategy, Stakeholder Management, Analytics, SQL, Prompt Engineering, LLM
Preferred Skills: HR Tech, Experimentation, A/B Testing, Roadmapping, Communication
Minimum Experience: 5+ years
Responsibilities:
- Define AI hiring product roadmap
- Collaborate with engineering and recruiters
- Measure model quality and product impact
`,
];

const additionalCandidateTexts = [
  `
Rahul Sen
AI Solutions Engineer
Email: rahul.sen@example.com
Summary: 5 years in SaaS engineering and 2 years in LLM product features.
Skills: TypeScript, React, Node.js, Python, SQL, OpenAI, Prompt Engineering, Docker, AWS
Experience:
- AI Engineer at Orbit Labs (2022 - Present)
- Software Engineer at CraftEdge (2020 - 2022)
Education: B.Tech Computer Science
Projects: Built RAG assistant for enterprise document search
`,
  `
Maria Alvarez
Talent Analytics Manager
Email: maria.alvarez@example.com
Summary: 7 years in talent analytics and product-led hiring systems.
Skills: Product Strategy, Analytics, SQL, Stakeholder Management, Communication, Experimentation
Experience:
- Product Manager at WorkforceIQ (2021 - Present)
- Senior Analyst at GrowthHire (2018 - 2021)
Education: MBA, BSc Statistics
Certifications: Scrum Product Owner
Projects: Candidate conversion dashboard with funnel optimization
`,
  `
Ankit Goyal
Backend Engineer
Email: ankit.goyal@example.com
Summary: 4 years backend services, 1 year ML ops exposure.
Skills: Node.js, Python, SQL, PostgreSQL, Docker, Kubernetes, API Design, CI/CD
Experience:
- Backend Engineer at NexaFlow (2022 - Present)
- Software Engineer at CloudMesh (2020 - 2022)
Education: B.E. Computer Engineering
`,
  `
Elena Rossi
AI Product Lead
Email: elena.rossi@example.com
Summary: 9 years in product, 4 years in AI platforms and decision intelligence.
Skills: Product Strategy, Roadmapping, LLM, Prompt Engineering, Analytics, SQL, Leadership
Experience:
- Product Lead at VisionHire (2021 - Present)
- Product Manager at DataCore (2017 - 2021)
Education: MBA, B.Tech
Projects: Built hiring assistant adoption framework across 3 regions
`,
  `
Sandeep Kulkarni
Software QA Analyst
Email: sandeep.k@example.com
Summary: 3 years in QA and support automation.
Skills: Manual Testing, Selenium, Excel, Documentation
Experience:
- QA Analyst at AssureNow (2023 - Present)
Education: BCA
`,
];

export async function bootstrapDemoDataIfEmpty(prisma: PrismaClient) {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    return { created: false };
  }

  const passwordHash = await bcrypt.hash("DemoPass#123", 12);

  const organization = await prisma.organization.create({
    data: {
      name: "HireWise Demo Organization",
      industry: "HR Technology",
    },
  });

  const [admin, recruiter, manager] = await Promise.all([
    prisma.user.create({
      data: {
        organizationId: organization.id,
        name: "Admin User",
        email: "admin@hirewise.demo",
        passwordHash,
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        organizationId: organization.id,
        name: "Recruiter User",
        email: "recruiter@hirewise.demo",
        passwordHash,
        role: "RECRUITER",
      },
    }),
    prisma.user.create({
      data: {
        organizationId: organization.id,
        name: "Hiring Manager User",
        email: "manager@hirewise.demo",
        passwordHash,
        role: "HIRING_MANAGER",
      },
    }),
  ]);

  await prisma.user.create({
    data: {
      organizationId: organization.id,
      name: "Viewer User",
      email: "viewer@hirewise.demo",
      passwordHash,
      role: "VIEWER",
    },
  });

  await prisma.organizationSetting.create({
    data: {
      organizationId: organization.id,
      defaultWeights: {
        skillsMatch: 0.3,
        experienceRelevance: 0.25,
        educationCerts: 0.15,
        projectPortfolio: 0.2,
        communicationQuality: 0.1,
      },
      minimumScoreThreshold: 70,
      knockoutCriteria: {
        minimumMandatorySkillMatchPercentage: 35,
      },
      aiEnhancementEnabled: false,
      reportBranding: {
        productName: "HireWise AI",
      },
    },
  });

  const jobs = await Promise.all(
    jobDescriptions.map(async (jdText, index) => {
      const parsed = parseJobDescription(jdText);
      return prisma.jobRequisition.create({
        data: {
          organizationId: organization.id,
          title: parsed.roleTitle,
          department: index === 0 ? "Engineering" : "Product",
          location: index === 0 ? "Bengaluru / Remote" : "Mumbai / Hybrid",
          employmentType: "Full-time",
          seniority: index === 0 ? "Senior" : "Mid-Senior",
          description: parsed.rawText,
          salaryMin: index === 0 ? 2200000 : 1800000,
          salaryMax: index === 0 ? 4200000 : 3600000,
          requiredSkills: parsed.requiredSkills,
          preferredSkills: parsed.preferredSkills,
          responsibilities: parsed.responsibilities,
          qualifications: parsed.educationRequirements,
          certifications: parsed.certifications,
          minExperience: parsed.minimumExperienceYears,
          maxExperience: index === 0 ? 10 : 12,
          status: "ACTIVE",
          createdById: recruiter.id,
          knockoutCriteria: {
            minimumMandatorySkillMatchPercentage: 35,
            minimumExperienceYears: parsed.minimumExperienceYears,
          },
          jdParsedJson: JSON.parse(JSON.stringify(parsed)),
          scoringConfig: {
            minimumScoreThreshold: index === 0 ? 72 : 70,
          },
        },
      });
    })
  );

  const baseCandidates = getDemoCandidates();
  const extraCandidates = additionalCandidateTexts.map((text, index) =>
    parseCandidateFromResumeText(text, `extra-candidate-${index + 1}.txt`, "demo")
  );
  const allCandidates = [...baseCandidates, ...extraCandidates];

  const createdCandidates = [];
  for (const parsedCandidate of allCandidates) {
    const created = await prisma.candidate.create({
      data: {
        ...mapParsedCandidateToDb(parsedCandidate, organization.id),
        source: CandidateSource.DEMO,
      },
    });
    createdCandidates.push(created);
  }

  for (const job of jobs) {
    for (const candidate of createdCandidates) {
      const score = await evaluateApplicationFit({
        job,
        candidate,
        orgSetting: {
          minimumScoreThreshold: 70,
          knockoutCriteria: { minimumMandatorySkillMatchPercentage: 35 },
        },
      });
      const { scoreBreakdown, ...persistableScore } = score;

      const statusOverride =
        persistableScore.overallScore >= 85
          ? "SHORTLISTED"
          : persistableScore.overallScore >= 70
            ? "SENT_TO_HIRING_MANAGER"
            : persistableScore.overallScore >= 55
              ? "HOLD"
              : "REJECTED";

      const application = await prisma.applicationEvaluation.create({
        data: {
          jobId: job.id,
          candidateId: candidate.id,
          ...persistableScore,
          status: statusOverride,
          assignedHiringManagerId:
            statusOverride === "SENT_TO_HIRING_MANAGER" || statusOverride === "SHORTLISTED"
              ? manager.id
              : null,
        },
      });

      if (scoreBreakdown.length) {
        await prisma.scoreBreakdown.createMany({
          data: scoreBreakdown.map((entry) => ({
            evaluationId: application.id,
            dimension: entry.dimension,
            weight: entry.weight,
            rawScore: entry.rawScore,
            weightedScore: entry.weightedScore,
            justification: entry.justification,
            evidenceJson: entry.evidence,
          })),
        });
      }

      if (statusOverride === "SHORTLISTED" || statusOverride === "SENT_TO_HIRING_MANAGER") {
        await prisma.recruiterReview.create({
          data: {
            applicationId: application.id,
            reviewerId: recruiter.id,
            decision: statusOverride === "SHORTLISTED" ? "APPROVE" : "SHORTLIST",
            notes:
              statusOverride === "SHORTLISTED"
                ? "Approved for final shortlist stage after recruiter and manager alignment."
                : "Shared with hiring manager for collaborative review before final shortlist.",
          },
        });
      }
    }
  }

  await prisma.integrationConfig.createMany({
    data: [
      { organizationId: organization.id, provider: "GREENHOUSE", status: "DISCONNECTED", configJson: {} },
      { organizationId: organization.id, provider: "LEVER", status: "DISCONNECTED", configJson: {} },
      { organizationId: organization.id, provider: "WORKDAY", status: "DISCONNECTED", configJson: {} },
      { organizationId: organization.id, provider: "BAMBOOHR", status: "DISCONNECTED", configJson: {} },
      { organizationId: organization.id, provider: "GENERIC_WEBHOOK", status: "CONNECTED", configJson: {} },
    ],
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      actorId: admin.id,
      action: "DEMO_BOOTSTRAP_COMPLETED",
      entityType: "Organization",
      entityId: organization.id,
      newValueJson: {
        jobs: jobs.length,
        candidates: createdCandidates.length,
      },
    },
  });

  return {
    created: true,
    organizationId: organization.id,
    jobs: jobs.length,
    candidates: createdCandidates.length,
  };
}
