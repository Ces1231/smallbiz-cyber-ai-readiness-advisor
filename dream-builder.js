// ── Dream Builder — SmallBiz Advisor ─────────────────────────────────────────
// Vanilla JS — no framework, no build step.
// Requires: api-client.js, auth.js, Stripe.js

// ── State ─────────────────────────────────────────────────────────────────────
window._db = {
  step: 'quiz',
  quizPage: 1,
  quizAnswers: {
    skills: [],
    problems: [],
    business_type: null,
    starting_capital: null,
    weekly_hours: null,
  },
  suggestions: [],
  businessIdeaId: null,
  selectedIdeaIndex: 0,
  savedIdea: null,
  purchases: {
    launch_builder: false,
    launch_packet_pro: false,
    advisor_review: false,
  },
  stripe: null,
  stripeElements: null,
  paymentElement: null,
  activeProductKey: null,
  fullPlanLoaded: false,
  proPlanLoaded: false,
};

// ── Question Definitions ──────────────────────────────────────────────────────

var SKILLS_OPTIONS = [
  { key: 'computers_tech', label: 'Computers & Tech' },
  { key: 'sales_marketing', label: 'Sales & Marketing' },
  { key: 'writing_content', label: 'Writing & Content' },
  { key: 'design_creative', label: 'Design & Creative' },
  { key: 'teaching_coaching', label: 'Teaching & Coaching' },
  { key: 'cooking_food', label: 'Cooking & Food' },
  { key: 'trades_repair', label: 'Trades & Repair' },
  { key: 'healthcare_wellness', label: 'Healthcare & Wellness' },
  { key: 'finance_accounting', label: 'Finance & Accounting' },
  { key: 'management_leadership', label: 'Management & Leadership' },
  { key: 'customer_service', label: 'Customer Service' },
  { key: 'languages', label: 'Languages' },
  { key: 'music_arts', label: 'Music & Arts' },
  { key: 'sports_fitness', label: 'Sports & Fitness' },
  { key: 'childcare_education', label: 'Childcare & Education' },
];

var PROBLEMS_OPTIONS = [
  { key: 'save_time', label: 'Help people save time' },
  { key: 'save_money', label: 'Help people save money' },
  { key: 'reduce_stress', label: 'Reduce stress for others' },
  { key: 'learn_something', label: 'Help people learn something new' },
  { key: 'improve_health', label: 'Improve health & wellbeing' },
  { key: 'find_community', label: 'Build community & connection' },
  { key: 'get_entertainment', label: 'Provide entertainment' },
  { key: 'solve_tech_problem', label: 'Solve a tech problem' },
  { key: 'improve_home', label: 'Improve home & living' },
  { key: 'grow_business', label: 'Help businesses grow' },
  { key: 'get_professional_services', label: 'Provide professional services' },
  { key: 'get_local_services', label: 'Provide local services' },
];

var BUSINESS_TYPE_OPTIONS = [
  { key: 'service', label: 'Service Business', sub: 'I provide a service (consulting, cleaning, repairs...)' },
  { key: 'product', label: 'Product Business', sub: 'I sell a physical or digital product' },
  { key: 'online', label: 'Online Business', sub: 'I operate entirely online' },
  { key: 'local', label: 'Local Business', sub: 'I serve my local community' },
];

var CAPITAL_OPTIONS = [
  { key: '<500', label: 'Less than $500' },
  { key: '500-2k', label: '$500 – $2,000' },
  { key: '2k-10k', label: '$2,000 – $10,000' },
  { key: '10k+', label: '$10,000 or more' },
];

var HOURS_OPTIONS = [
  { key: '<5', label: 'Less than 5 hours/week' },
  { key: '5-15', label: '5 – 15 hours/week' },
  { key: '15-30', label: '15 – 30 hours/week' },
  { key: '30+', label: '30+ hours/week' },
];

var STEPS_CONFIG = [
  { key: 'quiz',         label: 'Business Idea Quiz',      icon: '&#9745;' },
  { key: 'results',      label: 'Basic Business Score',    icon: '&#9745;' },
  { key: 'mission',      label: 'Simple Mission Statement',icon: '&#9745;' },
  { key: 'plan',         label: 'Full Launch Roadmap',     icon: '&#128274;', locked: true },
  { key: 'pdf',          label: 'Business Plan PDF',       icon: '&#128274;', locked: true },
  { key: 'costs',        label: 'Startup Cost Calculator', icon: '&#128274;', locked: true },
  { key: 'pricing',      label: 'Pricing Builder',         icon: '&#128274;', locked: true },
  { key: 'funding',      label: 'Funding Readiness Plan',  icon: '&#128274;', locked: true },
  { key: 'cyber',        label: 'Cyber & AI Starter Kit',  icon: '&#128274;', locked: true },
];

