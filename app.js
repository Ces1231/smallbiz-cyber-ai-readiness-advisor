/* ── Mobile sidebar ── */
function toggleMobileMenu() {
  document.querySelector('.sidebar').classList.toggle('mobile-open');
  document.getElementById('mobileSidebarOverlay').classList.toggle('open');
}
function closeMobileMenu() {
  document.querySelector('.sidebar').classList.remove('mobile-open');
  document.getElementById('mobileSidebarOverlay').classList.remove('open');
}

/* ── Legal modal ── */
const LEGAL_CONTENT = {
  privacy: {
    title: 'Privacy Policy',
    body: `
      <p><strong>Effective Date: January 1, 2025 &nbsp;|&nbsp; Last Updated: May 2025</strong></p>
      <p>Champtron Systems LLC ("we," "our," or "us") operates the SmallBiz Cyber &amp; AI Readiness Advisor available at champtron-systems.com/smallbiz-ai/ (the "Tool"). This Privacy Policy explains how we handle information when you use the Tool.</p>

      <h4>1. Information We Collect</h4>
      <p>The Tool operates entirely in your browser. All assessment answers and generated outputs are stored locally on your device using your browser's localStorage. <strong>We do not transmit, store, or have access to any data you enter into the Tool.</strong></p>

      <h4>2. No Account Required</h4>
      <p>You are not required to create an account or provide personal information to use the Tool. The Tool does not collect your name, email address, or any personally identifiable information unless you voluntarily contact us.</p>

      <h4>3. Cookies &amp; Analytics</h4>
      <p>The Tool may use standard website analytics (such as Google Analytics or similar) on the champtron-systems.com domain to understand general usage patterns. These analytics do not identify individual users and are governed by the analytics provider's own privacy policy.</p>

      <h4>4. Contact Information</h4>
      <p>If you voluntarily contact us at <a href="mailto:support@champtron-systems.com">support@champtron-systems.com</a>, we will use your email solely to respond to your inquiry and will not share it with third parties.</p>

      <h4>5. Data Security</h4>
      <p>Because all data is stored locally in your browser, you are in full control. You can clear your assessment data at any time by clearing your browser's localStorage or using the reset functions within the Tool.</p>

      <h4>6. Children's Privacy</h4>
      <p>The Tool is not directed to children under the age of 13. We do not knowingly collect personal information from children.</p>

      <h4>7. Changes to This Policy</h4>
      <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.</p>

      <h4>8. Contact Us</h4>
      <p>Questions about this Privacy Policy? Email us at <a href="mailto:support@champtron-systems.com">support@champtron-systems.com</a>.</p>
    `
  },
  terms: {
    title: 'Terms of Use',
    body: `
      <p><strong>Effective Date: January 1, 2025 &nbsp;|&nbsp; Last Updated: May 2025</strong></p>
      <p>These Terms of Use govern your access to and use of the SmallBiz Cyber &amp; AI Readiness Advisor (the "Tool") provided by Champtron Systems LLC ("Champtron Systems," "we," or "us").</p>

      <h4>1. Acceptance of Terms</h4>
      <p>By using the Tool, you agree to these Terms. If you do not agree, please do not use the Tool.</p>

      <h4>2. Use of the Tool</h4>
      <p>The Tool is provided free of charge as an educational and informational resource to help small business owners assess their readiness in cybersecurity, AI adoption, and funding. You may use the Tool for your own business planning purposes.</p>

      <h4>3. Not Professional Advice</h4>
      <p>The Tool and its outputs are for informational purposes only and do not constitute legal, financial, cybersecurity, or professional consulting advice. Always consult qualified professionals before making significant business, security, or financial decisions.</p>

      <h4>4. Intellectual Property</h4>
      <p>All content, design, scoring methodology, and generated outputs of the Tool are the property of Champtron Systems LLC. You may download and use outputs for your own business purposes but may not reproduce, resell, or redistribute the Tool or its methodology without written permission.</p>

      <h4>5. Disclaimer of Warranties</h4>
      <p>The Tool is provided "as is" without warranties of any kind, express or implied. We do not guarantee the accuracy, completeness, or fitness for a particular purpose of any scores, recommendations, or generated documents.</p>

      <h4>6. Limitation of Liability</h4>
      <p>To the fullest extent permitted by law, Champtron Systems LLC shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Tool or reliance on its outputs.</p>

      <h4>7. Changes to the Tool</h4>
      <p>We reserve the right to modify, suspend, or discontinue the Tool at any time without notice.</p>

      <h4>8. Governing Law</h4>
      <p>These Terms are governed by the laws of the United States. Any disputes shall be resolved in accordance with applicable federal and state law.</p>

      <h4>9. Contact</h4>
      <p>Questions about these Terms? Email us at <a href="mailto:support@champtron-systems.com">support@champtron-systems.com</a>.</p>
    `
  }
};

function openLegalModal(type) {
  const content = LEGAL_CONTENT[type];
  if (!content) return;
  document.getElementById('legalModalTitle').textContent = content.title;
  document.getElementById('legalModalBody').innerHTML = content.body;
  const modal = document.getElementById('legalModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeLegalModal(e) {
  if (e && e.target !== document.getElementById('legalModal')) return;
  document.getElementById('legalModal').style.display = 'none';
  document.body.style.overflow = '';
}

/* ── Splash overlay ── */
function dismissSplash() {
  const overlay = document.getElementById('splashOverlay');
  if (!overlay) return;
  overlay.classList.add('hiding');
  setTimeout(() => { overlay.remove(); showView('assessments'); }, 420);
}

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

let overallChart, radarChart, implDonutChart;
let latestReport = "";
let latestData = null;
let latestScores = null;
let currentGeneratedDocument = "";

// ─── NAVIGATION ──────────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const viewEl = document.getElementById('view-' + viewId);
  if (viewEl) viewEl.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (navEl) navEl.classList.add('active');

  // close mobile sidebar on navigation
  closeMobileMenu();
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
}

