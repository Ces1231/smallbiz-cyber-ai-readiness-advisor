const samples = {
  restaurant: {
    businessName: "Bright Path Café", industry: "restaurant",
    challenge: "Manual inventory tracking, weak password practices, and no clear AI plan for customer engagement.",
    mfa: "1", backups: "1", training: "0", digitalTools: "1", automation: "0", aiUsage: "0", documents: "1", onlinePresence: "1", growthPlan: "1"
  },
  barber: {
    businessName: "Elite Cuts Studio", industry: "barber",
    challenge: "Manual booking, limited customer retention, and inconsistent cybersecurity practices.",
    mfa: "1", backups: "0", training: "0", digitalTools: "1", automation: "1", aiUsage: "0", documents: "1", onlinePresence: "2", growthPlan: "1"
  },
  nonprofit: {
    businessName: "Community Lift Network", industry: "nonprofit",
    challenge: "Grant readiness issues, donor tracking gaps, and limited cyber awareness.",
    mfa: "1", backups: "1", training: "1", digitalTools: "1", automation: "0", aiUsage: "1", documents: "1", onlinePresence: "1", growthPlan: "1"
  },
  contractor: {
    businessName: "Prime Build Services", industry: "contractor",
    challenge: "Paper-based workflows, project tracking gaps, and limited security policies.",
    mfa: "0", backups: "1", training: "0", digitalTools: "1", automation: "0", aiUsage: "0", documents: "1", onlinePresence: "1", growthPlan: "1"
  },
  online: {
    businessName: "Urban Market Online", industry: "online",
    challenge: "Manual customer support, weak fraud controls, and poor use of analytics.",
    mfa: "1", backups: "1", training: "1", digitalTools: "2", automation: "1", aiUsage: "1", documents: "2", onlinePresence: "2", growthPlan: "1"
  }
};

const industryTips = {
  restaurant: ["Use AI to forecast inventory and reduce waste.", "Add MFA to POS, accounting, email, and admin accounts.", "Automate customer follow-up offers and review requests."],
  barber: ["Use an AI booking assistant to reduce missed appointments.", "Automate customer reminders and loyalty messages.", "Secure scheduling and payment platforms with MFA."],
  nonprofit: ["Use AI to draft donor updates and grant narratives.", "Centralize donor records and restrict access by role.", "Create a repeatable grant-readiness checklist."],
  contractor: ["Digitize estimates, invoices, and job status tracking.", "Use AI to summarize project notes and generate customer updates.", "Protect client records and payment information with stronger access controls."],
  online: ["Use AI customer support for common questions.", "Improve fraud monitoring and account security.", "Use analytics to identify high-value products and customers."],
  consultant: ["Create reusable AI proposal templates.", "Secure client documents with MFA and backups.", "Build repeatable onboarding workflows."],
  retail: ["Use AI to track seasonal demand.", "Secure POS and inventory platforms.", "Automate promotions and customer segmentation."]
};

let chart;
let latestReport = "";
let latestData = null;
let latestScores = null;
let currentGeneratedDocument = "";
let isPaid = false;

window.unlockDemo = function() {
  isPaid = true;
  document.getElementById('upgradeWall').classList.add('hidden');
  const paid = document.getElementById('paidContent');
  paid.classList.remove('hidden');
  paid.scrollIntoView({ behavior: 'smooth' });
};

function setValue(id, val){ document.getElementById(id).value = val; }

function loadSample(type){
  const s = samples[type];
  Object.entries(s).forEach(([k,v]) => setValue(k,v));
  document.getElementById("assessment").scrollIntoView({behavior:"smooth"});
}

function pct(vals){ return Math.round((vals.reduce((a,b)=>a+Number(b),0)/(vals.length*2))*100); }

function level(score){
  if(score >= 80) return "Advanced readiness";
  if(score >= 60) return "Growth-ready foundation";
  if(score >= 40) return "Developing readiness";
  return "High-priority improvement needed";
}

function risk(score){
  if(score >= 75) return "Low";
  if(score >= 50) return "Moderate";
  return "High";
}

function li(list, items){ list.innerHTML = items.map(x=>`<li>${x}</li>`).join(""); }