var PRODUCT_INFO = {
  launch_builder: {
    title: 'Launch Builder — $19',
    desc: 'Full startup checklist, startup cost calculator, pricing builder, and 30-day launch plan.',
    features: ['Full legal & setup checklist (20+ items)', 'Itemized startup cost calculator', '3 pricing packages', '30-day week-by-week plan'],
  },
  launch_packet_pro: {
    title: 'Launch Packet Pro — $49',
    desc: 'Everything in Launch Builder plus a full AI-generated business plan, customer persona, 90-day roadmap, and PDF export.',
    features: ['Everything in Launch Builder', 'AI business plan (8-12 pages)', 'Customer persona builder', '90-day roadmap', 'Funding readiness checklist', 'Cyber & AI starter kit', 'PDF export'],
  },
  advisor_review: {
    title: 'Advisor Review — $149',
    desc: 'A 1-on-1 review session with a Champtron Systems advisor. You\'ll receive a scheduling link within 1 business day.',
    features: ['Personal advisor session', 'Custom recommendations', 'Scheduling link via email'],
  },
};

// ── Init ──────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', function() {
  dbInit();
});

async function dbInit() {
  // Check auth
  var token = _getToken();
  if (!token) {
    window.location.href = 'index.html?redirect=dream-builder';
    return;
  }

  // Load purchase status
  try {
    var resp = await _apiGet('/billing/purchases', token);
    window._db.purchases = resp;
  } catch (e) {
    // Non-fatal — user is just unverified as purchased
  }

  // Check for in-progress quiz draft
  try {
    var draft = localStorage.getItem('db_quiz_draft');
    if (draft) {
      var parsed = JSON.parse(draft);
      window._db.quizAnswers = parsed.quizAnswers || window._db.quizAnswers;
      window._db.quizPage = parsed.quizPage || 1;
    }
  } catch (e) {}

  // Check for existing saved idea
  try {
    var ideasResp = await _apiGet('/business/ideas', token);
    var ideas = (ideasResp && ideasResp.data) || [];
    var saved = ideas.filter(function(i) { return i.status === 'saved'; });
    if (saved.length > 0) {
      var idea = saved[0];
      window._db.businessIdeaId = idea.id;
      window._db.savedIdea = idea;
      // Go to appropriate section based on purchases
      if (window._db.purchases.launch_packet_pro) {
        _showSection('pro_plan');
        loadProPlan();
      } else if (window._db.purchases.launch_builder) {
        _showSection('plan');
        loadFullPlan();
      } else {
        _showSection('plan_preview');
        renderPlanPreview(idea);
      }
      renderSidebar();
      return;
    }
  } catch (e) {}

  // Default: show quiz
  renderQuizPage(window._db.quizPage);
  renderSidebar();
}

function _getToken() {
  return (window._authToken) || sessionStorage.getItem('sb_access_token') || null;
}

async function _apiGet(path, token) {
  var base = (window.API_BASE_URL || 'http://localhost:8000');
  var resp = await fetch(base + path, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  return resp.json();
}

async function _apiPost(path, body, token) {
  var base = (window.API_BASE_URL || 'http://localhost:8000');
  var resp = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    var err;
    try { err = await resp.json(); } catch(e) { err = {}; }
    var msg = (err && err.detail && err.detail.message) || ('HTTP ' + resp.status);
    var e2 = new Error(msg);
    e2.status = resp.status;
    throw e2;
  }
  return resp.json();
}

function dbLogout() {
  if (window.logout) { window.logout(); }
  else { window.location.href = 'index.html'; }
}

// ── Section Navigation ─────────────────────────────────────────────────────────