// ─── FORM UTILS ──────────────────────────────────────────
function setValue(id, val) { document.getElementById(id).value = val; }

function loadSample(type) {
  const s = samples[type];
  Object.entries(s).forEach(([k, v]) => setValue(k, v));
  showView('assessments');
}

function pct(vals) { return Math.round((vals.reduce((a, b) => a + Number(b), 0) / (vals.length * 2)) * 100); }

function level(score) {
  if (score >= 80) return "Advanced readiness";
  if (score >= 60) return "Growth-ready foundation";
  if (score >= 40) return "Developing readiness";
  return "High-priority improvement needed";
}

function risk(score) {
  if (score >= 75) return "Low";
  if (score >= 50) return "Moderate";
  return "High";
}

function scoreLabel(score) {
  if (score >= 80) return { label: 'Strong', color: '#34d399' };
  if (score >= 70) return { label: 'Good', color: '#22d3ee' };
  if (score >= 60) return { label: 'Moderate', color: '#facc15' };
  return { label: 'Needs Work', color: '#fb7185' };
}

function li(list, items) { list.innerHTML = items.map(x => `<li>${x}</li>`).join(""); }

// ─── FORM SUBMIT ──────────────────────────────────────────
document.getElementById("assessmentForm").addEventListener("submit", (e) => {
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
  const aiScoreVal = pct([data.ai[2]]);  // AI-specific: just aiUsage, scaled
  const opsScoreVal = pct([data.ai[0], data.ai[1]]);  // operations: tools + automation
  const fundingScoreVal = pct(data.funding);
  const overall = Math.round((cyberScoreVal * 0.30) + (aiScoreVal * 0.20) + (opsScoreVal * 0.20) + (fundingScoreVal * 0.30));

  renderResults(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall);
});

