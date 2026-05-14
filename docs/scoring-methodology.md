# Scoring Methodology

## Objective
HireWise AI provides explainable recommendations for recruiter screening. It is a decision-support system, not an autonomous hiring decision maker.

## Mandatory Dimensions and Weights
Each candidate is scored out of 10 on each dimension, then weighted:

1. Skills Match — 30%
2. Experience Relevance — 25%
3. Education & Certs — 15%
4. Project / Portfolio — 20%
5. Communication Quality — 10%

## Formula
```
total_score =
(skills_match_score * 0.30 +
 experience_relevance_score * 0.25 +
 education_certs_score * 0.15 +
 project_portfolio_score * 0.20 +
 communication_quality_score * 0.10) * 10
```

Result is scaled to a 0-100 score.

## Recommendation Thresholds
- 85-100: Strong Shortlist
- 70-84: Shortlist
- 55-69: Review Manually
- Below 55: Not Recommended

## Dimension Logic
### 1) Skills Match
- Normalizes skills (lowercase, synonym mapping, dedupe).
- Computes matched vs missing skills against JD required skills.
- Match percentage drives baseline score band:
  - Poor: <30%
  - Average: 50-70%
  - Excellent: >85%

### 2) Experience Relevance
- Compares candidate total years vs JD minimum.
- Assesses domain alignment:
  - exact domain
  - adjacent domain
  - unrelated domain
- Produces domain+seniority relevance score.

### 3) Education & Certs
- Checks whether minimum education evidence is present.
- Adds bonus for relevant certifications.
- Rewards exceeding requirements.

### 4) Project / Portfolio
- Detects project evidence and relevance to JD skills.
- Credits project depth and external proof links (GitHub/portfolio).

### 5) Communication Quality
- Uses structural indicators:
  - readable formatting
  - action language
  - measurable impact wording
- Penalizes weak structure or low clarity.

## Explainability Outputs
For each candidate, the system stores:
- raw score per dimension (0-10)
- weighted contribution
- one-line justification
- evidence snippet
- final score + recommendation
- confidence level
- risk/concern flags

## Bias and Fairness Handling
- Sensitive attributes are not used for scoring:
  - gender
  - age
  - marital status
  - religion
  - nationality/citizenship
- If detected in text, the system raises warnings for recruiters but excludes them from score logic.

## Human-in-the-Loop Controls
Recruiters can override:
- any dimension score
- final recommendation
- with mandatory reason text

Every override is logged with:
- old score/recommendation
- new score/recommendation
- reason
- timestamp

This creates an audit-ready decision trail.
