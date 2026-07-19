# 14 — Future Extensibility Plan

MVP is the stable core. Future features plug in as modules.

## Extension principles

1. **Stable core entities:** users, candidates, employees, assignments, applications, audit  
2. **New feature = new module + tables**, not columns dumped without ownership  
3. **Services, not route spaghetti** — automation calls services  
4. **Job queue later** (e.g. BullMQ / Railway workers) for long AI/scrape tasks  
5. **Object storage later** when leaving URL-only resumes  

## Feature → module map

| Future feature | Suggested module | Touches core via |
|----------------|------------------|------------------|
| AI Resume Generator | `modules/ai-resume` | writes `resume_link` / new `resume_versions` |
| ATS Optimizer | `modules/ats` | scores linked to application/resume version |
| Resume Version History | `resume_versions` table | FK candidate + application |
| Job Scraper | `modules/scraper` + worker | creates draft jobs → applications |
| JD Parser | `modules/jd` | stores parsed JD JSON |
| Cover Letter Generator | `modules/cover-letter` | optional link on application |
| Gmail Integration | `modules/gmail` | dedicated candidate mailboxes |
| Browser Automation | `modules/apply-bot` + worker | updates application status |
| LinkedIn Automation | `modules/linkedin` | separate credentials vault |
| Interview Tracker | `modules/interviews` | FK application |
| Interview Prep Portal | candidate feature flag | reads resume versions |
| Candidate CRM | notes/tags tables | FK candidate (admin/employee) |
| Similarity / ATS Score | analytics tables | read applications/resumes |
| Analytics Dashboard | `modules/analytics` | read models / materialized views |
| Notifications | `modules/notifications` | outbox + email/push |
| AI Copilot for employees | `modules/copilot` | tools wrapping existing services |

## Data evolution examples

```text
applications
  └── resume_versions (1:N)
  └── interview_events (1:N)
  └── automation_runs (1:N)

candidates
  └── mailbox_accounts (1:1 future)
  └── preferences_json (later)
```

## Auth evolution

- Sessions sufficient for web MVP  
- Later: API keys for workers, optional JWT for mobile  
- Same role + assignment policies remain source of truth  

## DB evolution

- Start: Railway Postgres  
- Later: same Prisma schema → Neon / RDS  
- If extreme scale years out: read replicas + job DB; still not a rewrite if modules stay bounded  