// ─── RENDER RESULTS ───────────────────────────────────────
function renderResults(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall) {
  latestData = data;
  latestScores = { cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall };

  // Show results panel
  const rp = document.getElementById('resultsMainPanel');
  if (rp) rp.style.display = '';

  // Update bars
  setBarScore('cyberBar', 'cyberScore', cyberScoreVal);
  setBarScore('aiBar', 'aiScore', aiScoreVal);
  setBarScore('opsBar', 'opsScore', opsScoreVal);
  setBarScore('fundingBar', 'fundingScore', fundingScoreVal);

  // Maturity
  document.getElementById("maturityLevel").textContent =
    `${level(overall)} • Cyber Risk: ${risk(cyberScoreVal)} • AI Readiness: ${level(aiScoreVal)}`;

  // Recommendations
  const recommendations = [
    cyberScoreVal < 70 ? "Strengthen baseline cybersecurity by enabling MFA, improving backups, and creating simple staff security guidance." : "Maintain current cybersecurity controls and review them quarterly.",
    aiScoreVal < 70 ? "Start with one practical AI workflow such as customer follow-up, document drafting, scheduling, inventory, or reporting." : "Expand AI usage into analytics, customer support, and repeatable business workflows.",
    fundingScoreVal < 70 ? "Organize business documents, service descriptions, policies, and growth goals to improve grant and funding readiness." : "Use current documentation to prepare stronger proposals, capability summaries, and funding applications.",
    "Review the report monthly and convert the roadmap into assigned tasks with clear owners and dates."
  ];

  li(document.getElementById("recommendations"), recommendations);
  li(document.getElementById("industryRecommendations"), industryTips[data.industry] || industryTips.consultant);
  li(document.getElementById("beforeList"), ["Manual or disconnected workflows", "Unclear cybersecurity posture", "No structured AI adoption plan", "Limited funding-readiness evidence"]);
  li(document.getElementById("afterList"), ["Clear readiness dashboard and maturity level", "Prioritized risk-reduction actions", "AI opportunities matched to the business", "30/60/90-day roadmap and exportable report"]);

  const weeklyHours = overall < 50 ? "8–12" : overall < 75 ? "5–8" : "3–5";
  document.getElementById("roiText").textContent = `Estimated operational efficiency upside: ${overall < 50 ? "20–30%" : overall < 75 ? "12–20%" : "8–12%"} with targeted automation and process improvements.`;
  document.getElementById("timeSavings").textContent = `Potential time savings: ${weeklyHours} hours per week by automating repetitive tasks.`;
  document.getElementById("riskReduction").textContent = `Potential risk movement: ${risk(cyberScoreVal)} cyber risk trending toward Low after priority controls are implemented.`;

  document.getElementById("road30").textContent = "Enable MFA, verify backups, document core workflows, and select one AI quick win.";
  document.getElementById("road60").textContent = "Automate one high-value workflow, improve business documentation, and standardize security practices.";
  document.getElementById("road90").textContent = "Measure results, expand AI usage, prepare funding-ready materials, and review readiness score improvements.";

  // Growth roadmap duplicates
  const gr30 = document.getElementById("growthRoad30");
  const gr60 = document.getElementById("growthRoad60");
  const gr90 = document.getElementById("growthRoad90");
  if (gr30) gr30.textContent = "Enable MFA, verify backups, document core workflows, and select one AI quick win.";
  if (gr60) gr60.textContent = "Automate one high-value workflow, improve business documentation, and standardize security practices.";
  if (gr90) gr90.textContent = "Measure results, expand AI usage, prepare funding-ready materials, and review readiness score improvements.";

  // Executive summary
  const execText = `${data.businessName} completed a readiness assessment for cybersecurity, AI adoption, and funding preparedness. The business scored ${overall}% overall, with ${cyberScoreVal}% cyber readiness, ${aiScoreVal}% AI readiness, ${opsScoreVal}% operational readiness, and ${fundingScoreVal}% funding readiness. The assessment identified practical opportunities to reduce risk, improve efficiency, and create a structured roadmap for growth.`;
  document.getElementById("executiveSummary").textContent = execText;

  renderActionCenter(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall);
  renderFundingPrep(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
  renderFinalBusinessTools(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall);
  updateDashboard(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall);

  latestReport = buildReportText(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall, recommendations, execText);

  populateProfileView(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall);
  showView('dashboard');
}

function setBarScore(barId, scoreId, val) {
  const bar = document.getElementById(barId);
  const score = document.getElementById(scoreId);
  if (bar) bar.style.width = `${val}%`;
  if (score) score.textContent = `${val}%`;
}

// ─── DASHBOARD UPDATE ─────────────────────────────────────
function updateDashboard(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall) {
  // Overall gauge chart
  const overallCtx = document.getElementById("overallChart");
  if (overallChart) overallChart.destroy();
  const overallSL = scoreLabel(overall);
  overallChart = new Chart(overallCtx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [overall, 100 - overall],
        backgroundColor: [overallSL.color, 'rgba(255,255,255,0.05)'],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      cutout: "76%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 800 }
    }
  });

  document.getElementById("overallGaugeLabel").textContent = `${overall}%`;
  document.getElementById("overallGaugeLabel").style.color = overallSL.color;
  document.getElementById("overallStatus").textContent = overallSL.label;
  document.getElementById("overallStatus").style.color = overallSL.color;
  document.getElementById("overallHint").textContent = overall >= 80 ? "Keep going! You're on the right track." : overall >= 60 ? "Good progress. Keep improving." : "Focus on top priority actions.";

  // Score cards
  updateScoreCard('dashCyberVal', 'dashCyberStatus', 'dashCyberHint', cyberScoreVal, 'Focus on strengthening access control.');
  updateScoreCard('dashAIVal', 'dashAIStatus', 'dashAIHint', aiScoreVal, 'Explore more AI tools and training.');
  updateScoreCard('dashOpsVal', 'dashOpsStatus', 'dashOpsHint', opsScoreVal, 'Great! Keep optimizing your operations.');
  updateScoreCard('dashFundVal', 'dashFundStatus', 'dashFundHint', fundingScoreVal, 'Improve documentation and financials.');

  // Radar chart
  const radarCtx = document.getElementById("radarChart");
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(radarCtx, {
    type: "radar",
    data: {
      labels: ["Cybersecurity", "AI Readiness", "Operations", "Funding Readiness", "Business Profile"],
      datasets: [{
        data: [cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, Math.round((cyberScoreVal + fundingScoreVal) / 2)],
        backgroundColor: "rgba(34,211,238,0.1)",
        borderColor: "rgba(34,211,238,0.7)",
        pointBackgroundColor: "#22d3ee",
        pointRadius: 4,
        borderWidth: 2
      }]
    },
    options: {
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 9 }, stepSize: 25, backdropColor: 'transparent' },
          grid: { color: 'rgba(255,255,255,0.1)' },
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#7a9bbf', font: { size: 10 } }
        }
      },
      plugins: { legend: { display: false } },
      animation: { duration: 800 }
    }
  });

  // Priority actions
  renderDashPriorityActions(cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal);

  // Business profile
  document.getElementById("dashBizName").textContent = data.businessName;
  document.getElementById("dashBizIndustry").textContent = capitalizeFirst(data.industry);
  document.getElementById("dashLastAssess").textContent = new Date().toLocaleDateString();
  const mainName = document.getElementById("dashBizNameMain");
  if (mainName) mainName.textContent = data.businessName;

  // Cash flow defaults
  updateDashCashFlow();

  // Implementation donut
  updateImplDonut();

  // Next steps
  renderDashNextSteps(cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal);
}

function updateScoreCard(valId, statusId, hintId, score, defaultHint) {
  const sl = scoreLabel(score);
  const valEl = document.getElementById(valId);
  const statusEl = document.getElementById(statusId);
  const hintEl = document.getElementById(hintId);
  if (valEl) { valEl.textContent = `${score}%`; valEl.style.color = sl.color; }
  if (statusEl) { statusEl.textContent = sl.label; statusEl.style.color = sl.color; }
  if (hintEl) hintEl.textContent = score >= 80 ? "Great! Keep optimizing." : defaultHint;
}

function renderDashPriorityActions(cyber, ai, ops, funding) {
  const actions = [];
  if (cyber < 70) {
    actions.push({ icon: '🔒', text: 'Implement Multi-Factor Authentication (MFA)', level: 'High' });
    actions.push({ icon: '☁️', text: 'Set Up Automated Backups', level: 'High' });
  }
  if (cyber < 80) {
    actions.push({ icon: '🛡️', text: 'Create a Written Cybersecurity Policy', level: cyber < 60 ? 'High' : 'Medium' });
  }
  if (ai < 60) {
    actions.push({ icon: '🤖', text: 'AI Tools Training for Your Team', level: 'Medium' });
  }
  if (funding < 70) {
    actions.push({ icon: '📄', text: 'Prepare Financial Documents for Funding', level: funding < 50 ? 'High' : 'Low' });
  }
  if (ops < 60) {
    actions.push({ icon: '⚙️', text: 'Implement Digital Operations Tools', level: 'Medium' });
  }
  if (actions.length === 0) {
    actions.push({ icon: '✅', text: 'Maintain current controls and review quarterly', level: 'Low' });
    actions.push({ icon: '📈', text: 'Expand AI usage into new workflows', level: 'Low' });
  }

  const top5 = actions.slice(0, 5);
  const badgeClass = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
  document.getElementById("dashPriorityList").innerHTML = top5.map(a =>
    `<div class="priority-item" onclick="showView('action-plan')">
      <span class="priority-item-icon">${a.icon}</span>
      <span class="priority-item-text">${a.text}</span>
      <span class="priority-badge ${badgeClass[a.level]}">${a.level}</span>
      <span class="priority-arrow">›</span>
    </div>`
  ).join("");
}

