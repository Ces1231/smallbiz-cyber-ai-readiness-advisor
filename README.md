# SmallBiz Cyber & AI Readiness Advisor

**Built by Champtron Systems LLC**

A static, browser-based AI-style readiness demo designed for entrepreneurs and small business owners. The tool helps business owners evaluate cybersecurity readiness, AI adoption readiness, funding preparedness, operational gaps, risk, implementation progress, customer growth opportunities, and basic cash-flow health.

This build is prepared for:

- GitHub repository deployment
- GitHub Pages static hosting
- Serverbyt-style static hosting
- Netlify / Vercel static deployment
- Skip AI Builder Grant submission

---

## Product Summary

SmallBiz Cyber & AI Readiness Advisor helps entrepreneurs and small business owners quickly understand where they stand across key business readiness areas. The app generates:

- Cybersecurity readiness score
- AI readiness score
- Funding / opportunity preparedness score
- Overall readiness score
- AI-style recommendations
- Industry-specific guidance
- ROI and time-savings estimates
- 30/60/90-day roadmap
- Business risk register
- Priority action checklist
- Cost-level guidance
- Tool recommendations
- Policy and checklist documents
- Monthly reassessment tracking
- Funding readiness checklist
- Application answer builder
- Business profile builder
- Basic compliance checklist
- Implementation tracker
- Customer growth planner
- Cash-flow snapshot

---

## Why This Helps Small Businesses

Many small businesses cannot afford dedicated cybersecurity, AI, operations, or grant-readiness consultants. This tool gives owners a practical self-service way to identify gaps, prioritize actions, generate useful documents, and create a roadmap for improvement.

The goal is not to replace funding platforms or professional advisors. The goal is to help entrepreneurs become more prepared before applying for funding, partnerships, marketplace listings, or growth opportunities.

---

## Features

### 1. Business Assessment
The owner enters basic business information and answers short readiness questions.

### 2. Dashboard Visuals
The app displays readiness scores using visual charts and progress bars.

### 3. AI-Style Recommendations
The tool generates practical recommendations based on the business profile and readiness gaps.

### 4. Business Owner Action Center
Includes:
- Do this first
- Do this next
- Do this later
- Estimated cost level
- Tool recommendations
- Document generator
- Monthly reassessment
- Business risk register

### 5. Funding Readiness & Submission Prep Mode
Includes:
- Funding readiness checklist
- Opportunity preparedness score
- Readiness gap alerts
- Application answer builder
- Business profile builder
- Integration-friendly positioning

### 6. Final Small Business Growth Toolkit
Includes:
- Basic compliance checklist
- Implementation tracker
- Customer growth planner
- Cash-flow snapshot

### 7. Export Options
Users can:
- Print / save the report as PDF
- Download a text report
- Download generated documents
- Download application answers
- Download business profile

---

## Folder Structure

```text
.
├── index.html
├── styles.css
├── app.js
├── README.md
├── SERVERBYT_DEPLOYMENT.md
├── GITHUB_DEPLOYMENT.md
├── LOOM_WALKTHROUGH_SCRIPT.md
├── SKIP_APPLICATION_ANSWERS.md
├── README_V4.md
├── README_V5.md
└── .gitignore
```

---

## How to Run Locally

No build tools are required.

1. Download or clone the repository.
2. Open `index.html` in a browser.

Optional local server:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

---

## Serverbyt Static Hosting Deployment

Upload these required files to your Serverbyt public web folder:

```text
index.html
styles.css
app.js
```

Recommended public folder names may include:

```text
public_html
htdocs
www
public
```

Then open your domain:

```text
https://yourdomain.com/
```

or if uploaded into a subfolder:

```text
https://yourdomain.com/smallbiz-ai/
```

See `SERVERBYT_DEPLOYMENT.md` for detailed steps.

---

## GitHub Pages Deployment

1. Create a new GitHub repository.
2. Upload all files.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, select:
   - Source: Deploy from branch
   - Branch: main
   - Folder: `/root`
5. Save.
6. Use the generated GitHub Pages URL as your live demo link.

See `GITHUB_DEPLOYMENT.md` for detailed steps.

---

## External Dependency

The app uses Chart.js from CDN:

```html
https://cdn.jsdelivr.net/npm/chart.js
```

If your hosting provider blocks external scripts, download Chart.js and reference it locally.

---

## Skip AI Builder Grant Positioning

**What did you build?**

I built an AI-powered readiness advisor that helps entrepreneurs and small business owners understand their cybersecurity posture, AI adoption readiness, operational gaps, and funding preparedness. The tool generates readiness scores, practical recommendations, ROI estimates, a risk register, application answers, and a 30/60/90-day roadmap that business owners can act on immediately.

**Problem solved:**

Many small business owners cannot afford dedicated cybersecurity, AI, or operations consultants, but they still need clear guidance to modernize, reduce risk, and grow. This tool turns complex technology and business-readiness questions into a simple self-service assessment with useful, actionable outputs.

---

## Recommended Demo Flow

1. Open the live demo.
2. Click a sample business profile.
3. Generate the readiness report.
4. Show dashboard scores.
5. Show recommendations and ROI estimate.
6. Show Business Owner Action Center.
7. Show Funding Readiness & Submission Prep Mode.
8. Show compliance checklist, implementation tracker, growth planner, and cash-flow snapshot.
9. Print / save the report as PDF.
10. Submit the live link to Skip.

---

## License

Prototype/demo prepared for Champtron Systems LLC. Update this section if you choose to release it publicly under MIT, Apache-2.0, or another license.