function _showSection(name) {
  var map = {
    quiz: 'dbSectionQuiz',
    results: 'dbSectionResults',
    plan_preview: 'dbSectionPlanPreview',
    plan: 'dbSectionPlan',
    pro_plan: 'dbSectionProPlan',
  };
  var sections = ['dbSectionQuiz','dbSectionResults','dbSectionPlanPreview','dbSectionPlan','dbSectionProPlan'];
  sections.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.classList.remove('active'); }
  });
  var target = map[name];
  if (target) {
    var el = document.getElementById(target);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  }
  window._db.step = name;
  renderSidebar();
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function renderSidebar() {
  var list = document.getElementById('dbStepsList');
  if (!list) return;

  var step = window._db.step;
  var purchases = window._db.purchases;

  var completedSteps = [];
  if (step === 'results' || step === 'plan_preview' || step === 'plan' || step === 'pro_plan') {
    completedSteps.push('quiz');
  }
  if (step === 'plan_preview' || step === 'plan' || step === 'pro_plan') {
    completedSteps.push('results');
    completedSteps.push('mission');
  }
  if (step === 'plan' || step === 'pro_plan') {
    completedSteps.push('plan');
    completedSteps.push('costs');
    completedSteps.push('pricing');
  }
  if (step === 'pro_plan') {
    completedSteps.push('pdf');
    completedSteps.push('funding');
    completedSteps.push('cyber');
  }

  var html = '';
  STEPS_CONFIG.forEach(function(s) {
    var isCompleted = completedSteps.indexOf(s.key) > -1;
    var isActive = (s.key === 'quiz' && step === 'quiz') ||
                   (s.key === 'results' && step === 'results') ||
                   (s.key === 'plan' && (step === 'plan' || step === 'plan_preview')) ||
                   (s.key === 'pdf' && step === 'pro_plan');

    var cls = 'db-step';
    if (isCompleted) cls += ' completed';
    else if (isActive) cls += ' active';
    else if (s.locked) cls += ' locked';

    var icon = isCompleted ? '&#10003;' : (s.locked && !isCompleted ? '&#128274;' : '&#9675;');
    html += '<li class="' + cls + '"><span class="db-step-icon">' + icon + '</span><span>' + s.label + '</span></li>';
  });
  list.innerHTML = html;

  // Show/hide upgrade CTA
  var cta = document.getElementById('dbUpgradeCta');
  if (cta) {
    if (purchases.launch_packet_pro) {
      cta.style.display = 'none';
    } else {
      cta.style.display = 'block';
    }
  }
}

// ── Quiz ───────────────────────────────────────────────────────────────────────

function renderQuizPage(pageNum) {
  window._db.quizPage = pageNum;
  var content = document.getElementById('dbQuizContent');
  var backBtn = document.getElementById('dbQuizBack');
  var nextBtn = document.getElementById('dbQuizNext');
  var error = document.getElementById('dbQuizError');
  if (error) { error.style.display = 'none'; }

  // Update progress dots
  for (var i = 1; i <= 5; i++) {
    var dot = document.getElementById('dbDot' + i);
    if (dot) { dot.className = 'db-quiz-dot' + (i <= pageNum ? ' done' : ''); }
  }

  if (backBtn) { backBtn.style.display = pageNum > 1 ? 'inline-flex' : 'none'; }
  if (nextBtn) { nextBtn.textContent = pageNum === 5 ? 'Get My Ideas' : 'Next'; }

  var html = '';

  if (pageNum === 1) {
    html = '<h2 class="db-quiz-title">What are your top skills?</h2>';
    html += '<p class="db-quiz-sub">Select all that apply.</p>';
    html += '<div class="db-chip-grid">';
    SKILLS_OPTIONS.forEach(function(opt) {
      var sel = window._db.quizAnswers.skills.indexOf(opt.key) > -1 ? ' selected' : '';
      html += '<button class="db-chip' + sel + '" onclick="toggleChip(this,\'skills\',\'' + opt.key + '\')">' + opt.label + '</button>';
    });
    html += '</div>';

  } else if (pageNum === 2) {
    html = '<h2 class="db-quiz-title">What problems do you want to solve?</h2>';
    html += '<p class="db-quiz-sub">Select all that apply.</p>';
    html += '<div class="db-chip-grid">';
    PROBLEMS_OPTIONS.forEach(function(opt) {
      var sel = window._db.quizAnswers.problems.indexOf(opt.key) > -1 ? ' selected' : '';
      html += '<button class="db-chip' + sel + '" onclick="toggleChip(this,\'problems\',\'' + opt.key + '\')">' + opt.label + '</button>';
    });
    html += '</div>';

  } else if (pageNum === 3) {
    html = '<h2 class="db-quiz-title">What type of business interests you?</h2>';
    html += '<p class="db-quiz-sub">Select one.</p>';
    html += '<div class="db-radio-group">';
    BUSINESS_TYPE_OPTIONS.forEach(function(opt) {
      var sel = window._db.quizAnswers.business_type === opt.key ? ' selected' : '';
      html += '<button class="db-radio-btn' + sel + '" onclick="selectRadio(this,\'business_type\',\'' + opt.key + '\')">';
      html += '<strong>' + opt.label + '</strong><br><span style="font-size:0.82rem; color:var(--muted);">' + opt.sub + '</span>';
      html += '</button>';
    });
    html += '</div>';

  } else if (pageNum === 4) {
    html = '<h2 class="db-quiz-title">How much starting capital do you have?</h2>';
    html += '<p class="db-quiz-sub">Select one.</p>';
    html += '<div class="db-radio-group">';
    CAPITAL_OPTIONS.forEach(function(opt) {
      var sel = window._db.quizAnswers.starting_capital === opt.key ? ' selected' : '';
      html += '<button class="db-radio-btn' + sel + '" onclick="selectRadio(this,\'starting_capital\',\'' + opt.key + '\')">' + opt.label + '</button>';
    });
    html += '</div>';

  } else if (pageNum === 5) {
    html = '<h2 class="db-quiz-title">How many hours per week can you dedicate?</h2>';
    html += '<p class="db-quiz-sub">Select one.</p>';
    html += '<div class="db-radio-group">';
    HOURS_OPTIONS.forEach(function(opt) {
      var sel = window._db.quizAnswers.weekly_hours === opt.key ? ' selected' : '';
      html += '<button class="db-radio-btn' + sel + '" onclick="selectRadio(this,\'weekly_hours\',\'' + opt.key + '\')">' + opt.label + '</button>';
    });
    html += '</div>';
  }

  if (content) { content.innerHTML = html; }
}