function renderDashNextSteps(cyber, ai, ops, funding) {
  const steps = [];
  if (cyber < 70 || ai < 70) steps.push("Complete remaining high priority actions");
  if (funding < 70) steps.push("Improve funding documentation");
  steps.push("Reassess in 30 days");
  steps.push("Review and update action plan");
  if (ops < 70) steps.push("Implement digital operations tools");

  document.getElementById("dashNextSteps").innerHTML = steps.slice(0, 4).map(s =>
    `<div class="next-step-item"><div class="step-check">✓</div><span>${s}</span></div>`
  ).join("");
}

function updateDashCashFlow() {
  const rev = Number(document.getElementById("monthlyRevenue")?.value || 0);
  const exp = Number(document.getElementById("monthlyExpenses")?.value || 0);
  const cash = Number(document.getElementById("cashOnHand")?.value || 0);
  const net = rev - exp;
  const runway = exp > 0 ? (cash / exp) : 0;

  const revEl = document.getElementById("dashRevenue");
  const expEl = document.getElementById("dashExpenses");
  const netEl = document.getElementById("dashNetCash");
  const runEl = document.getElementById("dashRunway");

  if (revEl) revEl.textContent = rev > 0 ? `$${rev.toLocaleString()}` : "—";
  if (expEl) expEl.textContent = exp > 0 ? `$${exp.toLocaleString()}` : "—";
  if (netEl) { netEl.textContent = rev > 0 ? `$${net.toLocaleString()}` : "—"; netEl.className = `cash-val ${net >= 0 ? 'green' : 'red'}`; }
  if (runEl && rev > 0) runEl.textContent = `Runway: ${runway.toFixed(1)} Months`;
}

function updateImplDonut() {
  const tasks = 8;
  const saved = JSON.parse(localStorage.getItem("smallbizImplementationTracker") || "{}");
  const taskList = ["Enable MFA on critical accounts","Confirm backups and test restore","Document top 3 business workflows","Choose one AI automation quick win","Create business profile and funding summary","Generate cybersecurity or AI usage policy","Review monthly cash-flow snapshot","Reassess readiness in 30 days"];
  const done = taskList.filter(t => saved[t]).length;
  const inProg = Math.min(done > 0 ? 2 : 1, tasks - done);
  const planned = tasks - done - inProg;
  const pctDone = Math.round((done / tasks) * 100);

  const implCtx = document.getElementById("implDonutChart");
  if (implDonutChart) implDonutChart.destroy();
  implDonutChart = new Chart(implCtx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [done, inProg, planned],
        backgroundColor: ['#34d399', '#facc15', 'rgba(255,255,255,0.08)'],
        borderWidth: 0,
        borderRadius: 2
      }]
    },
    options: {
      cutout: "72%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 600 }
    }
  });

  document.getElementById("implDonutPct").textContent = `${pctDone}%`;
  document.getElementById("implCompleted").textContent = done;
  document.getElementById("implInProgress").textContent = inProg;
  document.getElementById("implPlanned").textContent = planned;
  document.getElementById("implSubLabel").textContent = `${done} of ${tasks} actions completed`;
}

function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── ACTION CENTER ────────────────────────────────────────
function renderActionCenter(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall) {
  const first = [], next = [], later = [];

  if (cyberScoreVal < 70) {
    first.push("Enable MFA on email, banking, cloud apps, and admin accounts.");
    first.push("Confirm backups exist and test restoring one important file.");
  } else {
    next.push("Schedule a quarterly cybersecurity review.");
  }

  if (aiScoreVal < 70) {
    first.push("Choose one repetitive workflow to automate with AI.");
    next.push("Create an internal AI usage guideline for staff.");
  } else {
    next.push("Expand AI into customer follow-up, reporting, or analytics.");
  }

  if (fundingScoreVal < 70) {
    first.push("Organize business documents, service descriptions, and growth goals.");
    next.push("Create a reusable grant/funding readiness folder.");
  } else {
    later.push("Use current documentation to apply for funding, partnerships, or contract opportunities.");
  }

  next.push("Track progress weekly and update the readiness score every 30 days.");
  later.push("Evaluate paid tools or professional help after the free and low-cost steps are complete.");
  later.push("Convert the roadmap into monthly operating goals.");

  li(document.getElementById("doFirst"), first.slice(0, 4));
  li(document.getElementById("doNext"), next.slice(0, 4));
  li(document.getElementById("doLater"), later.slice(0, 4));

  const costs = [
    ["Free", "Enable MFA, review passwords, organize files, document workflows, use free AI prompts."],
    ["Low cost", "Password manager, cloud backup, basic CRM, scheduling tool, domain email security."],
    ["Medium cost", "Managed endpoint protection, paid AI tools, accounting automation, policy templates."],
    ["Requires professional help", "Security assessment, compliance planning, cloud migration, custom automation."]
  ];
  document.getElementById("costLevels").innerHTML = costs.map(c =>
    `<div class="cost-item"><strong>${c[0]}</strong><span>${c[1]}</span></div>`
  ).join("");

  const tools = [
    ["Password manager", "Centralize strong passwords and reduce account takeover risk."],
    ["Backup tool", "Protect customer records, financial files, and operating documents."],
    ["AI scheduling tool", "Reduce missed appointments and manual coordination."],
    ["CRM", "Track leads, customers, follow-ups, and growth opportunities."],
    ["Accounting/invoicing", "Improve billing, cash-flow visibility, and tax organization."]
  ];
  document.getElementById("toolRecommendations").innerHTML = tools.map(t =>
    `<div class="tool-item"><strong>${t[0]}</strong><span>${t[1]}</span></div>`
  ).join("");

  const risks = [];
  if (cyberScoreVal < 70) risks.push(["Weak cybersecurity controls", "Account compromise, data loss, business interruption", "High", "Enable MFA, backups, endpoint protection, and basic security training."]);
  if (aiScoreVal < 70) risks.push(["No clear AI adoption plan", "Missed productivity gains and slower customer response", "Medium", "Start with one low-risk AI use case and document acceptable usage."]);
  if (fundingScoreVal < 70) risks.push(["Incomplete business readiness documents", "Weaker grant, partnership, and contract applications", "Medium", "Create a grant readiness folder with mission, services, customers, goals, and financial basics."]);
  risks.push(["Manual processes", "Lost time, inconsistent service, and limited scalability", overall < 60 ? "High" : "Medium", "Automate scheduling, reporting, customer follow-up, or invoicing first."]);
  risks.push(["Limited reassessment process", "No visibility into improvement over time", "Low", "Save baseline score and reassess every 30 days."]);

  document.getElementById("riskRegister").innerHTML = risks.map(r => {
    const cls = r[2] === "High" ? "priority-high" : r[2] === "Medium" ? "priority-medium" : "priority-low";
    return `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="${cls}">${r[2]}</td><td>${r[3]}</td></tr>`;
  }).join("");

  updateBaselineStatus();
}

