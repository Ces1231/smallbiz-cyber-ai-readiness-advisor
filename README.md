# SmallBiz Cyber & AI Readiness Advisor

**Built by [Champtron Systems LLC](https://champtron-systems.com)**  
**Live Demo:** https://champtron-systems.com/smallbiz-ai/  
**Contact:** support@champtron-systems.com

> A free, fully browser-based readiness advisor that helps small business owners evaluate their cybersecurity posture, AI adoption readiness, funding preparedness, and operational gaps — and walk away with a scored report, tailored action plan, and ready-to-use documents. No account required. No cost. Takes ~5 minutes.

---

## What It Does

A business owner answers ~15 questions and the tool produces:

| Output | Description |
|---|---|
| **Cyber Readiness Score** | How well-protected the business is against threats |
| **AI Readiness Score** | How effectively AI tools are being used |
| **Operations Score** | Digital tool and automation maturity |
| **Funding Readiness Score** | Preparedness to apply for grants or loans |
| **Overall Score** | Weighted composite of all four scores |
| **Industry Recommendations** | Specific guidance for 10+ business types |
| **ROI & Time-Savings Estimates** | Projected value of recommended improvements |
| **30/60/90-Day Roadmap** | Prioritized action plan by timeframe |
| **Risk Register** | Top vulnerabilities with severity ratings |
| **Executive Report Export** | Downloadable summary report |
| **Business Profile** | Auto-generated business summary document |
| **Policy Generator** | Password policy, acceptable use, incident response |
| **Compliance Checklist** | Step-by-step compliance tracking |
| **Implementation Tracker** | Mark progress on recommended actions |
| **Funding Submission Prep** | Checklist and gap alerts for grant/loan applications |
| **Application Answer Builder** | Pre-written answers for common grant questions |
| **Customer Growth Planner** | Revenue and customer growth snapshot |
| **Cash-Flow Snapshot** | Basic cash-flow health overview |

---

## Why It Was Built

Most small business owners cannot afford dedicated cybersecurity, AI, or operations consultants — yet they face the same risks as larger companies. This tool turns complex readiness questions into simple, actionable answers at no cost.

**Who it's for:** Restaurants, nonprofits, contractors, creators, consultants, retail shops, online stores, and service businesses.

---

## Features & Enhancements

### Splash Intro Screen
- Full-screen overlay appears on first load
- Lists all 12 tool outputs with color-coded icons
- "Get Started" button navigates directly to the Assessment view
- Smooth fade-in/fade-out animation

### Multi-View Dashboard Layout
- Sidebar navigation with 15 views
- Fixed topbar with breadcrumb
- Persistent active state on nav items
- All views accessible without page reload

### 15 Navigation Views
1. **Dashboard** — Score overview, charts, quick-start cards
2. **Assessments** — Business info form + readiness questionnaire
3. **Results & Score** — Radar chart, score breakdown, industry benchmarks
4. **Action Plan** — Prioritized 30/60/90-day roadmap
5. **Risk Register** — Vulnerability list with severity and recommendations
6. **Implementation Tracker** — Checkbox-based progress tracker (localStorage)
7. **Funding Readiness** — Checklist, gap alerts, opportunity score
8. **Business Profile** — Auto-populated profile with two states (empty/populated)
9. **Policies & Documents** — Password policy, AUP, incident response generator
10. **Growth Planner** — Customer acquisition and revenue growth tools
11. **Cash-Flow Snapshot** — Monthly cash-flow health overview
12. **Reports** — Executive report download and baseline comparison
13. **Resources** — Clickable resource cards with Free/Paid/Grants badges
14. **Help & Support** — Step guide, expandable score explanations, FAQ, contact
15. **About** — Full tool description, 5-step flow, feature grid, sustainability plan

### Welcome Banner
- Animated glowing SVG shield with blue gradient, glow filter, checkmark, and circuit dots
- Plain-English tagline explaining the tool in one sentence
- Color-coded pill badges: Cyber · AI · Funding · Action Plan · Document Generator

### Assessment Engine
- 4 scoring categories: Cyber, AI, Operations, Funding
- Weighted overall score formula
- Industry-specific recommendations for 10+ business types
- Sample business profiles for quick demo (Restaurant, Barber, Nonprofit, Contractor, Retail)

### Business Profile View
- Two states: empty (pre-assessment prompt) and populated (post-assessment)
- Auto-populates name, industry, scores, challenges, industry tips, and score bars
- Downloadable as a text file

### Understanding Your Scores (Help & Support)
- 4 expandable score cards (Cyber, AI, Operations, Funding)
- Each card shows: scoring factors, what strong looks like, improvement steps, action buttons
- Accordion behavior — one open at a time
- "Click to expand" hint with animated chevron
- Per-card color theming via CSS custom properties

### Resources Section
- Clickable resource cards grouped by category
- Live external links opening in new tab
- Free / Paid / Grants badges on each resource
- Categories: Cybersecurity, AI Tools, Funding, Operations

### Help & Support Section
- Step-by-step getting started guide
- Expandable score explanation cards
- FAQ accordion
- Contact grid with live email and website links

### Privacy Policy & Terms of Use
- Full Privacy Policy covering data handling, localStorage-only storage, no server transmission
- Full Terms of Use covering acceptable use, IP, disclaimers, governing law
- Opens in a clean modal overlay — no page navigation required
- Both accessible from the footer

### Mobile Responsiveness
- Fixed mobile topbar with hamburger menu on screens ≤ 800px
- Sidebar slides in from left with dark overlay
- Tapping a nav item or overlay closes the menu
- All grids reflow to single or two-column on small screens
- Splash screen, score cards, forms, and About page all stack properly
- Additional breakpoint at 480px for small phones

### Legal & Contact
- Footer: Privacy Policy · Terms of Use · Contact (mailto link)
- Contact: support@champtron-systems.com
- Privacy Policy: data stays in your browser, no server transmission
- Terms of Use: free for individual use, not professional advice disclaimer

### Sustainability Model
The tool is and will remain free for individual small business owners. A future premium tier and white-label licensing model (targeting community banks, credit unions, SBDCs, and chambers of commerce) will ensure long-term sustainability without compromising free community access.

---

## Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Structure — single file SPA |
| CSS3 | Custom properties, keyframe animations, grid/flexbox layout |
| Vanilla JavaScript | All logic, scoring, view routing, localStorage |
| Chart.js (CDN) | Doughnut and radar charts |
| SVG | Shield graphic, nav icons, card icons |
| localStorage | Baseline scores and implementation tracker persistence |

No frameworks. No build tools. No dependencies beyond Chart.js.

---

## Folder Structure

```text
.
├── index.html               # Full app — all 15 views
├── styles.css               # ~1600+ lines — all styles and animations
├── app.js                   # ~950+ lines — all logic and scoring
├── champtron-logo-optimized.jpg
├── README.md
├── SERVERBYT_DEPLOYMENT.md
├── GITHUB_DEPLOYMENT.md
├── SKIP_APPLICATION_ANSWERS.md
├── LOOM_WALKTHROUGH_SCRIPT.md
├── DEPLOYMENT_NOTES.md
└── .gitignore
```

---

## How to Run Locally

No build tools required.

1. Clone or download the repository
2. Open `index.html` in any modern browser

Optional local server:

```bash
python -m http.server 8080
```

Then visit: `http://localhost:8080`

---

## Deployment

### Static Hosting (cPanel / FTP)
Upload these three files to your public web folder:
```
index.html
styles.css
app.js
champtron-logo-optimized.jpg
```

Access at: `https://yourdomain.com/smallbiz-ai/`

### GitHub Pages
1. Push to GitHub repository
2. Go to **Settings > Pages**
3. Source: Deploy from branch → `master` → `/root`
4. Save — GitHub provides the live URL

### Netlify / Vercel
Drag and drop the folder or connect the GitHub repo — deploys automatically.

---

## Grant Application — Skip AI Builder

**What was built:**
An AI-powered readiness advisor that helps entrepreneurs and small business owners understand their cybersecurity posture, AI adoption readiness, operational gaps, and funding preparedness. The tool generates readiness scores, practical recommendations, ROI estimates, a risk register, application answers, and a 30/60/90-day roadmap that business owners can act on immediately.

**Problem solved:**
Many small business owners cannot afford dedicated cybersecurity, AI, or operations consultants, but they still need clear guidance to modernize, reduce risk, and grow. This tool turns complex technology and business-readiness questions into a simple self-service assessment with useful, actionable outputs.

**Sustainability:**
The tool will remain free and openly accessible to all individual small business owners. A future premium tier and white-label licensing model targeting community banks, credit unions, SBDCs, and chambers of commerce will ensure long-term sustainability without compromising free community access.

**Live URL:** https://champtron-systems.com/smallbiz-ai/

---

## Demo Flow

1. Visit the live URL — splash screen lists all 12 outputs
2. Click **Get Started** — Assessment view opens
3. Fill in business info or select a sample profile
4. Submit → Dashboard populates with scores and charts
5. Navigate: Results → Action Plan → Risk Register → Documents
6. Show Business Profile auto-populated from answers
7. Show Policy Generator — download a policy document
8. Show Funding Readiness prep and Application Answer Builder
9. Show Implementation Tracker and Growth Planner
10. Show Help & Support — click the expandable score cards
11. Show Resources — click live external links
12. Show About page — full tool description
13. Click Privacy Policy and Terms of Use in footer
14. Resize browser to mobile — hamburger menu appears

---

## License

© 2025 Champtron Systems LLC. All rights reserved.  
Free for individual small business use. Contact support@champtron-systems.com for licensing inquiries.