function toggleChip(btn, field, value) {
  var arr = window._db.quizAnswers[field];
  var idx = arr.indexOf(value);
  if (idx > -1) {
    arr.splice(idx, 1);
    btn.classList.remove('selected');
  } else {
    arr.push(value);
    btn.classList.add('selected');
  }
  _saveQuizDraft();
}

function selectRadio(btn, field, value) {
  window._db.quizAnswers[field] = value;
  var group = btn.parentElement;
  if (group) {
    var btns = group.querySelectorAll('.db-radio-btn');
    btns.forEach(function(b) { b.classList.remove('selected'); });
  }
  btn.classList.add('selected');
  _saveQuizDraft();
}

function _saveQuizDraft() {
  try {
    localStorage.setItem('db_quiz_draft', JSON.stringify({
      quizAnswers: window._db.quizAnswers,
      quizPage: window._db.quizPage,
    }));
  } catch (e) {}
}

function _validatePage(pageNum) {
  if (pageNum === 1) return window._db.quizAnswers.skills.length > 0;
  if (pageNum === 2) return window._db.quizAnswers.problems.length > 0;
  if (pageNum === 3) return window._db.quizAnswers.business_type !== null;
  if (pageNum === 4) return window._db.quizAnswers.starting_capital !== null;
  if (pageNum === 5) return window._db.quizAnswers.weekly_hours !== null;
  return false;
}

function handleQuizBack() {
  if (window._db.quizPage > 1) {
    renderQuizPage(window._db.quizPage - 1);
  }
}

function handleQuizNext() {
  var page = window._db.quizPage;
  var error = document.getElementById('dbQuizError');

  if (!_validatePage(page)) {
    if (error) { error.textContent = 'Please make a selection before continuing.'; error.style.display = 'block'; }
    return;
  }
  if (error) { error.style.display = 'none'; }

  if (page < 5) {
    renderQuizPage(page + 1);
  } else {
    submitQuiz();
  }
}