// ─── DOCUMENT GENERATOR ──────────────────────────────────
function getBusinessName() {
  return latestData?.businessName || document.getElementById("businessName")?.value || "Your Business";
}

function generateDocument(type) {
  const name = getBusinessName();
  const today = new Date().toLocaleDateString();
  const industryName = latestData?.industry || document.getElementById("industry")?.value || "small business";
  const doc = buildDocContent(type, name, today, industryName);
  currentGeneratedDocument = doc;
  const el1 = document.getElementById("generatedDocument");
  const el2 = document.getElementById("generatedDocument2");
  if (el1) el1.value = doc;
  if (el2) el2.value = doc;
}

function buildDocContent(type, name, today, industryName) {
  const docs = {
    cyber: `BASIC CYBERSECURITY POLICY\n\nBusiness: ${name}\nDate: ${today}\n\nPurpose:\nThis policy establishes basic cybersecurity practices to protect business systems, customer information, financial records, and operating data.\n\nMinimum Practices:\n1. Require multi-factor authentication for email, banking, cloud tools, and administrator accounts.\n2. Use strong, unique passwords and a password manager.\n3. Back up important business files and test restore capability monthly.\n4. Keep computers, phones, browsers, and business software updated.\n5. Limit access to customer, financial, and employee records based on business need.\n6. Train employees and contractors to identify phishing, suspicious links, and fraudulent requests.\n7. Report suspicious activity immediately to the business owner or designated contact.\n\nMonthly Review:\nReview user access, backup status, software updates, and any security incidents every 30 days.`,
    ai: `AI USAGE POLICY\n\nBusiness: ${name}\nDate: ${today}\n\nPurpose:\nThis policy helps the business use AI tools safely, responsibly, and productively.\n\nApproved Uses:\n1. Drafting emails, marketing copy, customer messages, checklists, and summaries.\n2. Brainstorming operational improvements and workflow automation ideas.\n3. Creating first drafts of business documents that are reviewed by a human.\n\nRestricted Uses:\n1. Do not upload sensitive customer data, passwords, financial account numbers, or confidential contracts into public AI tools.\n2. Do not rely on AI output without human review.\n3. Do not use AI to make final legal, tax, medical, or employment decisions without qualified review.\n\nReview Process:\nAll AI-generated business content should be reviewed for accuracy, tone, privacy, and compliance before use.`,
    bcp: `BUSINESS CONTINUITY CHECKLIST\n\nBusiness: ${name}\nDate: ${today}\n\nObjective:\nHelp the business continue operations during outages, cyber incidents, staffing disruptions, or vendor issues.\n\nChecklist:\n[ ] Identify critical systems: email, phones, payment systems, website, accounting, scheduling, and customer records.\n[ ] Maintain a current emergency contact list.\n[ ] Back up important files and test recovery monthly.\n[ ] Document how to operate manually if key systems are unavailable.\n[ ] Identify backup vendors or alternate tools.\n[ ] Create a customer communication plan for service disruptions.\n[ ] Store insurance, banking, license, and business registration documents in a secure location.\n[ ] Review this checklist every 30 days.\n\nPriority Recovery Order:\n1. Customer communication\n2. Payment/invoicing\n3. Scheduling/order fulfillment\n4. Financial/accounting records\n5. Website/marketing channels`,
    grant: `GRANT READINESS CHECKLIST\n\nBusiness: ${name}\nDate: ${today}\n\nCore Business Information:\n[ ] Legal business name\n[ ] Business address and contact information\n[ ] Website or portfolio link\n[ ] Business mission statement\n[ ] Description of products/services\n[ ] Customer or community served\n[ ] Problem the business solves\n[ ] Business goals for the next 12 months\n\nSupporting Materials:\n[ ] Business registration documents\n[ ] Tax or EIN information, if applicable\n[ ] Budget estimate for requested funds\n[ ] Use-of-funds explanation\n[ ] Photos, demo link, or proof of work\n[ ] Customer examples or testimonials, if available\n[ ] LinkedIn, GitHub, or portfolio link, if applicable\n\nRecommended Grant Narrative:\n${name} serves the ${industryName} market by addressing practical business needs through improved operations, technology readiness, and growth planning. Grant funding would help strengthen the business, improve service delivery, and expand its ability to support customers and the community.`
  };
  return docs[type] || "";
}

