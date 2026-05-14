import { CandidateProfile } from "@/lib/types";
import { parseCandidateFromResumeText } from "@/lib/parsers/candidate-parser";

const demoResumes: Array<{ fileName: string; content: string }> = [
  {
    fileName: "aisha-rao-resume.txt",
    content: `
Aisha Rao
Senior Full Stack AI Engineer
Email: aisha.rao@example.com | +91 98765 12001

Summary
7+ years of experience building SaaS products. 4+ years building LLM and machine learning features.
Led AI-powered recruiting assistant with RAG architecture, reducing recruiter screening time by 42%.

Skills
TypeScript, JavaScript, React.js, Next.js, Node.js, Python, OpenAI, Prompt Engineering, RAG, LangChain,
System Design, API Design, PostgreSQL, Docker, AWS, CI/CD, Testing, Analytics

Experience
Principal Engineer at TalentSphere (2021 - Present)
- Built end-to-end candidate ranking workflows using LLM + fallback rules
- Designed explainable scorecards and override audit pipelines
- Shipped recruiter dashboard with Recharts and real-time analytics

Staff Engineer at PeopleStack (2018 - 2021)
- Launched screening automation platform used by 120+ recruiters
- Improved model precision by 31% via structured skill extraction

Education
B.Tech in Computer Science, IIT Madras

Certifications
AWS Certified Solutions Architect
Generative AI with LLMs Certification

Projects
- HireOps Copilot: https://github.com/aisha/hireops-copilot
- Resume Graph Matcher using LangGraph and Postgres
`,
  },
  {
    fileName: "michael-chen-resume.txt",
    content: `
Michael Chen
Senior Software Engineer
Email: michael.chen@example.com

Profile
8 years in product engineering for B2B SaaS and data platforms.
Strong backend and cloud architecture background. Limited direct LLM production exposure.

Skills
TypeScript, Node.js, Java, React, SQL, PostgreSQL, Docker, Kubernetes, AWS, Microservices, API Design, CI/CD

Experience
Senior Engineer at RevenueGrid (2020 - Present)
- Built microservices handling 20M events/day
- Improved API latency by 38%

Engineer at DataPilot (2017 - 2020)
- Built analytics and reporting backend for sales intelligence

Education
Bachelor of Engineering, Computer Engineering

Certifications
AWS Certified Developer Associate

Projects
- Internal recommendation engine prototype
- Cloud cost optimization toolkit
`,
  },
  {
    fileName: "priya-nair-resume.txt",
    content: `
Priya Nair
AI Engineer (Early Career)
Email: priyanair@example.com

Summary
1.5 years of experience, passionate about generative AI and product building.

Skills
Python, JavaScript, React, Next.js, Prompt Engineering, OpenAI, LangChain, SQL, GitHub, Figma

Experience
Junior Developer at Nova Labs (2025 - Present)
- Built chatbot interface and analytics tracking

Education
B.Tech Computer Science

Certifications
Prompt Engineering for Developers

Projects
- TalentFit AI: Resume-JD matcher with weighted rubric
- InterviewPrep LLM: Built with RAG and vector search
- Portfolio: https://priyanair.dev
`,
  },
  {
    fileName: "rohit-verma-resume.txt",
    content: `
Rohit Verma
Software Support Associate
Email: rohit.verma@example.com

Career Objective
Looking for opportunities in software industry.

Skills
MS Excel, Manual Testing, Basic HTML, Customer Support

Experience
Support Associate at TechHelp (2022 - Present)
- Resolved customer tickets
- Documented issue logs

Education
B.Com
`,
  },
  {
    fileName: "sarah-kim-resume.txt",
    content: `
Sarah Kim
Product Engineer - FinTech
Email: sarah.kim@example.com

Summary
5+ years in fintech product teams building AI-assisted risk workflows.

Skills
TypeScript, React, Node.js, Python, Machine Learning, Data Analysis, SQL, AWS, Docker, CICD, A/B Testing

Experience
Product Engineer at CreditFlux (2022 - Present)
- Built ML-assisted underwriting copilot
- Partnered with product and compliance stakeholders

Education
Bachelor in Computer Science
Master in Information Systems

Certifications
Google Cloud Professional Data Engineer

Projects
- Portfolio scoring assistant for lending teams
- Customer insights dashboard
`,
  },
  {
    fileName: "daniel-iqbal-resume.txt",
    content: `
Daniel Iqbal
Backend AI Engineer
Email: daniel.iqbal@example.com

Summary
6 years backend engineering experience, 3 years in ML infra and API services.

Skills
Python, Node.js, SQL, PostgreSQL, Docker, Kubernetes, AWS, OpenAI, RAG, LangGraph, API Design, System Design

Experience
Lead Backend Engineer at Orion AI (2021 - Present)
- Built agent orchestration and retrieval systems
- Improved reliability by 28%

Education
Bachelor of Technology, Computer Science

Certifications
AWS Solutions Architect Associate
`,
  },
  {
    fileName: "neha-gupta-resume.txt",
    content: `
Neha Gupta
AI Product Manager / Technical PM
Email: neha.gupta@example.com

Summary
6 years in product management, 3 years shipping AI-powered workflow tools.
Led cross-functional teams to launch recruiting analytics platform improving funnel conversion by 25%.

Skills
Product Strategy, Stakeholder Management, Analytics, SQL, Prompt Engineering, LLM, Roadmapping, A/B Testing, Communication

Experience
Product Manager at TalentIQ (2022 - Present)
- Owned roadmap for recruiter recommendation product
- Worked with engineering on explainability and fairness dashboards

Education
MBA, Product Management
Bachelor of Engineering

Certifications
Certified Scrum Product Owner

Projects
- Recruiter score transparency framework
`,
  },
];

export function getDemoCandidates(): CandidateProfile[] {
  return demoResumes.map((resume) =>
    parseCandidateFromResumeText(resume.content, resume.fileName, "demo")
  );
}