async function submitQuiz() {
  var btn = document.getElementById('dbQuizNext');
  var error = document.getElementById('dbQuizError');
  if (btn) { btn.disabled = true; btn.textContent = 'Getting your ideas...'; }

  var token = _getToken();
  try {
    var payload = {
      skills: window._db.quizAnswers.skills,
      problems: window._db.quizAnswers.problems,
      business_type: window._db.quizAnswers.business_type,
      starting_capital: window._db.quizAnswers.starting_capital,
      weekly_hours: window._db.quizAnswers.weekly_hours,
    };
    var result = await _apiPost('/business/quiz', payload, token);
    window._db.businessIdeaId = result.business_idea_id;
    window._db.suggestions = result.suggestions;
    localStorage.removeItem('db_quiz_draft');
    renderResults(result.suggestions, result.mission_preview);
    _showSection('results');
  } catch (e) {
    if (error) { error.textContent = (e.message || 'Failed to get ideas. Please try again.'); error.style.display = 'block'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Get My Ideas'; }
  }
}

// ── Results ────────────────────────────────────────────────────────────────────

function renderResults(suggestions, missionPreview) {
  var container = document.getElementById('dbIdeaCards');
  var missionEl = document.getElementById('dbMissionPreviewText');
  if (missionEl) { missionEl.textContent = missionPreview; }
  if (!container) return;

  window._db.suggestions = suggestions;
  window._db.selectedIdeaIndex = 0;

  var html = '';
  suggestions.forEach(function(idea, i) {
    var sel = i === 0 ? ' selected' : '';
    html += '<div class="db-idea-card' + sel + '" onclick="selectIdeaCard(' + i + ')" id="dbIdeaCard' + i + '">';
    html += '<div class="db-idea-name">' + idea.name + '</div>';
    html += '<div class="db-idea-desc">' + idea.description + '</div>';
    html += '<div class="db-idea-meta">';
    html += '<span class="db-meta-badge db-fit-badge">Fit: ' + idea.business_fit_pct + '%</span>';
    html += '<span class="db-meta-badge">Cost: ' + idea.startup_cost_tier + '</span>';
    html += '<span class="db-meta-badge">Difficulty: ' + idea.difficulty_tier + '</span>';
    html += '<span class="db-meta-badge">Revenue: ' + idea.revenue_potential + '</span>';
    html += '</div>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function selectIdeaCard(index) {
  window._db.selectedIdeaIndex = index;
  for (var i = 0; i < 3; i++) {
    var card = document.getElementById('dbIdeaCard' + i);
    if (card) { card.classList.toggle('selected', i === index); }
  }
}

async function saveSelectedIdea() {
  var btn = document.getElementById('dbSaveIdeaBtn');
  var errEl = document.getElementById('dbSaveIdeaError');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  var token = _getToken();
  try {
    var result = await _apiPost('/business/ideas/' + window._db.businessIdeaId + '/save', {
      idea_index: window._db.selectedIdeaIndex,
    }, token);
    window._db.savedIdea = result;

    if (window._db.purchases.launch_packet_pro) {
      _showSection('pro_plan');
      loadProPlan();
    } else if (window._db.purchases.launch_builder) {
      _showSection('plan');
      loadFullPlan();
    } else {
      _showSection('plan_preview');
      renderPlanPreview(result);
    }
  } catch (e) {
    if (errEl) { errEl.textContent = (e.message || 'Failed to save idea.'); errEl.style.display = 'inline'; }
    if (btn) { btn.disabled = false; btn.textContent = 'Save This Idea & See Your Plan'; }
  }
}

// ── Plan Preview (free) ────────────────────────────────────────────────────────

function renderPlanPreview(savedIdea) {
  var titleEl = document.getElementById('dbPlanPreviewTitle');
  var cardEl = document.getElementById('dbPlanPreviewIdeaCard');

  if (titleEl) { titleEl.textContent = 'Your Launch Plan: ' + (savedIdea.idea_name || 'Your Business'); }

  if (cardEl) {
    cardEl.innerHTML = '<div class="db-idea-card selected">' +
      '<div class="db-idea-name">' + (savedIdea.idea_name || 'Your Business') + '</div>' +
      '<div class="db-idea-desc">' + (savedIdea.idea_description || '') + '</div>' +
      '<div class="db-idea-meta">' +
        '<span class="db-meta-badge db-fit-badge">Fit: ' + (savedIdea.business_fit_pct || 0) + '%</span>' +
        '<span class="db-meta-badge">Cost: ' + (savedIdea.startup_cost_tier || '-') + '</span>' +
        '<span class="db-meta-badge">Difficulty: ' + (savedIdea.difficulty_tier || '-') + '</span>' +
        '<span class="db-meta-badge">Revenue: ' + (savedIdea.revenue_potential || '-') + '</span>' +
      '</div>' +
    '</div>';
  }
}

// ── Full Plan (Launch Builder) ─────────────────────────────────────────────────

async function loadFullPlan() {
  if (window._db.fullPlanLoaded) return;
  var loading = document.getElementById('dbFullPlanLoading');
  var content = document.getElementById('dbFullPlanContent');
  if (loading) { loading.style.display = 'block'; }

  var token = _getToken();
  try {
    var plan = await _apiGet('/business/ideas/' + window._db.businessIdeaId + '/plan?tier=launch_builder', token);
    window._db.fullPlanLoaded = true;
    renderFullPlan(plan, content);
  } catch (e) {
    if (e.status === 402) {
      showUpgradeModal('launch_builder');
      _showSection('plan_preview');
    } else {
      if (content) { content.innerHTML += '<p style="color:var(--red);">Failed to load plan. Please refresh.</p>'; }
    }
  } finally {
    if (loading) { loading.style.display = 'none'; }
  }
}

function renderFullPlan(plan, container) {
  var html = '<div class="db-plan-sections">';

  // Checklist
  if (plan.checklist && plan.checklist.length) {
    html += '<div class="db-plan-block"><h3 class="db-block-title">&#9989; Full Launch Checklist</h3><ul class="db-checklist">';
    plan.checklist.forEach(function(item) {
      html += '<li class="db-checklist-item"><span class="db-check">&#9744;</span> ' + item.item + ' <span style="color:var(--muted); font-size:0.78rem;">(' + item.category + ')</span></li>';
    });
    html += '</ul></div>';
  }

  // Cost Calculator
  if (plan.cost_calculator && plan.cost_calculator.length) {
    html += '<div class="db-plan-block" style="margin-top:20px;"><h3 class="db-block-title">&#128176; Startup Cost Estimate</h3><table class="db-cost-table">';
    html += '<tr><th>Item</th><th>Low Est.</th><th>High Est.</th></tr>';
    plan.cost_calculator.forEach(function(item) {
      html += '<tr><td>' + item.item + '</td><td>$' + item.estimated_cost_low + '</td><td>$' + item.estimated_cost_high + '</td></tr>';
    });
    html += '</table></div>';
  }

  // Pricing Packages
  if (plan.pricing_packages && plan.pricing_packages.length) {
    html += '<div class="db-plan-block" style="margin-top:20px;"><h3 class="db-block-title">&#128181; Pricing Packages</h3><div class="db-pricing-grid">';
    plan.pricing_packages.forEach(function(pkg) {
      html += '<div class="db-pricing-card"><div class="db-pricing-name">' + pkg.name + '</div>';
      html += '<div class="db-pricing-price">' + pkg.price_suggestion + '</div>';
      html += '<p style="color:var(--muted); font-size:0.85rem;">' + pkg.description + '</p></div>';
    });
    html += '</div></div>';
  }

  // 30-Day Plan
  if (plan.thirty_day_plan && plan.thirty_day_plan.length) {
    html += '<div class="db-plan-block" style="margin-top:20px;"><h3 class="db-block-title">&#128197; 30-Day Launch Plan</h3>';
    plan.thirty_day_plan.forEach(function(week) {
      html += '<div class="db-roadmap-phase"><div class="db-phase-label">Week ' + week.week + ': ' + week.title + '</div>';
      if (week.milestones && week.milestones.length) {
        html += '<ul>';
        week.milestones.forEach(function(m) { html += '<li style="color:var(--muted); font-size:0.875rem;">' + m + '</li>'; });
        html += '</ul>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // Pro upgrade CTA
  if (!window._db.purchases.launch_packet_pro) {
    html += '<div class="db-upgrade-block" style="margin-top:32px;">';
    html += '<p style="color:var(--muted); margin-bottom:12px;">Ready for the full business plan, customer persona, 90-day roadmap, and PDF export?</p>';
    html += '<button class="button primary" onclick="showUpgradeModal(\'launch_packet_pro\')">Upgrade to Launch Packet Pro — $49</button>';
    html += '</div>';
  }

  html += '</div>';
  if (container) { container.innerHTML = html; }
}

// ── Pro Plan (Launch Packet Pro) ───────────────────────────────────────────────

async function loadProPlan() {
  if (window._db.proPlanLoaded) return;
  var loading = document.getElementById('dbProPlanLoading');
  var content = document.getElementById('dbProPlanContent');
  if (loading) { loading.style.display = 'block'; }

  var token = _getToken();
  try {
    var plan = await _apiGet('/business/ideas/' + window._db.businessIdeaId + '/plan?tier=launch_packet_pro', token);
    window._db.proPlanLoaded = true;
    renderProPlan(plan, content);
  } catch (e) {
    if (e.status === 402) {
      showUpgradeModal('launch_packet_pro');
      _showSection('plan_preview');
    } else {
      if (content) { content.innerHTML += '<p style="color:var(--red);">Failed to load plan. Please refresh.</p>'; }
    }
  } finally {
    if (loading) { loading.style.display = 'none'; }
  }
}

function renderProPlan(plan, container) {
  var html = '<div class="db-plan-sections">';

  if (plan.mission_vision) {
    html += '<div class="db-plan-block"><h3 class="db-block-title">&#127775; Mission & Vision</h3>';
    html += '<p style="color:var(--text); line-height:1.7;">' + plan.mission_vision + '</p></div>';
  }

  if (plan.business_plan_text) {
    html += '<div class="db-plan-block" style="margin-top:20px;"><h3 class="db-block-title">&#128196; Business Plan</h3>';
    html += '<div style="color:var(--text); line-height:1.7; white-space:pre-wrap;">' + plan.business_plan_text + '</div></div>';
  }

  if (plan.customer_persona) {
    var p = plan.customer_persona;
    html += '<div class="db-plan-block" style="margin-top:20px;"><h3 class="db-block-title">&#128101; Customer Persona</h3>';
    html += '<div class="db-persona-card">';
    if (p.name) html += '<div><strong>Name:</strong> ' + p.name + '</div>';
    if (p.age_range) html += '<div><strong>Age:</strong> ' + p.age_range + '</div>';
    if (p.occupation) html += '<div><strong>Occupation:</strong> ' + p.occupation + '</div>';
    if (p.goals) html += '<div><strong>Goals:</strong> ' + p.goals + '</div>';
    if (p.pain_points) html += '<div><strong>Pain Points:</strong> ' + p.pain_points + '</div>';
    if (p.where_to_find) html += '<div><strong>Where to Find:</strong> ' + p.where_to_find + '</div>';
    html += '</div></div>';
  }

  if (plan.ninety_day_roadmap && plan.ninety_day_roadmap.length) {
    html += '<div class="db-plan-block" style="margin-top:20px;"><h3 class="db-block-title">&#128648; 90-Day Roadmap</h3>';
    plan.ninety_day_roadmap.forEach(function(m) {
      html += '<div class="db-roadmap-phase"><div class="db-phase-label">Month ' + m.month + ': ' + m.title + '</div>';
      if (m.goals && m.goals.length) {
        html += '<ul>';
        m.goals.forEach(function(g) { html += '<li style="color:var(--muted); font-size:0.875rem;">' + g + '</li>'; });
        html += '</ul>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // PDF download button
  html += '<div class="db-plan-block" style="margin-top:24px;">';
  html += '<button class="button primary" id="dbPdfBtn" onclick="downloadPdf()">&#128229; Download Business Plan PDF</button>';
  html += '<span id="dbPdfError" style="display:none; color:var(--red); margin-left:12px;"></span>';
  html += '</div>';

  html += '</div>';
  if (container) { container.innerHTML = html; }
}

async function downloadPdf() {
  var btn = document.getElementById('dbPdfBtn');
  var errEl = document.getElementById('dbPdfError');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
  var token = _getToken();
  try {
    var result = await _apiPost('/business/ideas/' + window._db.businessIdeaId + '/generate-pdf', {}, token);
    window.open(result.pdf_url, '_blank');
  } catch (e) {
    if (errEl) { errEl.textContent = 'PDF generation failed. Please try again.'; errEl.style.display = 'inline'; }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Download Business Plan PDF'; }
  }
}

// ── Upgrade Modal ──────────────────────────────────────────────────────────────

async function showUpgradeModal(productKey) {
  var modal = document.getElementById('dbUpgradeModal');
  var title = document.getElementById('dbUpgradeTitle');
  var desc = document.getElementById('dbUpgradeDesc');
  var features = document.getElementById('dbUpgradeFeatures');
  var errEl = document.getElementById('dbUpgradeError');
  var successEl = document.getElementById('dbUpgradeSuccess');
  var payEl = document.getElementById('dbPaymentElement');
  var payBtn = document.getElementById('dbPayBtn');

  if (!modal) return;

  window._db.activeProductKey = productKey;
  var info = PRODUCT_INFO[productKey];
  if (title) title.textContent = info.title;
  if (desc) desc.textContent = info.desc;
  if (errEl) { errEl.style.display = 'none'; }
  if (successEl) { successEl.style.display = 'none'; }
  if (payEl) { payEl.innerHTML = '<p style="color:var(--muted); font-size:0.875rem;">Initializing payment...</p>'; }
  if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Pay Now'; }

  if (features) {
    var fhtml = '<ul style="padding-left:20px; color:var(--text);">';
    info.features.forEach(function(f) { fhtml += '<li style="margin-bottom:4px;">' + f + '</li>'; });
    fhtml += '</ul>';
    features.innerHTML = fhtml;
  }

  modal.classList.remove('hidden');

  // Get client secret from backend
  var token = _getToken();
  try {
    var checkout = await _apiPost('/billing/one-time-checkout', { product_key: productKey }, token);
    await initStripe(checkout.client_secret);
  } catch (e) {
    if (payEl) { payEl.innerHTML = ''; }
    if (errEl) {
      errEl.textContent = (e.status === 409) ? 'You have already purchased this product.' : (e.message || 'Failed to initialize payment.');
      errEl.style.display = 'block';
    }
    if (payBtn) { payBtn.disabled = true; }
  }
}

function hideUpgradeModal() {
  var modal = document.getElementById('dbUpgradeModal');
  if (modal) { modal.classList.add('hidden'); }
  if (window._db.paymentElement) {
    try { window._db.paymentElement.unmount(); } catch(e) {}
    window._db.paymentElement = null;
  }
  window._db.stripe = null;
  window._db.stripeElements = null;
  window._db.activeProductKey = null;
}

async function initStripe(clientSecret) {
  if (!window.Stripe) {
    var errEl = document.getElementById('dbUpgradeError');
    if (errEl) { errEl.textContent = 'Stripe not loaded. Please refresh.'; errEl.style.display = 'block'; }
    return;
  }
  window._db.stripe = Stripe(window.STRIPE_PUBLISHABLE_KEY);
  window._db.stripeElements = window._db.stripe.elements({ clientSecret: clientSecret });
  window._db.paymentElement = window._db.stripeElements.create('payment');
  var payEl = document.getElementById('dbPaymentElement');
  if (payEl) {
    payEl.innerHTML = '';
    window._db.paymentElement.mount('#dbPaymentElement');
  }
}

async function handlePayment() {
  var payBtn = document.getElementById('dbPayBtn');
  var errEl = document.getElementById('dbUpgradeError');
  var successEl = document.getElementById('dbUpgradeSuccess');
  var loadingEl = document.getElementById('dbPayLoading');

  if (!window._db.stripe || !window._db.stripeElements) {
    if (errEl) { errEl.textContent = 'Payment not ready. Please try again.'; errEl.style.display = 'block'; }
    return;
  }

  if (payBtn) { payBtn.disabled = true; payBtn.textContent = 'Processing...'; }
  if (loadingEl) { loadingEl.style.display = 'block'; }
  if (errEl) { errEl.style.display = 'none'; }

  try {
    var result = await window._db.stripe.confirmPayment({
      elements: window._db.stripeElements,
      confirmParams: {
        return_url: window.location.origin + '/dream-builder.html?checkout=success',
      },
      redirect: 'if_required',
    });

    if (result.error) {
      if (errEl) { errEl.textContent = result.error.message || 'Payment failed.'; errEl.style.display = 'block'; }
      if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Pay Now'; }
    } else {
      // Payment succeeded — poll for purchase confirmation
      if (successEl) { successEl.style.display = 'block'; }
      await _pollPurchaseStatus(window._db.activeProductKey);
    }
  } catch (e) {
    if (errEl) { errEl.textContent = e.message || 'Payment failed. Please try again.'; errEl.style.display = 'block'; }
    if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Pay Now'; }
  } finally {
    if (loadingEl) { loadingEl.style.display = 'none'; }
  }
}

async function _pollPurchaseStatus(productKey) {
  var token = _getToken();
  var attempts = 0;
  var maxAttempts = 10;

  function poll() {
    return new Promise(function(resolve) {
      var interval = setInterval(async function() {
        attempts++;
        try {
          var status = await _apiGet('/billing/purchases', token);
          window._db.purchases = status;
          if (status[productKey]) {
            clearInterval(interval);
            hideUpgradeModal();
            // Navigate to appropriate section
            if (productKey === 'launch_packet_pro') {
              _showSection('pro_plan');
              window._db.proPlanLoaded = false;
              loadProPlan();
            } else if (productKey === 'launch_builder') {
              _showSection('plan');
              window._db.fullPlanLoaded = false;
              loadFullPlan();
            } else {
              hideUpgradeModal();
            }
            renderSidebar();
            resolve();
          }
        } catch (e) {}
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve();
        }
      }, 3000);
    });
  }
  await poll();
}