function downloadGeneratedDocument() {
  const content = currentGeneratedDocument || document.getElementById("generatedDocument")?.value || "Generate a document first.";
  downloadTextFile(content, "smallbiz-generated-document.txt");
}

function downloadGeneratedDocument2() {
  const content = currentGeneratedDocument || document.getElementById("generatedDocument2")?.value || "Generate a document first.";
  downloadTextFile(content, "smallbiz-generated-document.txt");
}

// ─── BASELINE / REASSESSMENT ──────────────────────────────
function saveBaseline() {
  if (!latestScores) { alert("Run the assessment first, then save the baseline."); return; }
  localStorage.setItem("smallbizAdvisorBaseline", JSON.stringify({
    date: new Date().toISOString(),
    businessName: getBusinessName(),
    scores: latestScores
  }));
  updateBaselineStatus();
}

function compareBaseline() {
  const raw = localStorage.getItem("smallbizAdvisorBaseline");
  if (!raw) { alert("No baseline saved yet."); return; }
  if (!latestScores) { alert("Run the assessment again before comparing progress."); return; }
  const baseline = JSON.parse(raw);
  const diff = latestScores.overall - baseline.scores.overall;
  const word = diff >= 0 ? "improved" : "decreased";
  document.getElementById("baselineStatus").textContent = `Baseline: ${baseline.scores.overall}% saved for ${baseline.businessName}. Current: ${latestScores.overall}%. Overall readiness ${word} by ${Math.abs(diff)} points.`;
}

function updateBaselineStatus() {
  const el = document.getElementById("baselineStatus");
  if (!el) return;
  const raw = localStorage.getItem("smallbizAdvisorBaseline");
  if (!raw) { el.textContent = "No baseline saved yet. Save today's score and reassess in 30 days."; return; }
  const baseline = JSON.parse(raw);
  const date = new Date(baseline.date).toLocaleDateString();
  el.textContent = `Saved baseline for ${baseline.businessName}: ${baseline.scores.overall}% overall readiness on ${date}. Recheck in 30 days to show improvement.`;
}

// ─── FUNDING PREP ─────────────────────────────────────────
function renderFundingPrep(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall) {
  const docsScore = Number(document.getElementById("documents").value);
  const onlineScore = Number(document.getElementById("onlinePresence").value);
  const growthScore = Number(document.getElementById("growthPlan").value);
  const demoReady = aiScoreVal >= 40 || onlineScore >= 1;
  const problemReady = (data.challenge || "").length > 25;
  const useFundsReady = fundingScoreVal >= 50;

  const opportunity = Math.round((fundingScoreVal * 0.45) + (onlineScore / 2 * 100 * 0.15) + (growthScore / 2 * 100 * 0.15) + (problemReady ? 15 : 0) + (demoReady ? 10 : 0));
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
    ["Target customers clearly described", true],
    ["Problem statement is specific", problemReady],
    ["Website, demo, or online proof available", onlineScore >= 1],
    ["Growth goals or roadmap documented", growthScore >= 1],
    ["Use-of-funds explanation can be created", useFundsReady],
    ["Business documents organized", docsScore >= 1]
  ];
  document.getElementById("fundingChecklist").innerHTML = checklist.map(([txt, ok]) =>
    `<li><span class="${ok ? "good" : "warn"}">${ok ? "✓" : "!"}</span> ${txt}</li>`
  ).join("");

  const gaps = [];
  if (!problemReady) gaps.push(["Weak problem statement", "Make the business challenge more specific and measurable."]);
  if (onlineScore < 1) gaps.push(["No strong online proof", "Add a live demo, website, portfolio, or walkthrough video."]);
  if (growthScore < 1) gaps.push(["No clear growth plan", "Create a 30/60/90-day roadmap and explain expected outcomes."]);
  if (docsScore < 1) gaps.push(["Documents not organized", "Prepare mission, services, customers, budget, and use-of-funds materials."]);
  if (fundingScoreVal < 60) gaps.push(["Funding readiness is below target", "Strengthen business profile, budget, and operational documentation before applying."]);
  if (gaps.length === 0) gaps.push(["No major gaps detected", "Continue polishing the demo, report, and application narrative."]);

  document.getElementById("gapAlerts").innerHTML = gaps.map(g =>
    `<li><span class="${g[0].includes("No major") ? "good" : "alert"}">${g[0].includes("No major") ? "✓" : "!"}</span> <strong>${g[0]}:</strong> ${g[1]}</li>`
  ).join("");
}

function businessSummaryText() {
  const name = latestData?.businessName || document.getElementById("businessName").value || "the business";
  const industryName = latestData?.industry || document.getElementById("industry").value || "small business";
  const challengeText = latestData?.challenge || document.getElementById("challenge").value || "improving operations, technology readiness, and business growth";
  return { name, industryName, challengeText };
}