document.getElementById("assessmentForm").addEventListener("submit", (e)=>{
  e.preventDefault();
  const data = {
    businessName: businessName.value || "Sample Business",
    industry: industry.value,
    challenge: challenge.value || "The business needs better technology readiness and growth planning.",
    cyber: [mfa.value, backups.value, training.value],
    ai: [digitalTools.value, automation.value, aiUsage.value],
    funding: [documents.value, onlinePresence.value, growthPlan.value]
  };

  const cyberScoreVal = pct(data.cyber);
  const aiScoreVal = pct(data.ai);
  const fundingScoreVal = pct(data.funding);
  const overall = Math.round((cyberScoreVal*0.38)+(aiScoreVal*0.32)+(fundingScoreVal*0.30));

  renderResults(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
});

function renderResults(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall){
  latestData = data;
  latestScores = { cyberScoreVal, aiScoreVal, fundingScoreVal, overall };
  document.getElementById("results").classList.remove("hidden");
  cyberBar.style.width = `${cyberScoreVal}%`;
  aiBar.style.width = `${aiScoreVal}%`;
  fundingBar.style.width = `${fundingScoreVal}%`;
  cyberScore.textContent = `${cyberScoreVal}%`;
  aiScore.textContent = `${aiScoreVal}%`;
  fundingScore.textContent = `${fundingScoreVal}%`;
  overallLabel.textContent = `${overall}% Overall Readiness`;
  maturityLevel.textContent = `${level(overall)} • Cyber Risk: ${risk(cyberScoreVal)} • AI Readiness: ${level(aiScoreVal)}`;

  const ctx = document.getElementById("overallChart");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "doughnut",
    data: { labels:["Readiness","Gap"], datasets:[{ data:[overall,100-overall] }] },
    options: { plugins:{legend:{display:false}}, cutout:"72%" }
  });

  const recommendations = [
    cyberScoreVal < 70 ? "Strengthen baseline cybersecurity by enabling MFA, improving backups, and creating simple staff security guidance." : "Maintain current cybersecurity controls and review them quarterly.",
    aiScoreVal < 70 ? "Start with one practical AI workflow such as customer follow-up, document drafting, scheduling, inventory, or reporting." : "Expand AI usage into analytics, customer support, and repeatable business workflows.",
    fundingScoreVal < 70 ? "Organize business documents, service descriptions, policies, and growth goals to improve grant and funding readiness." : "Use current documentation to prepare stronger proposals, capability summaries, and funding applications.",
    "Review the report monthly and convert the roadmap into assigned tasks with clear owners and dates."
  ];

  li(document.getElementById("recommendations"), recommendations);
  li(document.getElementById("industryRecommendations"), industryTips[data.industry] || industryTips.consultant);

  li(beforeList, ["Manual or disconnected workflows", "Unclear cybersecurity posture", "No structured AI adoption plan", "Limited funding-readiness evidence"]);
  li(afterList, ["Clear readiness dashboard and maturity level", "Prioritized risk-reduction actions", "AI opportunities matched to the business", "30/60/90-day roadmap and exportable report"]);

  const weeklyHours = overall < 50 ? "8–12" : overall < 75 ? "5–8" : "3–5";
  roiText.textContent = `Estimated operational efficiency upside: ${overall < 50 ? "20–30%" : overall < 75 ? "12–20%" : "8–12%"} with targeted automation and process improvements.`;
  timeSavings.textContent = `Potential time savings: ${weeklyHours} hours per week by automating repetitive tasks.`;
  riskReduction.textContent = `Potential risk movement: ${risk(cyberScoreVal)} cyber risk trending toward Low after priority controls are implemented.`;

  road30.textContent = "Enable MFA, verify backups, document core workflows, and select one AI quick win.";
  road60.textContent = "Automate one high-value workflow, improve business documentation, and standardize security practices.";
  road90.textContent = "Measure results, expand AI usage, prepare funding-ready materials, and review readiness score improvements.";

  renderActionCenter(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
  renderFundingPrep(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
  renderFinalBusinessTools(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
  setupPaywall(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);

  executiveSummary.textContent = `${data.businessName} completed a readiness assessment for cybersecurity, AI adoption, and funding preparedness. The business scored ${overall}% overall, with ${cyberScoreVal}% cyber readiness, ${aiScoreVal}% AI readiness, and ${fundingScoreVal}% funding readiness. The assessment identified practical opportunities to reduce risk, improve efficiency, and create a structured roadmap for growth.`;

  latestReport = `SmallBiz Cyber & AI Readiness Advisor Report
Generated: ${new Date().toLocaleString()}

Business: ${data.businessName}
Industry: ${data.industry}
Primary Challenge: ${data.challenge}

Scores:
- Overall Readiness: ${overall}%
- Cybersecurity Readiness: ${cyberScoreVal}%
- AI Readiness: ${aiScoreVal}%
- Funding / Contract Readiness: ${fundingScoreVal}%

Executive Summary:
${executiveSummary.textContent}

AI Suggested Next Steps:
${recommendations.map((r,i)=>`${i+1}. ${r}`).join("\n")}

Industry-Specific Recommendations:
${(industryTips[data.industry] || industryTips.consultant).map((r,i)=>`${i+1}. ${r}`).join("\n")}

ROI / Business Impact:
${roiText.textContent}
${timeSavings.textContent}
${riskReduction.textContent}

30/60/90-Day Roadmap:
30 Days: ${road30.textContent}
60 Days: ${road60.textContent}
90 Days: ${road90.textContent}

Priority Action Checklist:
Do First:
${Array.from(document.querySelectorAll("#doFirst li")).map(x=>"- "+x.textContent).join("\n")}
Do Next:
${Array.from(document.querySelectorAll("#doNext li")).map(x=>"- "+x.textContent).join("\n")}
Do Later:
${Array.from(document.querySelectorAll("#doLater li")).map(x=>"- "+x.textContent).join("\n")}

Risk Register:
${Array.from(document.querySelectorAll("#riskRegister tr")).map(row=>Array.from(row.children).map(td=>td.textContent).join(" | ")).join("\n")}

Final Business Growth Toolkit:
Compliance Checklist:
${Array.from(document.querySelectorAll("#complianceChecklist li")).map(x=>"- "+x.textContent).join("\n")}

Implementation Progress:
${document.getElementById("trackerPercent")?.textContent || "0%"} completed

Customer Growth Planner:
${Array.from(document.querySelectorAll("#growthPlanner li")).map(x=>"- "+x.textContent).join("\n")}

Built by Champtron Systems LLC.`;

  document.getElementById("results").scrollIntoView({behavior:"smooth"});

  // Cloud save hook — only when logged in; anonymous users run normally
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    saveAssessmentToCloud(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
    // Show AI advisor trigger button for logged-in users with a saved assessment
    const trigger = document.getElementById('aiAdvisorTrigger');
    if (trigger) trigger.style.display = 'block';
  }
}

function downloadReport(){
  const blob = new Blob([latestReport || "Run the assessment first."], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "smallbiz-cyber-ai-readiness-report.txt";
  a.click();
  URL.revokeObjectURL(url);
}


function renderActionCenter(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall){
  const first = [];
  const next = [];
  const later = [];

  if(cyberScoreVal < 70){
    first.push("Enable MFA on email, banking, cloud apps, and admin accounts.");
    first.push("Confirm backups exist and test restoring one important file.");
  } else {
    next.push("Schedule a quarterly cybersecurity review.");
  }

  if(aiScoreVal < 70){
    first.push("Choose one repetitive workflow to automate with AI.");
    next.push("Create an internal AI usage guideline for staff.");
  } else {
    next.push("Expand AI into customer follow-up, reporting, or analytics.");
  }

  if(fundingScoreVal < 70){
    first.push("Organize business documents, service descriptions, and growth goals.");
    next.push("Create a reusable grant/funding readiness folder.");
  } else {
    later.push("Use current documentation to apply for funding, partnerships, or contract opportunities.");
  }

  next.push("Track progress weekly and update the readiness score every 30 days.");
  later.push("Evaluate paid tools or professional help after the free and low-cost steps are complete.");
  later.push("Convert the roadmap into monthly operating goals.");

  li(document.getElementById("doFirst"), first.slice(0,4));
  li(document.getElementById("doNext"), next.slice(0,4));
  li(document.getElementById("doLater"), later.slice(0,4));

  const costs = [
    ["Free", "Enable MFA, review passwords, organize files, document workflows, use free AI prompts."],
    ["Low cost", "Password manager, cloud backup, basic CRM, scheduling tool, domain email security."],
    ["Medium cost", "Managed endpoint protection, paid AI tools, accounting automation, policy templates."],
    ["Requires professional help", "Security assessment, compliance planning, cloud migration, custom automation."]
  ];
  document.getElementById("costLevels").innerHTML = costs.map(c=>`<div class="cost-item"><strong>${c[0]}</strong><span>${c[1]}</span></div>`).join("");

  const tools = [
    ["Password manager", "Centralize strong passwords and reduce account takeover risk."],
    ["Backup tool", "Protect customer records, financial files, and operating documents."],
    ["AI scheduling tool", "Reduce missed appointments and manual coordination."],
    ["CRM", "Track leads, customers, follow-ups, and growth opportunities."],
    ["Accounting/invoicing", "Improve billing, cash-flow visibility, and tax organization."]
  ];
  document.getElementById("toolRecommendations").innerHTML = tools.map(t=>`<div class="tool-item"><strong>${t[0]}</strong><span>${t[1]}</span></div>`).join("");

  const risks = [];
  if(cyberScoreVal < 70) risks.push(["Weak cybersecurity controls", "Account compromise, data loss, business interruption", "High", "Enable MFA, backups, endpoint protection, and basic security training."]);
  if(aiScoreVal < 70) risks.push(["No clear AI adoption plan", "Missed productivity gains and slower customer response", "Medium", "Start with one low-risk AI use case and document acceptable usage."]);
  if(fundingScoreVal < 70) risks.push(["Incomplete business readiness documents", "Weaker grant, partnership, and contract applications", "Medium", "Create a grant readiness folder with mission, services, customers, goals, and financial basics."]);
  risks.push(["Manual processes", "Lost time, inconsistent service, and limited scalability", overall < 60 ? "High" : "Medium", "Automate scheduling, reporting, customer follow-up, or invoicing first."]);
  risks.push(["Limited reassessment process", "No visibility into improvement over time", "Low", "Save baseline score and reassess every 30 days."]);

  document.getElementById("riskRegister").innerHTML = risks.map(r=>{
    const cls = r[2] === "High" ? "priority-high" : r[2] === "Medium" ? "priority-medium" : "priority-low";
    return `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="${cls}">${r[2]}</td><td>${r[3]}</td></tr>`;
  }).join("");

  updateBaselineStatus();
}

function getBusinessName(){
  return latestData?.businessName || document.getElementById("businessName")?.value || "Your Business";
}

function generateDocument(type){
  const name = getBusinessName();
  const today = new Date().toLocaleDateString();
  const industryName = latestData?.industry || document.getElementById("industry")?.value || "small business";
  const docs = {
    cyber: `BASIC CYBERSECURITY POLICY

Business: ${name}
Date: ${today}

Purpose:
This policy establishes basic cybersecurity practices to protect business systems, customer information, financial records, and operating data.

Minimum Practices:
1. Require multi-factor authentication for email, banking, cloud tools, and administrator accounts.
2. Use strong, unique passwords and a password manager.
3. Back up important business files and test restore capability monthly.
4. Keep computers, phones, browsers, and business software updated.
5. Limit access to customer, financial, and employee records based on business need.
6. Train employees and contractors to identify phishing, suspicious links, and fraudulent requests.
7. Report suspicious activity immediately to the business owner or designated contact.

Monthly Review:
Review user access, backup status, software updates, and any security incidents every 30 days.`,

    ai: `AI USAGE POLICY

Business: ${name}
Date: ${today}

Purpose:
This policy helps the business use AI tools safely, responsibly, and productively.

Approved Uses:
1. Drafting emails, marketing copy, customer messages, checklists, and summaries.
2. Brainstorming operational improvements and workflow automation ideas.
3. Creating first drafts of business documents that are reviewed by a human.

Restricted Uses:
1. Do not upload sensitive customer data, passwords, financial account numbers, or confidential contracts into public AI tools.
2. Do not rely on AI output without human review.
3. Do not use AI to make final legal, tax, medical, or employment decisions without qualified review.

Review Process:
All AI-generated business content should be reviewed for accuracy, tone, privacy, and compliance before use.`,

    bcp: `BUSINESS CONTINUITY CHECKLIST

Business: ${name}
Date: ${today}

Objective:
Help the business continue operations during outages, cyber incidents, staffing disruptions, or vendor issues.

Checklist:
[ ] Identify critical systems: email, phones, payment systems, website, accounting, scheduling, and customer records.
[ ] Maintain a current emergency contact list.
[ ] Back up important files and test recovery monthly.
[ ] Document how to operate manually if key systems are unavailable.
[ ] Identify backup vendors or alternate tools.
[ ] Create a customer communication plan for service disruptions.
[ ] Store insurance, banking, license, and business registration documents in a secure location.
[ ] Review this checklist every 30 days.

Priority Recovery Order:
1. Customer communication
2. Payment/invoicing
3. Scheduling/order fulfillment
4. Financial/accounting records
5. Website/marketing channels`,

    grant: `GRANT READINESS CHECKLIST

Business: ${name}
Date: ${today}

Core Business Information:
[ ] Legal business name
[ ] Business address and contact information
[ ] Website or portfolio link
[ ] Business mission statement
[ ] Description of products/services
[ ] Customer or community served
[ ] Problem the business solves
[ ] Business goals for the next 12 months

Supporting Materials:
[ ] Business registration documents
[ ] Tax or EIN information, if applicable
[ ] Budget estimate for requested funds
[ ] Use-of-funds explanation
[ ] Photos, demo link, or proof of work
[ ] Customer examples or testimonials, if available
[ ] LinkedIn, GitHub, or portfolio link, if applicable

Recommended Grant Narrative:
${name} serves the ${industryName} market by addressing practical business needs through improved operations, technology readiness, and growth planning. Grant funding would help strengthen the business, improve service delivery, and expand its ability to support customers and the community.`
  };

  currentGeneratedDocument = docs[type];
  document.getElementById("generatedDocument").value = currentGeneratedDocument;
}

function downloadGeneratedDocument(){
  const content = currentGeneratedDocument || document.getElementById("generatedDocument").value || "Generate a document first.";
  const blob = new Blob([content], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "smallbiz-generated-document.txt";
  a.click();
  URL.revokeObjectURL(url);
}

async function saveBaseline(){
  if(!latestScores){
    alert("Run the assessment first, then save the baseline.");
    return;
  }
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn() && window._lastSavedAssessmentId) {
    try {
      await ApiClient.post('/baselines', { assessment_id: window._lastSavedAssessmentId });
      updateBaselineStatus();
      return;
    } catch (err) {
      console.warn('Cloud baseline save failed, falling back to localStorage:', err);
    }
  }
  // Fallback: original localStorage behavior
  const record = {
    date: new Date().toISOString(),
    businessName: getBusinessName(),
    scores: latestScores
  };
  localStorage.setItem("smallbizAdvisorBaseline", JSON.stringify(record));
  updateBaselineStatus();
}

async function compareBaseline(){
  if(!latestScores){
    alert("Run the assessment again before comparing progress.");
    return;
  }
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    try {
      const baseline = await ApiClient.get('/baselines/me');
      const diff = latestScores.overall - baseline.overall_score;
      const word = diff >= 0 ? "improved" : "decreased";
      document.getElementById("baselineStatus").textContent =
        `Cloud baseline: ${baseline.overall_score}% saved for ${baseline.business_name} on ${new Date(baseline.saved_at).toLocaleDateString()}. ` +
        `Current: ${latestScores.overall}%. Overall readiness ${word} by ${Math.abs(diff)} points.`;
      return;
    } catch (err) {
      if (err.status !== 404) console.warn('Could not load cloud baseline:', err);
    }
  }
  // Fallback: original localStorage behavior
  const raw = localStorage.getItem("smallbizAdvisorBaseline");
  if(!raw){
    alert("No baseline saved yet.");
    return;
  }
  const baseline = JSON.parse(raw);
  const diff = latestScores.overall - baseline.scores.overall;
  const word = diff >= 0 ? "improved" : "decreased";
  document.getElementById("baselineStatus").textContent = `Baseline: ${baseline.scores.overall}% saved for ${baseline.businessName}. Current: ${latestScores.overall}%. Overall readiness ${word} by ${Math.abs(diff)} points.`;
}

function updateBaselineStatus(){
  const el = document.getElementById("baselineStatus");
  if(!el) return;
  const raw = localStorage.getItem("smallbizAdvisorBaseline");
  if(!raw){
    el.textContent = "No baseline saved yet. Save today’s score and reassess in 30 days.";
    return;
  }
  const baseline = JSON.parse(raw);
  const date = new Date(baseline.date).toLocaleDateString();
  el.textContent = `Saved baseline for ${baseline.businessName}: ${baseline.scores.overall}% overall readiness on ${date}. Recheck in 30 days to show improvement.`;
}


function renderFundingPrep(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall){
  const docsScore = Number(document.getElementById("documents").value);
  const onlineScore = Number(document.getElementById("onlinePresence").value);
  const growthScore = Number(document.getElementById("growthPlan").value);
  const demoReady = aiScoreVal >= 40 || onlineScore >= 1;
  const problemReady = (data.challenge || "").length > 25;
  const customerReady = true;
  const useFundsReady = fundingScoreVal >= 50;

  const opportunity = Math.round((fundingScoreVal * 0.45) + (onlineScore/2*100 * 0.15) + (growthScore/2*100 * 0.15) + (problemReady ? 15 : 0) + (demoReady ? 10 : 0));
  const opp = Math.max(0, Math.min(100, opportunity));

  document.getElementById("opportunityScore").textContent = `${opp}%`;
  document.getElementById("opportunityScoreText").textContent = opp >= 75
    ? "Strong foundation for funding, marketplace, or partnership submissions."
    : opp >= 55
      ? "Good start, but several application materials should be strengthened."
      : "Needs stronger application readiness before submitting to competitive opportunities.";

  const checklist = [
    [`${data.businessName || "Business"} summary is defined`, true],
    ["Mission / purpose statement prepared", docsScore >= 1],
    ["Target customers clearly described", customerReady],
    ["Problem statement is specific", problemReady],
    ["Website, demo, or online proof available", onlineScore >= 1],
    ["Growth goals or roadmap documented", growthScore >= 1],
    ["Use-of-funds explanation can be created", useFundsReady],
    ["Business documents organized", docsScore >= 1]
  ];
  document.getElementById("fundingChecklist").innerHTML = checklist.map(([txt, ok]) => `<li><span class="${ok ? "good" : "warn"}">${ok ? "✓" : "!"}</span> ${txt}</li>`).join("");

  const gaps = [];
  if(!problemReady) gaps.push(["Weak problem statement", "Make the business challenge more specific and measurable."]);
  if(onlineScore < 1) gaps.push(["No strong online proof", "Add a live demo, website, portfolio, or walkthrough video."]);
  if(growthScore < 1) gaps.push(["No clear growth plan", "Create a 30/60/90-day roadmap and explain expected outcomes."]);
  if(docsScore < 1) gaps.push(["Documents not organized", "Prepare mission, services, customers, budget, and use-of-funds materials."]);
  if(fundingScoreVal < 60) gaps.push(["Funding readiness is below target", "Strengthen business profile, budget, and operational documentation before applying."]);
  if(gaps.length === 0) gaps.push(["No major gaps detected", "Continue polishing the demo, report, and application narrative."]);

  document.getElementById("gapAlerts").innerHTML = gaps.map(g => `<li><span class="${g[0].includes("No major") ? "good" : "alert"}">${g[0].includes("No major") ? "✓" : "!"}</span> <strong>${g[0]}:</strong> ${g[1]}</li>`).join("");
}

function businessSummaryText(){
  const name = latestData?.businessName || document.getElementById("businessName").value || "the business";
  const industryName = latestData?.industry || document.getElementById("industry").value || "small business";
  const challengeText = latestData?.challenge || document.getElementById("challenge").value || "improving operations, technology readiness, and business growth";
  return { name, industryName, challengeText };
}

function buildApplicationAnswer(){
  const q = document.getElementById("answerQuestion").value;
  const {name, industryName, challengeText} = businessSummaryText();
  const overall = latestScores?.overall ?? 0;
  const answers = {
    whatDoYouDo: `${name} is a ${industryName} business focused on serving customers through reliable services, practical operations, and continuous improvement. The business is working to strengthen its technology, cybersecurity, AI readiness, and growth systems so it can operate more efficiently and scale with confidence.`,
    customers: `${name} serves customers who need dependable, accessible, and professional support within the ${industryName} market. The business focuses on practical service delivery, customer trust, and long-term relationships while improving internal systems to better meet customer needs.`,
    problem: `${name} is addressing a common small business challenge: ${challengeText}. Like many entrepreneurs, the business needs clearer systems, stronger technology readiness, and better operational planning to reduce risk, save time, and prepare for growth opportunities.`,
    fundingUse: `Funding would be used to strengthen the business through improved technology, cybersecurity, automation, cloud tools, customer outreach, testing, and operational development. The goal is to turn current business needs into scalable systems that improve efficiency, service quality, and long-term growth readiness.`,
    impact: `The expected impact is a more resilient, efficient, and growth-ready business. By improving readiness from its current assessment level of ${overall}%, the business can reduce operational risk, save time through automation, improve customer service, and become better prepared for funding, partnerships, and marketplace opportunities.`
  };
  document.getElementById("applicationAnswer").value = answers[q];
}

function downloadApplicationAnswer(){
  const content = document.getElementById("applicationAnswer").value || "Generate an application answer first.";
  downloadTextFile(content, "application-answer.txt");
}

function buildBusinessProfile(){
  const {name, industryName, challengeText} = businessSummaryText();
  const cyber = latestScores?.cyberScoreVal ?? 0;
  const ai = latestScores?.aiScoreVal ?? 0;
  const funding = latestScores?.fundingScoreVal ?? 0;
  const overall = latestScores?.overall ?? 0;

  const profile = `ONE-PAGE BUSINESS PROFILE

Business Name:
${name}

Industry:
${industryName}

Business Summary:
${name} is a small business focused on improving operations, customer service, and long-term growth through stronger technology readiness, practical cybersecurity practices, and responsible AI adoption.

Target Customer:
The business serves customers in the ${industryName} market who need reliable, accessible, and professional support.

Problem Being Solved:
${challengeText}

Unique Value:
The business is focused on practical execution, customer trust, and continuous improvement. By strengthening cybersecurity, AI readiness, and operational systems, it can deliver better service while preparing for growth opportunities.

Readiness Snapshot:
- Overall Readiness: ${overall}%
- Cybersecurity Readiness: ${cyber}%
- AI Readiness: ${ai}%
- Funding / Opportunity Readiness: ${funding}%

Growth Goals:
1. Improve operational efficiency.
2. Reduce business and cybersecurity risk.
3. Adopt AI responsibly for practical workflows.
4. Organize business information for funding, partnerships, and marketplace opportunities.
5. Build a repeatable roadmap for long-term growth.

Funding / Opportunity Preparedness:
This profile can be used to prepare stronger applications and business profiles before applying through funding platforms, partner programs, or marketplace opportunities.`;

  document.getElementById("businessProfile").value = profile;
}

function downloadBusinessProfile(){
  const content = document.getElementById("businessProfile").value || "Generate a business profile first.";
  downloadTextFile(content, "business-profile.txt");
}

function downloadTextFile(content, filename){
  const blob = new Blob([content], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


function renderFinalBusinessTools(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall){
  const docsScore = Number(document.getElementById("documents").value);
  const onlineScore = Number(document.getElementById("onlinePresence").value);
  const growthScore = Number(document.getElementById("growthPlan").value);

  const compliance = [
    ["LLC / business registration documents organized", docsScore >= 1],
    ["Business licenses or local operating requirements reviewed", docsScore >= 1],
    ["Insurance needs reviewed", fundingScoreVal >= 50],
    ["Website or business profile available", onlineScore >= 1],
    ["Privacy policy or customer data notice considered", cyberScoreVal >= 50],
    ["MFA enabled for key accounts", Number(document.getElementById("mfa").value) >= 1],
    ["Backup process in place", Number(document.getElementById("backups").value) >= 1],
    ["Basic cybersecurity or AI usage policy drafted", cyberScoreVal >= 50 || aiScoreVal >= 50]
  ];
  document.getElementById("complianceChecklist").innerHTML = compliance.map(([txt, ok]) =>
    `<li><span class="${ok ? "good" : "warn"}">${ok ? "✓" : "!"}</span> ${txt}</li>`
  ).join("");

  const tasks = [
    "Enable MFA on critical accounts",
    "Confirm backups and test restore",
    "Document top 3 business workflows",
    "Choose one AI automation quick win",
    "Create business profile and funding summary",
    "Generate cybersecurity or AI usage policy",
    "Review monthly cash-flow snapshot",
    "Reassess readiness in 30 days"
  ];

  const saved = JSON.parse(localStorage.getItem("smallbizImplementationTracker") || "{}");
  document.getElementById("implementationTracker").innerHTML = tasks.map((task, idx) => {
    const checked = saved[task] ? "checked" : "";
    const status = saved[task] ? "Completed" : idx < 3 ? "Do First" : idx < 6 ? "Do Next" : "Planned";
    return `<div class="tracker-item">
      <input type="checkbox" ${checked} onchange="updateTracker('${encodeURIComponent(task)}', this.checked)" />
      <label>${task}</label>
      <span class="status-pill">${status}</span>
    </div>`;
  }).join("");
  updateTrackerPercent();

  const industryName = data.industry || "business";
  const growthIdeas = {
    restaurant: ["Launch a customer review request workflow after visits.", "Use simple loyalty offers for repeat customers.", "Create weekly social posts around specials, catering, and community involvement."],
    barber: ["Automate appointment reminders to reduce no-shows.", "Create a referral reward for existing clients.", "Use before-and-after photo content to drive social engagement."],
    nonprofit: ["Build a monthly donor communication calendar.", "Create a simple impact story template for grants and donors.", "Segment donors, volunteers, and community partners for better outreach."],
    contractor: ["Create follow-up messages for estimates and completed jobs.", "Build a referral ask into every completed project.", "Use project photos and customer reviews to strengthen credibility."],
    online: ["Recover abandoned carts with follow-up emails.", "Use customer questions to create product content.", "Segment customers by purchase history for repeat sales."],
    consultant: ["Create a lead magnet or one-page capability profile.", "Automate follow-up after consultations.", "Publish short educational posts that solve customer pain points."],
    retail: ["Create a customer loyalty list.", "Promote seasonal bundles and top sellers.", "Use customer feedback to guide inventory and marketing."]
  };
  document.getElementById("growthPlanner").innerHTML = (growthIdeas[industryName] || growthIdeas.consultant).map(x => `<li>${x}</li>`).join("");

  calculateCashFlow();
}

function updateTracker(taskEncoded, checked){
  const task = decodeURIComponent(taskEncoded);
  const saved = JSON.parse(localStorage.getItem("smallbizImplementationTracker") || "{}");
  saved[task] = checked;
  localStorage.setItem("smallbizImplementationTracker", JSON.stringify(saved));
  updateTrackerPercent();
}

function updateTrackerPercent(){
  const boxes = Array.from(document.querySelectorAll("#implementationTracker input[type='checkbox']"));
  if(!boxes.length){
    document.getElementById("trackerPercent").textContent = "0%";
    return;
  }
  const done = boxes.filter(b => b.checked).length;
  const pct = Math.round((done / boxes.length) * 100);
  document.getElementById("trackerPercent").textContent = `${pct}%`;
}

function calculateCashFlow(){
  const rev = Number(document.getElementById("monthlyRevenue")?.value || 0);
  const exp = Number(document.getElementById("monthlyExpenses")?.value || 0);
  const cash = Number(document.getElementById("cashOnHand")?.value || 0);
  const reserve = Number(document.getElementById("reserveGoal")?.value || 0);
  const net = rev - exp;
  const runway = exp > 0 ? (cash / exp) : 0;
  let cls = "cash-good";
  let label = "Healthy";
  let guidance = "Continue monitoring cash monthly and consider reinvesting in automation, security, and customer growth.";
  if(net < 0 || runway < 1){
    cls = "cash-risk";
    label = "High attention";
    guidance = "Reduce expenses, improve collections, delay non-essential spending, and prioritize revenue-generating actions.";
  } else if(runway < 3 || cash < reserve){
    cls = "cash-watch";
    label = "Watch closely";
    guidance = "Build reserves, review expenses, and prioritize low-cost improvements before larger investments.";
  }

  const result = document.getElementById("cashFlowResult");
  if(!result) return;
  result.innerHTML = `
    <p><strong>Monthly Net:</strong> $${net.toLocaleString()}</p>
    <p><strong>Estimated Runway:</strong> ${runway.toFixed(1)} months</p>
    <p><strong>Status:</strong> <span class="${cls}">${label}</span></p>
    <p>${guidance}</p>
  `;
}


function setupPaywall(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall) {
  renderIssueSummary(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
  if (isPaid) {
    document.getElementById('paidContent').classList.remove('hidden');
    document.getElementById('upgradeWall').classList.add('hidden');
  } else {
    document.getElementById('paidContent').classList.add('hidden');
    renderUpgradeWall(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
    document.getElementById('upgradeWall').classList.remove('hidden');
  }
}

function renderIssueSummary(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall) {
  const categories = [
    { label: 'Cyber', score: cyberScoreVal },
    { label: 'AI', score: aiScoreVal },
    { label: 'Funding', score: fundingScoreVal }
  ];
  let highCount = 0, mediumCount = 0, goodCount = 0;
  categories.forEach(c => {
    if (c.score < 50) highCount++;
    else if (c.score < 75) mediumCount++;
    else goodCount++;
  });
  const actionCount = highCount * 3 + mediumCount * 2 + 1;

  const badges = [
    highCount > 0 ? `<span class="risk-badge badge-high">${highCount} High Priority</span>` : '',
    mediumCount > 0 ? `<span class="risk-badge badge-medium">${mediumCount} Moderate</span>` : '',
    goodCount > 0 ? `<span class="risk-badge badge-good">${goodCount} Good Standing</span>` : ''
  ].filter(Boolean).join('');

  document.getElementById('freeIssueSummary').innerHTML = `
    <div class="panel" style="margin-bottom:18px">
      <div class="issue-summary-header">
        <div>
          <p class="eyebrow">Free Assessment Summary</p>
          <h3 style="margin:6px 0">Your Readiness Snapshot</h3>
          <div class="issue-badges">${badges}</div>
        </div>
        <div style="text-align:right">
          <p class="eyebrow" style="margin-bottom:4px">Overall Score</p>
          <div class="overall-pill">${overall}%</div>
          <p class="muted" style="font-size:13px;margin-top:6px">${level(overall)}</p>
        </div>
      </div>
      <p class="muted">Your assessment identified <strong style="color:var(--cyan)">${actionCount} priority items</strong> across cybersecurity, AI readiness, and funding preparedness. Unlock the full action plan to see exactly what to fix and in what order.</p>
    </div>
  `;
}

function renderUpgradeWall(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall) {
  const categories = [
    { label: 'Cyber', score: cyberScoreVal },
    { label: 'AI', score: aiScoreVal },
    { label: 'Funding', score: fundingScoreVal }
  ];
  let highCount = 0, mediumCount = 0;
  categories.forEach(c => {
    if (c.score < 50) highCount++;
    else if (c.score < 75) mediumCount++;
  });
  const actionCount = highCount * 3 + mediumCount * 2 + 1;
  const riskLevel = risk(Math.min(cyberScoreVal, aiScoreVal, fundingScoreVal));

  document.getElementById('upgradeWall').innerHTML = `
    <div class="panel upgrade-wall">
      <div class="upgrade-wall-inner">
        <div>
          <p class="eyebrow">Action Plan — Paid Feature</p>
          <h3 style="margin:8px 0 4px">Get Your Full Roadmap to Green</h3>
          <p class="muted" style="margin-bottom:16px">Your free score shows where you stand. The action plan tells you exactly what to fix, in what order — with step-by-step guidance tailored to ${data.businessName || 'your business'}.</p>
          <div class="issue-count">${actionCount}</div>
          <p class="muted" style="margin-top:0;font-size:14px">prioritized action items identified (${riskLevel} risk)</p>
          <ul class="plan-feature-list">
            <li>Step-by-step fix list in priority order</li>
            <li>30/60/90-day implementation roadmap</li>
            <li>Document & policy generator</li>
            <li>Funding readiness submission prep</li>
            <li>Business risk register</li>
            <li>Printable PDF report</li>
          </ul>
          <div class="wall-actions">
            <button class="button primary" onclick="alert('Billing coming soon — contact us at champtron.com')">Unlock Action Plan</button>
            <a href="#" class="button secondary" onclick="window.unlockDemo();return false;">Preview Full Report →</a>
          </div>
        </div>
        <div>
          <p class="muted" style="font-size:13px;margin-bottom:10px">Preview of your locked action items:</p>
          <div class="locked-preview">
            <div class="locked-item"></div>
            <div class="locked-item med"></div>
            <div class="locked-item short"></div>
            <div class="locked-item"></div>
            <div class="locked-item med"></div>
            <div class="locked-item short"></div>
            <div class="locked-item"></div>
          </div>
          <p class="preview-label">Unlock to see your full prioritized action plan</p>
        </div>
      </div>
    </div>
  `;
}

// ── Cloud persistence helpers (SPRINT-001) ────────────────────────────────────

async function saveAssessmentToCloud(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall) {
  try {
    const result = await ApiClient.post('/assessments', {
      business_name: data.businessName,
      industry: data.industry,
      challenge: data.challenge || null,
      inputs: {
        mfa: Number(document.getElementById('mfa')?.value ?? 0),
        backups: Number(document.getElementById('backups')?.value ?? 0),
        training: Number(document.getElementById('training')?.value ?? 0),
        digital_tools: Number(document.getElementById('digitalTools')?.value ?? 0),
        automation: Number(document.getElementById('automation')?.value ?? 0),
        ai_usage: Number(document.getElementById('aiUsage')?.value ?? 0),
        documents: Number(document.getElementById('documents')?.value ?? 0),
        online_presence: Number(document.getElementById('onlinePresence')?.value ?? 0),
        growth_plan: Number(document.getElementById('growthPlan')?.value ?? 0),
      },
      scores: {
        cyber_score: cyberScoreVal,
        ai_score: aiScoreVal,
        funding_score: fundingScoreVal,
        overall_score: overall,
      },
    });
    window._lastSavedAssessmentId = result.id;
  } catch (err) {
    console.warn('Assessment save failed (non-fatal):', err);
  }
}

async function loadAssessmentHistory(offset = 0) {
  if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
  const container = document.getElementById('historyList');
  const paginationEl = document.getElementById('historyPagination');
  if (!container) return;
  try {
    const { data, meta } = await ApiClient.get(`/assessments?limit=6&offset=${offset}`);
    if (!data.length && offset === 0) {
      container.innerHTML = '<p class="muted">No assessments saved yet. Run an assessment to get started.</p>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }
    container.innerHTML = data.map(a => `
      <div class="history-card" onclick="loadHistoricalAssessment('${a.id}')">
        <strong>${a.business_name}</strong>
        <span class="muted">${new Date(a.created_at).toLocaleDateString()}</span>
        <div class="history-scores">
          <span>Overall: <b>${a.overall_score}%</b></span>
          <span>Cyber: ${a.cyber_score}%</span>
          <span>AI: ${a.ai_score}%</span>
          <span>Funding: ${a.funding_score}%</span>
        </div>
        <span class="maturity-pill">${level(a.overall_score)}</span>
      </div>
    `).join('');
    if (paginationEl) renderPagination(meta, offset);
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

async function loadHistoricalAssessment(id) {
  try {
    const assessment = await ApiClient.get(`/assessments/${id}`);
    // API returns flat fields (not nested inputs object)
    const fields = {
      mfa: assessment.mfa, backups: assessment.backups, training: assessment.training,
      digitalTools: assessment.digital_tools, automation: assessment.automation,
      aiUsage: assessment.ai_usage, documents: assessment.documents,
      onlinePresence: assessment.online_presence, growthPlan: assessment.growth_plan,
    };
    for (const [fieldId, val] of Object.entries(fields)) {
      const el = document.getElementById(fieldId);
      if (el && val !== undefined) el.value = val;
    }
    const bizNameEl = document.getElementById('businessName');
    if (bizNameEl && assessment.business_name) bizNameEl.value = assessment.business_name;
    const industryEl = document.getElementById('industry');
    if (industryEl && assessment.industry) industryEl.value = assessment.industry;
    const challengeEl = document.getElementById('challenge');
    if (challengeEl && assessment.challenge) challengeEl.value = assessment.challenge;
    // Re-run the analysis with historical data
    analyze();
    document.getElementById('assessment')?.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    console.error('Failed to load historical assessment:', err);
  }
}

function renderPagination(meta, currentOffset) {
  const el = document.getElementById('historyPagination');
  if (!el) return;
  el.innerHTML = '';
  const limit = meta.limit || 6;
  if (currentOffset > 0) {
    const prev = document.createElement('button');
    prev.className = 'button secondary';
    prev.textContent = 'Previous';
    prev.onclick = () => loadAssessmentHistory(currentOffset - limit);
    el.appendChild(prev);
  }
  if (meta.has_more) {
    const next = document.createElement('button');
    next.className = 'button secondary';
    next.textContent = 'Next';
    next.onclick = () => loadAssessmentHistory(currentOffset + limit);
    el.appendChild(next);
  }
}

// Register auth change listener so history loads and tier UI refreshes on login
if (typeof Auth !== 'undefined') {
  Auth.onAuthChange(({ loggedIn }) => {
    if (loggedIn) {
      loadAssessmentHistory();
      checkTierAndShowUpgrade();
      if (shouldShowOnboarding()) {
        // Small delay to let the UI settle after login
        setTimeout(showOnboardingModal, 300);
      }
    }
  });
}

// ── Onboarding Gate (SPRINT-005) ─────────────────────────────────────────────

var ONBOARDING_KEY = 'onboardingComplete';

function shouldShowOnboarding() {
  return localStorage.getItem(ONBOARDING_KEY) !== 'true';
}

function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

function showOnboardingModal() {
  var modal = document.getElementById('onboardingModal');
  if (!modal) return;
  // Reset to Q1 state
  document.getElementById('onboardingQ1').classList.remove('hidden');
  document.getElementById('onboardingQ2').classList.add('hidden');
  document.getElementById('onboardingChamp').classList.add('hidden');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function hideOnboardingModal() {
  var modal = document.getElementById('onboardingModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

window.onboardingQ1Yes = function() {
  // Existing business path — dismiss modal, stay on assessment
  markOnboardingComplete();
  hideOnboardingModal();
  // Scroll to assessment section (current flow)
  var assessment = document.getElementById('assessment');
  if (assessment) assessment.scrollIntoView({ behavior: 'smooth' });
};

window.onboardingQ1No = function() {
  // Show Q2
  document.getElementById('onboardingQ1').classList.add('hidden');
  document.getElementById('onboardingQ2').classList.remove('hidden');
};

window.onboardingBack = function() {
  // Back to Q1
  document.getElementById('onboardingQ2').classList.add('hidden');
  document.getElementById('onboardingQ1').classList.remove('hidden');
};

window.onboardingQ2Yes = function() {
  // Startup path — show placeholder (startup web path not yet built)
  markOnboardingComplete();
  hideOnboardingModal();
  var notice = document.createElement('div');
  notice.className = 'startup-notice';
  notice.innerHTML = '<div class="panel" style="margin:24px auto;max-width:600px;padding:24px;text-align:center"><h3 style="color:var(--green)">Starting a Business?</h3><p class="muted">Our guided startup assessment is coming soon on web. In the meantime, try the <strong>SmallBiz Advisor mobile app</strong> (Expo Go) for the full startup readiness assessment.</p></div>';
  var nav = document.querySelector('nav');
  if (nav) nav.after(notice);
  notice.scrollIntoView({ behavior: 'smooth' });
};

window.onboardingQ2No = function() {
  // Show Champtron info panel inside the modal
  document.getElementById('onboardingQ2').classList.add('hidden');
  document.getElementById('onboardingChamp').classList.remove('hidden');
  // markOnboardingComplete is called on "Continue to App"
};

window.onboardingDone = function() {
  // Dismiss Champtron panel
  markOnboardingComplete();
  hideOnboardingModal();
};

// ── Billing UI (SPRINT-003) ───────────────────────────────────────────────────

async function checkTierAndShowUpgrade() {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) return;
    try {
        const profile = await ApiClient.get('/profiles/me');
        window._userProfile = profile;
        updateTierUI(profile);
    } catch (err) {
        console.warn('Could not load profile:', err);
    }
}

function updateTierUI(profile) {
    const subStatus = document.getElementById('subscriptionStatus');
    const badge = document.getElementById('tierBadge');
    const manageBtn = document.getElementById('manageBillingBtn');

    if (subStatus) subStatus.style.display = 'flex';
    if (badge) {
        badge.textContent = profile.tier === 'pro' ? 'Pro' : 'Free';
        badge.className = `tier-badge ${profile.tier}`;
    }
    if (manageBtn) {
        manageBtn.style.display = profile.has_active_subscription ? 'inline-flex' : 'none';
    }

    // Upgrade banner for free users
    if (profile.tier === 'free') {
        if (profile.assessments_this_month >= 3) {
            showUpgradeBanner('limit_reached');
        } else if (profile.assessments_this_month >= 2) {
            showUpgradeBanner('approaching_limit');
        }
    }

    // Refresh tier badge after checkout return
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
        setTimeout(checkTierAndShowUpgrade, 3000); // webhook may lag slightly
        window.history.replaceState({}, '', window.location.pathname);
    }
}

function showUpgradeBanner(reason) {
    const banner = document.getElementById('upgradeBanner');
    const title = document.getElementById('upgradeBannerTitle');
    const msg = document.getElementById('upgradeBannerMessage');
    if (!banner) return;
    if (reason === 'limit_reached') {
        title.textContent = 'Monthly Limit Reached';
        msg.textContent = ' — Upgrade to Pro for unlimited assessments + AI Advisor.';
    } else {
        const remaining = 3 - (window._userProfile?.assessments_this_month || 0);
        title.textContent = 'Almost at your free limit';
        msg.textContent = ` — ${remaining} assessment${remaining === 1 ? '' : 's'} remaining this month.`;
    }
    banner.classList.remove('hidden');
}

async function initiateCheckout(plan) {
    if (typeof Auth === 'undefined' || !Auth.isLoggedIn()) {
        if (typeof showAuthModal === 'function') showAuthModal('signup');
        return;
    }
    try {
        const { checkout_url } = await ApiClient.post('/billing/checkout', {
            price_id: `price_${plan}`
        });
        window.location.href = checkout_url;
    } catch (err) {
        if (err && err.status === 409) {
            alert('You already have an active subscription.');
        } else {
            alert('Unable to start checkout. Please try again.');
        }
    }
}

async function openBillingPortal() {
    try {
        const { portal_url } = await ApiClient.post('/billing/portal');
        window.open(portal_url, '_blank');
    } catch (err) {
        alert('Unable to open billing portal. Please try again.');
    }
}

// ── AI Advisor Streaming (SPRINT-002) ─────────────────────────────────────────

// Show AI advisor panel — checks tier; shows paywall for free users
function showAIAdvisor() {
    const profile = window._userProfile;
    if (!profile || profile.tier === 'free') {
        const paywall = document.getElementById('aiAdvisorPaywall');
        if (paywall) {
            paywall.classList.remove('hidden');
            paywall.scrollIntoView({ behavior: 'smooth' });
        }
        return;
    }
    const panel = document.getElementById('aiAdvisorPanel');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

// Core streaming function — reads SSE chunks and writes to a DOM element
async function streamToElement(url, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = '';
    showTypingIndicator(elementId);

    try {
        const token = Auth && typeof Auth.getToken === 'function' ? Auth.getToken() : null;
        const response = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            el.textContent = 'Unable to generate advice. Please try again.';
            hideTypingIndicator(elementId);
            return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let isErrorEvent = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line in buffer
            for (const line of lines) {
                if (line.startsWith('event: error')) { isErrorEvent = true; continue; }
                if (line === '') { isErrorEvent = false; continue; }
                if (line.startsWith('data: ')) {
                    if (isErrorEvent) {
                        el.textContent = 'Unable to generate advice. Please try again.';
                        isErrorEvent = false;
                        continue;
                    }
                    const chunk = line.slice(6);
                    if (chunk === '[DONE]' || chunk === '[CACHED]') continue;
                    el.textContent += chunk;
                }
            }
        }
    } catch (err) {
        el.textContent = 'Connection error. Please check your connection and try again.';
        console.error('Stream error:', err);
    }
    hideTypingIndicator(elementId);
}

// Streams the AI roadmap into #aiRoadmapOutput (real-time) and parses
// labeled 30/60/90 sections into the existing #road30/#road60/#road90 elements.
async function streamRoadmapToElements(assessmentId) {
    const apiBase = window.ADVISOR_API_URL || 'http://localhost:8000';
    const url = `${apiBase}/ai/advice/${assessmentId}/roadmap`;
    const token = Auth && typeof Auth.getToken === 'function' ? Auth.getToken() : null;
    const outputEl = document.getElementById('aiRoadmapOutput');

    // Save static roadmap text for fallback before showing typing indicators
    const staticRoadmap = {};
    ['road30', 'road60', 'road90'].forEach(id => {
        const el = document.getElementById(id);
        if (el) staticRoadmap[id] = el.textContent;
    });

    try {
        const response = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            if (outputEl) outputEl.textContent = 'Unable to generate roadmap. Please try again.';
            return;
        }

        if (outputEl) { outputEl.textContent = ''; showTypingIndicator('aiRoadmapOutput'); }
        ['road30', 'road60', 'road90'].forEach(id => showTypingIndicator(id));

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        let isErrorEvent = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (line.startsWith('event: error')) { isErrorEvent = true; continue; }
                if (line === '') { isErrorEvent = false; continue; }
                if (line.startsWith('data: ')) {
                    if (isErrorEvent) {
                        if (outputEl) outputEl.textContent = 'Unable to generate roadmap. Please try again.';
                        isErrorEvent = false;
                        continue;
                    }
                    const chunk = line.slice(6);
                    if (chunk !== '[DONE]' && chunk !== '[CACHED]') {
                        fullText += chunk;
                        if (outputEl) outputEl.textContent += chunk;
                    }
                }
            }
        }

        hideTypingIndicator('aiRoadmapOutput');
        ['road30', 'road60', 'road90'].forEach(id => hideTypingIndicator(id));

        // Parse labeled sections into existing roadmap elements
        const sections = { '30 Days': 'road30', '60 Days': 'road60', '90 Days': 'road90' };
        for (const [label, id] of Object.entries(sections)) {
            const el = document.getElementById(id);
            if (!el) continue;
            const regex = new RegExp(label + ':([^]*?)(?=30 Days:|60 Days:|90 Days:|$)');
            const match = fullText.match(regex);
            if (match && match[1].trim()) {
                el.textContent = match[1].trim();
            } else if (staticRoadmap[id]) {
                // Restore static text as fallback if AI section not found
                el.textContent = staticRoadmap[id];
            }
        }
    } catch (err) {
        hideTypingIndicator('aiRoadmapOutput');
        ['road30', 'road60', 'road90'].forEach(id => hideTypingIndicator(id));
        if (outputEl) outputEl.textContent = 'Connection error. Please check your connection and try again.';
        // Restore static roadmap on error
        Object.entries(staticRoadmap).forEach(([id, text]) => {
            const el = document.getElementById(id);
            if (el && !el.textContent) el.textContent = text;
        });
        console.error('Roadmap stream error:', err);
    }
}

// Streams the AI executive summary into both #aiSummaryOutput (AI panel)
// and replaces the static #executiveSummary text in the free tier panel.
// Preserves the static text as a data attribute for fallback.
async function streamExecutiveSummaryToElement(assessmentId) {
    const apiBase = window.ADVISOR_API_URL || 'http://localhost:8000';
    const url = `${apiBase}/ai/advice/${assessmentId}/executive_summary`;
    const token = Auth && typeof Auth.getToken === 'function' ? Auth.getToken() : null;
    const summaryOutputEl = document.getElementById('aiSummaryOutput');
    const staticSummaryEl = document.getElementById('executiveSummary');

    // Preserve static summary as fallback before clearing
    if (staticSummaryEl && !staticSummaryEl.dataset.staticSummary) {
        staticSummaryEl.dataset.staticSummary = staticSummaryEl.textContent;
    }

    try {
        const response = await fetch(url, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!response.ok) {
            if (summaryOutputEl) summaryOutputEl.textContent = 'Unable to generate summary. Please try again.';
            return;
        }

        if (summaryOutputEl) { summaryOutputEl.textContent = ''; showTypingIndicator('aiSummaryOutput'); }
        if (staticSummaryEl) staticSummaryEl.textContent = '';

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let isErrorEvent = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();
            for (const line of lines) {
                if (line.startsWith('event: error')) { isErrorEvent = true; continue; }
                if (line === '') { isErrorEvent = false; continue; }
                if (line.startsWith('data: ')) {
                    if (isErrorEvent) {
                        if (summaryOutputEl) summaryOutputEl.textContent = 'Unable to generate summary. Please try again.';
                        // Restore static text on error
                        if (staticSummaryEl && staticSummaryEl.dataset.staticSummary) {
                            staticSummaryEl.textContent = staticSummaryEl.dataset.staticSummary;
                        }
                        isErrorEvent = false;
                        continue;
                    }
                    const chunk = line.slice(6);
                    if (chunk !== '[DONE]' && chunk !== '[CACHED]') {
                        if (summaryOutputEl) summaryOutputEl.textContent += chunk;
                        if (staticSummaryEl) staticSummaryEl.textContent += chunk;
                    }
                }
            }
        }

        hideTypingIndicator('aiSummaryOutput');
    } catch (err) {
        hideTypingIndicator('aiSummaryOutput');
        if (summaryOutputEl) summaryOutputEl.textContent = 'Connection error. Please check your connection and try again.';
        // Restore static summary on connection error
        if (staticSummaryEl && staticSummaryEl.dataset.staticSummary) {
            staticSummaryEl.textContent = staticSummaryEl.dataset.staticSummary;
        }
        console.error('Executive summary stream error:', err);
    }
}

// Requests AI advice for a given dimension using the saved assessment ID
async function requestAIAdvice(dimension) {
    const assessmentId = window._lastSavedAssessmentId;
    if (!assessmentId) {
        alert('Save the assessment first by logging in, then request AI advice.');
        return;
    }

    if (dimension === 'roadmap') {
        await streamRoadmapToElements(assessmentId);
        return;
    }
    if (dimension === 'executive_summary') {
        await streamExecutiveSummaryToElement(assessmentId);
        return;
    }

    const outputIds = {
        cyber: 'aiCyberOutput',
        ai: 'aiReadinessOutput',
        funding: 'aiFundingOutput',
    };
    const outputId = outputIds[dimension];
    if (!outputId) return;
    const apiBase = window.ADVISOR_API_URL || 'http://localhost:8000';
    await streamToElement(`${apiBase}/ai/advice/${assessmentId}/${dimension}`, outputId);
}

function showTypingIndicator(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';
}

function hideTypingIndicator(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const indicator = el.querySelector('.typing-indicator');
    if (indicator) indicator.remove();
}