function buildApplicationAnswer() {
  const q = document.getElementById("answerQuestion").value;
  const { name, industryName, challengeText } = businessSummaryText();
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

function downloadApplicationAnswer() {
  const content = document.getElementById("applicationAnswer").value || "Generate an application answer first.";
  downloadTextFile(content, "application-answer.txt");
}

function buildBusinessProfile() {
  const { name, industryName, challengeText } = businessSummaryText();
  const cyber = latestScores?.cyberScoreVal ?? 0;
  const ai = latestScores?.aiScoreVal ?? 0;
  const ops = latestScores?.opsScoreVal ?? 0;
  const funding = latestScores?.fundingScoreVal ?? 0;
  const overall = latestScores?.overall ?? 0;

  const profile = `ONE-PAGE BUSINESS PROFILE\n\nBusiness Name:\n${name}\n\nIndustry:\n${industryName}\n\nBusiness Summary:\n${name} is a small business focused on improving operations, customer service, and long-term growth through stronger technology readiness, practical cybersecurity practices, and responsible AI adoption.\n\nTarget Customer:\nThe business serves customers in the ${industryName} market who need reliable, accessible, and professional support.\n\nProblem Being Solved:\n${challengeText}\n\nUnique Value:\nThe business is focused on practical execution, customer trust, and continuous improvement. By strengthening cybersecurity, AI readiness, and operational systems, it can deliver better service while preparing for growth opportunities.\n\nReadiness Snapshot:\n- Overall Readiness: ${overall}%\n- Cybersecurity Readiness: ${cyber}%\n- AI Readiness: ${ai}%\n- Operational Readiness: ${ops}%\n- Funding / Opportunity Readiness: ${funding}%\n\nGrowth Goals:\n1. Improve operational efficiency.\n2. Reduce business and cybersecurity risk.\n3. Adopt AI responsibly for practical workflows.\n4. Organize business information for funding, partnerships, and marketplace opportunities.\n5. Build a repeatable roadmap for long-term growth.\n\nBuilt by Champtron Systems LLC.`;

  // Write to both profile view textarea and funding view textarea
  const ta1 = document.getElementById("businessProfile");
  const ta2 = document.getElementById("businessProfileFunding");
  if (ta1) ta1.value = profile;
  if (ta2) ta2.value = profile;
}

function downloadBusinessProfile() {
  const ta1 = document.getElementById("businessProfile");
  const ta2 = document.getElementById("businessProfileFunding");
  const content = (ta1 && ta1.value) || (ta2 && ta2.value) || "Generate a business profile first.";
  downloadTextFile(content, "business-profile.txt");
}

// ─── FINAL BUSINESS TOOLS ─────────────────────────────────
function renderFinalBusinessTools(data, cyberScoreVal, aiScoreVal, fundingScoreVal, overall) {
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

  const growthIdeas = {
    restaurant: ["Launch a customer review request workflow after visits.", "Use simple loyalty offers for repeat customers.", "Create weekly social posts around specials, catering, and community involvement."],
    barber: ["Automate appointment reminders to reduce no-shows.", "Create a referral reward for existing clients.", "Use before-and-after photo content to drive social engagement."],
    nonprofit: ["Build a monthly donor communication calendar.", "Create a simple impact story template for grants and donors.", "Segment donors, volunteers, and community partners for better outreach."],
    contractor: ["Create follow-up messages for estimates and completed jobs.", "Build a referral ask into every completed project.", "Use project photos and customer reviews to strengthen credibility."],
    online: ["Recover abandoned carts with follow-up emails.", "Use customer questions to create product content.", "Segment customers by purchase history for repeat sales."],
    consultant: ["Create a lead magnet or one-page capability profile.", "Automate follow-up after consultations.", "Publish short educational posts that solve customer pain points."],
    retail: ["Create a customer loyalty list.", "Promote seasonal bundles and top sellers.", "Use customer feedback to guide inventory and marketing."]
  };
  const industryName = data.industry || "consultant";
  document.getElementById("growthPlanner").innerHTML = (growthIdeas[industryName] || growthIdeas.consultant).map(x => `<li>${x}</li>`).join("");

  calculateCashFlow();
}

function updateTracker(taskEncoded, checked) {
  const task = decodeURIComponent(taskEncoded);
  const saved = JSON.parse(localStorage.getItem("smallbizImplementationTracker") || "{}");
  saved[task] = checked;
  localStorage.setItem("smallbizImplementationTracker", JSON.stringify(saved));
  updateTrackerPercent();
  updateImplDonut();
}

function updateTrackerPercent() {
  const boxes = Array.from(document.querySelectorAll("#implementationTracker input[type='checkbox']"));
  if (!boxes.length) { document.getElementById("trackerPercent").textContent = "0%"; return; }
  const done = boxes.filter(b => b.checked).length;
  document.getElementById("trackerPercent").textContent = `${Math.round((done / boxes.length) * 100)}%`;
}

function calculateCashFlow() {
  const rev = Number(document.getElementById("monthlyRevenue")?.value || 0);
  const exp = Number(document.getElementById("monthlyExpenses")?.value || 0);
  const cash = Number(document.getElementById("cashOnHand")?.value || 0);
  const reserve = Number(document.getElementById("reserveGoal")?.value || 0);
  const net = rev - exp;
  const runway = exp > 0 ? (cash / exp) : 0;
  let cls = "cash-good", label = "Healthy", guidance = "Continue monitoring cash monthly and consider reinvesting in automation, security, and customer growth.";
  if (net < 0 || runway < 1) {
    cls = "cash-risk"; label = "High attention";
    guidance = "Reduce expenses, improve collections, delay non-essential spending, and prioritize revenue-generating actions.";
  } else if (runway < 3 || cash < reserve) {
    cls = "cash-watch"; label = "Watch closely";
    guidance = "Build reserves, review expenses, and prioritize low-cost improvements before larger investments.";
  }

  const result = document.getElementById("cashFlowResult");
  if (result) result.innerHTML = `
    <p><strong>Monthly Net:</strong> $${net.toLocaleString()}</p>
    <p><strong>Estimated Runway:</strong> ${runway.toFixed(1)} months</p>
    <p><strong>Status:</strong> <span class="${cls}">${label}</span></p>
    <p>${guidance}</p>
  `;

  updateDashCashFlow();
}

// ─── REPORT DOWNLOAD ──────────────────────────────────────
function buildReportText(data, cyber, ai, ops, funding, overall, recommendations, execText) {
  return `SmallBiz Cyber & AI Readiness Advisor Report
Generated: ${new Date().toLocaleString()}

Business: ${data.businessName}
Industry: ${data.industry}
Primary Challenge: ${data.challenge}

Scores:
- Overall Readiness: ${overall}%
- Cybersecurity Readiness: ${cyber}%
- AI Readiness: ${ai}%
- Operational Readiness: ${ops}%
- Funding / Contract Readiness: ${funding}%

Executive Summary:
${execText}

AI Suggested Next Steps:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Industry-Specific Recommendations:
${(industryTips[data.industry] || industryTips.consultant).map((r, i) => `${i + 1}. ${r}`).join("\n")}

30/60/90-Day Roadmap:
30 Days: Enable MFA, verify backups, document core workflows, and select one AI quick win.
60 Days: Automate one high-value workflow, improve business documentation, and standardize security practices.
90 Days: Measure results, expand AI usage, prepare funding-ready materials, and review readiness score improvements.

Built by Champtron Systems LLC.`;
}

function downloadReport() {
  const blob = new Blob([latestReport || "Run the assessment first."], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "smallbiz-cyber-ai-readiness-report.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── BUSINESS PROFILE VIEW ───────────────────────────────
function populateProfileView(data, cyberScoreVal, aiScoreVal, opsScoreVal, fundingScoreVal, overall) {
  const empty = document.getElementById('profileEmptyState');
  const populated = document.getElementById('profilePopulated');
  if (empty) empty.style.display = 'none';
  if (populated) populated.style.display = 'block';

  // Header
  const n = document.getElementById('profName');
  const ind = document.getElementById('profIndustry');
  if (n) n.textContent = data.businessName;
  if (ind) ind.textContent = capitalizeFirst(data.industry) + ' · Small Business (1-10)';

  // Score snapshot row
  const scores = [
    { label: 'Overall', val: overall, color: scoreLabel(overall).color },
    { label: 'Cybersecurity', val: cyberScoreVal, color: '#22d3ee' },
    { label: 'AI Readiness', val: aiScoreVal, color: '#a78bfa' },
    { label: 'Operational', val: opsScoreVal, color: '#34d399' },
    { label: 'Funding', val: fundingScoreVal, color: '#facc15' }
  ];
  const scoreRow = document.getElementById('profScoreRow');
  if (scoreRow) {
    scoreRow.innerHTML = scores.map(s => {
      const sl = scoreLabel(s.val);
      return `<div class="profile-score-card">
        <div class="ps-label">${s.label}</div>
        <div class="ps-val" style="color:${s.color}">${s.val}%</div>
        <div class="ps-status" style="color:${s.color}">${sl.label}</div>
      </div>`;
    }).join('');
  }

  // Details table
  const table = document.getElementById('profDetailsTable');
  if (table) {
    const rows = [
      ['Business Name', data.businessName],
      ['Industry', capitalizeFirst(data.industry)],
      ['Business Size', 'Small Business (1-10)'],
      ['Assessment Date', new Date().toLocaleDateString()],
      ['MFA Status', ['Not enabled', 'Some accounts', 'Most critical accounts'][Number(document.getElementById('mfa').value)]],
      ['Backups', ['Not in place', 'Partial / manual', 'Automated & tested'][Number(document.getElementById('backups').value)]],
      ['AI Usage', ['None', 'Testing', 'Actively using'][Number(document.getElementById('aiUsage').value)]],
      ['Online Presence', ['None/weak', 'Basic', 'Strong'][Number(document.getElementById('onlinePresence').value)]]
    ];
    table.innerHTML = rows.map(([k, v]) =>
      `<tr class="prof-table-row"><td>${k}</td><td>${v}</td></tr>`
    ).join('');
  }

  // Challenge + industry tips
  const ch = document.getElementById('profChallenge');
  if (ch) ch.textContent = data.challenge || 'Not specified.';

  const tips = document.getElementById('profIndustryTips');
  if (tips) li(tips, industryTips[data.industry] || industryTips.consultant);

  // Readiness bars
  const barsWrap = document.getElementById('profBarsWrap');
  if (barsWrap) {
    const bars = [
      { label: 'Cybersecurity', val: cyberScoreVal, color: '#22d3ee' },
      { label: 'AI Readiness', val: aiScoreVal, color: '#a78bfa' },
      { label: 'Operational', val: opsScoreVal, color: '#34d399' },
      { label: 'Funding', val: fundingScoreVal, color: '#facc15' }
    ];
    barsWrap.innerHTML = bars.map(b => `
      <div class="bar-row">
        <span class="bar-label">${b.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${b.val}%; background:linear-gradient(90deg,${b.color},${b.color}88)"></div></div>
        <b class="bar-val" style="color:${b.color}">${b.val}%</b>
      </div>`).join('');
  }

  // Auto-generate the profile text
  buildBusinessProfile();
}

// ─── SCORE EXPLAIN CARDS ─────────────────────────────────
function toggleScoreCard(el) {
  // Walk up to find the actual .score-explain-card (handles clicks from children)
  const card = el.closest('.score-explain-card');
  if (!card) return;
  const wasOpen = card.classList.contains('open');
  // Close all cards in this grid
  document.querySelectorAll('.score-explain-card.open')
      .forEach(c => c.classList.remove('open'));
  // Open clicked card if it was closed
  if (!wasOpen) card.classList.add('open');
}

// ─── FAQ ACCORDION ────────────────────────────────────────
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

// ─── INIT ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  updateImplDonut();
  calculateCashFlow();
});
