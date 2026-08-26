/* ─── Auth ───────────────────────────────────────────────────────────────── */
const AUTH_USER = 'LaxmiGanesh';
const AUTH_PASS = 'Shyam@Kanha1';

function showApp() {
  document.getElementById('auth-overlay').classList.add('hidden');
  const fu = document.getElementById('footer-user');
  if (fu) fu.textContent = `👤 ${AUTH_USER}`;
}

function showAuth() {
  document.getElementById('auth-overlay').classList.remove('hidden');
}

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  if (username !== AUTH_USER || password !== AUTH_PASS) {
    errEl.textContent = 'Invalid username or password';
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');
  const remember = document.getElementById('remember-me').checked;
  if (remember) localStorage.setItem('pt_session', '1');
  else sessionStorage.setItem('pt_session', '1');
  showApp();
});

document.getElementById('btn-logout')?.addEventListener('click', () => {
  sessionStorage.removeItem('pt_session');
  localStorage.removeItem('pt_session');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('remember-me').checked = false;
  document.getElementById('login-error').classList.add('hidden');
  showAuth();
  document.getElementById('footer-user').textContent = '';
});

// Gate on load
if (sessionStorage.getItem('pt_session') || localStorage.getItem('pt_session')) { showApp(); }

/* ─── Gamification config ─────────────────────────────────────────────────── */
const RANKS = [
  { min: 0,      label: '🌱 Seedling',      color: '#6b7280' },
  { min: 10000,  label: '🥉 Rookie Trader', color: '#b45309' },
  { min: 50000,  label: '📊 Market Mover',  color: '#6c63ff' },
  { min: 200000, label: '🐂 Bull Master',   color: '#f59e0b' },
  { min: 500000, label: '🏆 Legend',         color: '#22c55e' },
];

const ACHIEVEMENTS = [
  { id: 'first_trade',  emoji: '🎯', label: 'First Trade',    desc: 'Logged first trade',            test: s => s.trade_count >= 1 },
  { id: 'green_streak', emoji: '💚', label: 'Green Day',      desc: '3+ consecutive profit trades',  test: s => s.win_streak >= 3 },
  { id: 'lakh_club',   emoji: '💰', label: '₹1L Club',        desc: 'Crossed ₹1,00,000 profit',      test: s => s.total_profit >= 100000 },
  { id: 'diversifier', emoji: '🌐', label: 'Diversifier',     desc: 'Traded 5+ different stocks',    test: s => s.stock_count >= 5 },
  { id: 'big_swing',   emoji: '🚀', label: 'Big Swing',       desc: 'Single trade over ₹50,000',     test: s => s.biggest_single >= 50000 },
  { id: 'ten_trades',  emoji: '⚡', label: 'Active Trader',   desc: '10+ trades logged',             test: s => s.trade_count >= 10 },
  { id: 'comeback',    emoji: '🔄', label: 'Comeback King',   desc: 'Profit trade after a loss',     test: s => s.has_comeback },
  { id: 'net_positive',emoji: '✅', label: 'In The Green',    desc: 'Net positive overall',          test: s => (s.total_profit - s.total_loss) > 0 },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmt = n => '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function getRank(net) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (net >= r.min) rank = r; }
  return rank;
}

function fireConfetti() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 },
    colors: ['#22c55e', '#6c63ff', '#f59e0b', '#fff', '#a78bfa'] });
}

function fireLossAnimation() {
  // Screen shake
  document.body.classList.remove('shake');
  void document.body.offsetWidth;
  document.body.classList.add('shake');

  // Red flash overlay
  document.body.classList.remove('loss-flash');
  void document.body.offsetWidth;
  document.body.classList.add('loss-flash');

  // Falling red embers from above
  confetti({
    particleCount: 70,
    angle: 270,
    spread: 90,
    origin: { x: 0.5, y: 0 },
    colors: ['#ef4444', '#991b1b', '#7f1d1d', '#dc2626', '#1a1d27'],
    gravity: 1.8,
    scalar: 0.75,
    drift: 0.3,
  });

  setTimeout(() => {
    document.body.classList.remove('shake');
    document.body.classList.remove('loss-flash');
  }, 800);
}

/* ─── localStorage data layer ────────────────────────────────────────────── */
const DB = {
  _get(key)       { return JSON.parse(localStorage.getItem('pt_' + key) || '[]'); },
  _set(key, val)  { localStorage.setItem('pt_' + key, JSON.stringify(val)); },
  nextId() {
    const id = parseInt(localStorage.getItem('pt_uid') || '0') + 1;
    localStorage.setItem('pt_uid', String(id));
    return id;
  },

  // Stakeholders
  getStakeholders()         { return this._get('stakeholders'); },
  addStakeholder(name, pan) {
    const rows = this.getStakeholders();
    if (rows.find(s => s.pan_number.toUpperCase() === pan.toUpperCase()))
      return { error: 'PAN number already exists' };
    const s = { id: this.nextId(), name: name.trim(), pan_number: pan.trim().toUpperCase(), created_at: new Date().toISOString() };
    rows.push(s); this._set('stakeholders', rows); return s;
  },
  deleteStakeholder(id) {
    this._set('stakeholders', this.getStakeholders().filter(s => s.id !== id));
    this._set('trades', this._get('trades').filter(t => t.stakeholder_id !== id));
  },

  // Stocks
  getStocks()      { return this._get('stocks'); },
  addStock(name)   {
    const rows = this.getStocks();
    if (rows.find(s => s.name.toUpperCase() === name.trim().toUpperCase()))
      return { error: 'Stock already exists' };
    const s = { id: this.nextId(), name: name.trim().toUpperCase(), created_at: new Date().toISOString() };
    rows.push(s); this._set('stocks', rows); return s;
  },
  deleteStock(id)  {
    const used = this._get('trades').some(t => t.stock_id === id);
    if (used) return { error: 'Cannot delete a stock that has trades' };
    this._set('stocks', this.getStocks().filter(s => s.id !== id));
    return { success: true };
  },

  // Trades
  rawTrades()      { return this._get('trades'); },
  addTrade(p)      {
    const rows   = this.rawTrades();
    const buy    = parseFloat(p.buy_price);
    const sell   = parseFloat(p.sell_price);
    const qty    = parseInt(p.quantity);
    const amount = Math.abs((sell - buy) * qty);
    const pct    = ((sell - buy) / buy) * 100;
    const type   = sell >= buy ? 'profit' : 'loss';
    const t = { id: this.nextId(), stakeholder_id: +p.stakeholder_id, stock_id: +p.stock_id,
      type, amount, buy_price: buy, sell_price: sell, quantity: qty, pct,
      trade_date: p.trade_date || today(), notes: p.notes || null, created_at: new Date().toISOString() };
    rows.push(t); this._set('trades', rows); return t;
  },
  updateTrade(id, p) {
    const rows = this.rawTrades();
    const i    = rows.findIndex(t => t.id === id);
    if (i < 0) return;
    const buy    = parseFloat(p.buy_price);
    const sell   = parseFloat(p.sell_price);
    const qty    = parseInt(p.quantity);
    const amount = Math.abs((sell - buy) * qty);
    const pct    = ((sell - buy) / buy) * 100;
    const type   = sell >= buy ? 'profit' : 'loss';
    rows[i] = { ...rows[i], stakeholder_id: +p.stakeholder_id, stock_id: +p.stock_id,
      type, amount, buy_price: buy, sell_price: sell, quantity: qty, pct,
      trade_date: p.trade_date, notes: p.notes || null };
    this._set('trades', rows);
  },
  deleteTrade(id)  { this._set('trades', this.rawTrades().filter(t => t.id !== id)); },

  // Joined trades with optional filters
  getTrades(f = {}) {
    const stk = this.getStakeholders();
    const sts = this.getStocks();
    let rows = this.rawTrades().map(t => ({
      ...t,
      stakeholder_name: stk.find(s => s.id === t.stakeholder_id)?.name || '?',
      pan_number:       stk.find(s => s.id === t.stakeholder_id)?.pan_number || '?',
      stock_name:       sts.find(s => s.id === t.stock_id)?.name || '?',
    }));
    if (f.stakeholder_id) rows = rows.filter(t => t.stakeholder_id === +f.stakeholder_id);
    if (f.stock_id)       rows = rows.filter(t => t.stock_id       === +f.stock_id);
    if (f.type)           rows = rows.filter(t => t.type           === f.type);
    if (f.from)           rows = rows.filter(t => t.trade_date     >= f.from);
    if (f.to)             rows = rows.filter(t => t.trade_date     <= f.to);
    return rows.sort((a, b) => b.trade_date.localeCompare(a.trade_date) || b.created_at.localeCompare(a.created_at));
  },

  // Analytics
  getAnalytics(f = {}) {
    const trades = this.getTrades(f);
    const stk    = this.getStakeholders();
    const sts    = this.getStocks();

    const byStakeholder = stk.map(s => {
      const ts          = trades.filter(t => t.stakeholder_id === s.id);
      const total_profit = ts.filter(t => t.type === 'profit').reduce((a, t) => a + t.amount, 0);
      const total_loss   = ts.filter(t => t.type === 'loss').reduce((a, t) => a + t.amount, 0);
      return { ...s, total_profit, total_loss, trade_count: ts.length, win_count: ts.filter(t => t.type === 'profit').length };
    }).filter(s => s.trade_count > 0).sort((a, b) => (b.total_profit - b.total_loss) - (a.total_profit - a.total_loss));

    const byStock = sts.map(s => {
      const ts = trades.filter(t => t.stock_id === s.id);
      const net = ts.reduce((a, t) => a + (t.type === 'profit' ? t.amount : -t.amount), 0);
      return { stock_name: s.name, net, count: ts.length };
    }).filter(s => s.count > 0).sort((a, b) => b.net - a.net);

    const total_profit  = trades.filter(t => t.type === 'profit').reduce((a, t) => a + t.amount, 0);
    const total_loss    = trades.filter(t => t.type === 'loss').reduce((a, t) => a + t.amount, 0);
    const biggest_trade = trades.reduce((m, t) => Math.max(m, t.amount), 0);
    const overall       = { total_profit, total_loss, biggest_trade, total_trades: trades.length };

    // today's hero
    const todayStr  = today();
    const todayMap  = {};
    trades.filter(t => t.trade_date === todayStr).forEach(t => {
      if (!todayMap[t.stakeholder_id]) todayMap[t.stakeholder_id] = { name: t.stakeholder_name, net: 0 };
      todayMap[t.stakeholder_id].net += t.type === 'profit' ? t.amount : -t.amount;
    });
    const todayHero = Object.values(todayMap).filter(h => h.net > 0).sort((a, b) => b.net - a.net)[0] || null;

    return { byStakeholder, byStock, overall, todayHero };
  },
};

/* ─── Achievement calculator ─────────────────────────────────────────────── */
function getAchievements(stakeholder) {
  const trades = DB.getTrades({ stakeholder_id: stakeholder.id });
  const stockSet = new Set(trades.map(t => t.stock_id));
  const biggest  = trades.reduce((m, t) => Math.max(m, t.amount), 0);
  let streak = 0, maxStreak = 0, prevWasLoss = false, hasComeback = false;
  [...trades].reverse().forEach(t => {
    if (t.type === 'profit') {
      streak++; maxStreak = Math.max(maxStreak, streak);
      if (prevWasLoss) hasComeback = true; prevWasLoss = false;
    } else { streak = 0; prevWasLoss = true; }
  });
  const stats = {
    trade_count: trades.length, total_profit: stakeholder.total_profit || 0,
    total_loss: stakeholder.total_loss || 0, win_streak: maxStreak,
    stock_count: stockSet.size, biggest_single: biggest, has_comeback: hasComeback,
  };
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.test(stats) }));
}

/* ─── State ──────────────────────────────────────────────────────────────── */
let pieChart = null;
let pendingDeleteId = null;

/* ─── Navigation ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const page = link.dataset.page;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    if (page === 'dashboard') renderDashboard();
    if (page === 'history')   renderHistory();
    if (page === 'manage')    renderManage();
    if (page === 'add-trade') refreshFormDropdowns();
  });
});

/* ─── Dropdowns ──────────────────────────────────────────────────────────── */
function populateSelect(id, items, placeholder) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(s => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.name + (s.pan_number ? ` (${s.pan_number})` : '');
    sel.appendChild(o);
  });
  sel.value = prev;
}

function refreshFormDropdowns() {
  const stk = DB.getStakeholders();
  const sts = DB.getStocks();
  ['trade-stakeholder','f-stakeholder','h-stakeholder','edit-stakeholder'].forEach(id =>
    populateSelect(id, stk, id.startsWith('f-') || id.startsWith('h-') ? 'All stakeholders' : 'Select stakeholder…'));
  ['trade-stock','f-stock','h-stock','edit-stock'].forEach(id =>
    populateSelect(id, sts, id.startsWith('f-') || id.startsWith('h-') ? 'All stocks' : 'Select stock…'));
}

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
const CHART_COLORS = ['#6c63ff','#22c55e','#f59e0b','#ef4444','#06b6d4','#a78bfa','#84cc16','#fb923c','#e879f9','#38bdf8'];

function dashFilters() {
  return {
    stakeholder_id: document.getElementById('f-stakeholder').value,
    stock_id:       document.getElementById('f-stock').value,
    type:           document.getElementById('f-type').value,
    from:           document.getElementById('f-from').value,
    to:             document.getElementById('f-to').value,
  };
}

function renderDashboard() {
  const f = dashFilters();
  const { byStakeholder, byStock, overall, todayHero } = DB.getAnalytics(f);

  // Empty state
  const emptyState = document.getElementById('dash-empty-state');
  if (emptyState) emptyState.classList.toggle('hidden', overall.total_trades > 0);

  // Today's hero
  const heroBanner = document.getElementById('today-hero');
  if (todayHero) {
    heroBanner.classList.remove('hidden');
    document.getElementById('hero-name').textContent   = todayHero.name;
    document.getElementById('hero-amount').textContent = fmt(todayHero.net);
  } else {
    heroBanner.classList.add('hidden');
  }

  // Stat cards
  const net = overall.total_profit - overall.total_loss;
  document.getElementById('stat-profit').textContent  = fmt(overall.total_profit);
  document.getElementById('stat-loss').textContent    = fmt(overall.total_loss);
  document.getElementById('stat-net').textContent     = (net >= 0 ? '+' : '-') + fmt(net);
  document.getElementById('stat-trades').textContent  = overall.total_trades;
  document.getElementById('stat-biggest').textContent = fmt(overall.biggest_trade);
  updateSentiment(net, overall.total_profit, overall.total_loss);
  const netCard = document.getElementById('net-card');
  netCard.classList.toggle('positive', net >= 0);
  netCard.classList.toggle('negative', net < 0);

  // Pie chart
  const canvas   = document.getElementById('pie-chart');
  const empty    = document.getElementById('chart-empty');
  const pieData  = byStakeholder.filter(s => s.total_profit + s.total_loss > 0);
  if (pieData.length === 0) {
    empty.classList.remove('hidden'); canvas.classList.add('hidden');
  } else {
    empty.classList.add('hidden'); canvas.classList.remove('hidden');
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: pieData.map(s => s.name),
        datasets: [{ data: pieData.map(s => s.total_profit + s.total_loss),
          backgroundColor: pieData.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderWidth: 2, borderColor: '#1a1d27' }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 12 }, padding: 14 } },
          tooltip: { callbacks: { label: ctx => {
            const s = pieData[ctx.dataIndex];
            const n = s.total_profit - s.total_loss;
            return ` ${ctx.label}: ${fmt(ctx.raw)} volume  |  Net: ${n >= 0 ? '+' : ''}${fmt(n)}`;
          }}}
        },
        cutout: '60%',
      }
    });
  }

  // Leaderboard
  const lb = document.getElementById('leaderboard-list');
  lb.innerHTML = '';
  if (byStakeholder.length === 0) {
    lb.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px">No data yet — log your first trade!</div>';
  }
  byStakeholder.forEach((s, i) => {
    const net     = s.total_profit - s.total_loss;
    const winRate = s.trade_count > 0 ? Math.round((s.win_count / s.trade_count) * 100) : 0;
    const [sym, cls] = i === 0 ? ['🥇','rank-1'] : i === 1 ? ['🥈','rank-2'] : i === 2 ? ['🥉','rank-3'] : [`#${i+1}`,'rank-other'];
    const row = document.createElement('div');
    row.className = 'lb-row';
    row.innerHTML = `
      <div class="lb-rank ${cls}">${sym}</div>
      <div class="lb-info">
        <div class="lb-name">${s.name}</div>
        <div class="lb-pan">${s.pan_number} · ${s.trade_count} trade${s.trade_count !== 1 ? 's' : ''} · ${winRate}% wins</div>
      </div>
      <div class="lb-stats">
        <div class="lb-net ${net >= 0 ? 'positive' : 'negative'}">${net >= 0 ? '+' : ''}${fmt(net)}</div>
      </div>`;
    lb.appendChild(row);
  });

  // Stock bars
  const sp = document.getElementById('stock-perf');
  sp.innerHTML = '';
  if (byStock.length === 0) {
    sp.innerHTML = '<div style="color:var(--text-muted);font-size:13px">No stock data yet</div>';
    return;
  }
  const maxAbs = Math.max(...byStock.map(s => Math.abs(s.net)), 1);
  byStock.forEach(s => {
    const pct = Math.round((Math.abs(s.net) / maxAbs) * 100);
    const pos = s.net >= 0;
    const row = document.createElement('div');
    row.className = 'stock-perf-row';
    row.innerHTML = `
      <div class="stock-perf-name">${s.stock_name}</div>
      <div class="stock-perf-bar-wrap"><div class="stock-perf-bar ${pos ? 'profit' : 'loss'}" style="width:${pct}%"></div></div>
      <div class="stock-perf-val ${pos ? 'positive' : 'negative'}">${pos ? '+' : ''}${fmt(s.net)}</div>`;
    sp.appendChild(row);
  });
}

['f-stakeholder','f-stock','f-type','f-from','f-to'].forEach(id =>
  document.getElementById(id)?.addEventListener('change', renderDashboard));
document.getElementById('reset-filters')?.addEventListener('click', () => {
  ['f-stakeholder','f-stock','f-type','f-from','f-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderDashboard();
});

/* ─── Add Trade ──────────────────────────────────────────────────────────── */
function setTodayDate() {
  document.getElementById('trade-date').value = today();
}
setTodayDate();

// Live P&L calculator (shared by add and edit forms)
function calcPnL(buyId, sellId, qtyId, previewId, badgeId, detailId) {
  const buy  = parseFloat(document.getElementById(buyId)?.value);
  const sell = parseFloat(document.getElementById(sellId)?.value);
  const qty  = parseInt(document.getElementById(qtyId)?.value);
  const preview = document.getElementById(previewId);
  if (!preview) return;
  if (!buy || !sell || !qty || isNaN(buy) || isNaN(sell) || isNaN(qty)) {
    preview.classList.add('hidden');
    preview.classList.remove('profit-preview','loss-preview');
    return;
  }
  const pnl      = (sell - buy) * qty;
  const pct      = ((sell - buy) / buy) * 100;
  const isProfit = pnl >= 0;
  preview.classList.remove('hidden','profit-preview','loss-preview');
  preview.classList.add(isProfit ? 'profit-preview' : 'loss-preview');
  document.getElementById(badgeId).textContent = isProfit ? '📈 Profit' : '📉 Loss';
  document.getElementById(detailId).innerHTML = `
    <div class="calc-val">
      <span class="calc-val-label">P&amp;L Amount</span>
      <span class="calc-val-num ${isProfit?'positive':'negative'}">${isProfit?'+':'-'}${fmt(Math.abs(pnl))}</span>
    </div>
    <div class="calc-val">
      <span class="calc-val-label">Return</span>
      <span class="calc-val-num ${isProfit?'positive':'negative'}">${isProfit?'+':''}${pct.toFixed(2)}%</span>
    </div>
    <div class="calc-val">
      <span class="calc-val-label">Per Share</span>
      <span class="calc-val-num ${isProfit?'positive':'negative'}">${isProfit?'+':'-'}${fmt(Math.abs(sell-buy))}</span>
    </div>
    <div class="calc-val">
      <span class="calc-val-label">Quantity</span>
      <span class="calc-val-num" style="color:var(--text)">${qty.toLocaleString('en-IN')} units</span>
    </div>`;
}

['trade-buy-price','trade-sell-price','trade-quantity'].forEach(id =>
  document.getElementById(id)?.addEventListener('input', () =>
    calcPnL('trade-buy-price','trade-sell-price','trade-quantity','calc-preview','calc-type-badge','calc-detail')));
['edit-buy-price','edit-sell-price','edit-quantity'].forEach(id =>
  document.getElementById(id)?.addEventListener('input', () =>
    calcPnL('edit-buy-price','edit-sell-price','edit-quantity','edit-calc-preview','edit-calc-badge','edit-calc-detail')));

document.getElementById('btn-inline-stock').addEventListener('click', () => {
  document.getElementById('new-stock-row').classList.remove('hidden');
  document.getElementById('new-stock-name').focus();
});
document.getElementById('btn-cancel-stock').addEventListener('click', () => {
  document.getElementById('new-stock-row').classList.add('hidden');
  document.getElementById('new-stock-name').value = '';
});
document.getElementById('btn-confirm-stock').addEventListener('click', () => {
  const name = document.getElementById('new-stock-name').value.trim();
  if (!name) return;
  const result = DB.addStock(name);
  if (result.error) { alert(result.error); return; }
  refreshFormDropdowns();
  document.getElementById('trade-stock').value = result.id;
  document.getElementById('new-stock-row').classList.add('hidden');
  document.getElementById('new-stock-name').value = '';
});

document.getElementById('trade-form').addEventListener('submit', e => {
  e.preventDefault();
  const errEl = document.getElementById('trade-error');
  const sucEl = document.getElementById('trade-success');
  errEl.classList.add('hidden'); sucEl.classList.add('hidden');

  const stakeholder_id = document.getElementById('trade-stakeholder').value;
  const stock_id       = document.getElementById('trade-stock').value;
  const buy_price      = parseFloat(document.getElementById('trade-buy-price').value);
  const sell_price     = parseFloat(document.getElementById('trade-sell-price').value);
  const quantity       = parseInt(document.getElementById('trade-quantity').value);

  if (!stakeholder_id || !stock_id || !buy_price || !sell_price || !quantity ||
      isNaN(buy_price) || isNaN(sell_price) || isNaN(quantity) || quantity < 1) {
    errEl.textContent = 'Please fill in all required fields with valid values.';
    errEl.classList.remove('hidden'); return;
  }

  const trade = DB.addTrade({ stakeholder_id, stock_id, buy_price, sell_price, quantity,
    trade_date: document.getElementById('trade-date').value || today(),
    notes: document.getElementById('trade-notes').value.trim() });

  sucEl.classList.remove('hidden');
  if (trade.type === 'profit') fireConfetti();
  else fireLossAnimation();

  document.getElementById('trade-form').reset();
  document.getElementById('calc-preview').classList.add('hidden');
  setTodayDate();
  refreshFormDropdowns();
  setTimeout(() => sucEl.classList.add('hidden'), 3000);
});

/* ─── History ────────────────────────────────────────────────────────────── */
function renderHistory() {
  const q = (document.getElementById('h-search')?.value || '').toLowerCase().trim();
  const f = {
    stakeholder_id: document.getElementById('h-stakeholder').value,
    stock_id:       document.getElementById('h-stock').value,
    type:           document.getElementById('h-type').value,
    from:           document.getElementById('h-from').value,
    to:             document.getElementById('h-to').value,
  };
  let trades = DB.getTrades(f);
  if (q) trades = trades.filter(t =>
    (t.stakeholder_name||'').toLowerCase().includes(q) ||
    (t.stock_name||'').toLowerCase().includes(q) ||
    (t.notes||'').toLowerCase().includes(q)
  );
  currentHistoryTrades = trades;
  const body  = document.getElementById('history-body');
  const empty = document.getElementById('history-empty');
  body.innerHTML = '';

  if (trades.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  trades.forEach(t => {
    const tr = document.createElement('tr');
    const pct = t.pct != null ? (t.pct >= 0 ? '+' : '') + t.pct.toFixed(2) + '%' : '—';
    const buyP  = t.buy_price  != null ? fmt(t.buy_price)  : '—';
    const sellP = t.sell_price != null ? fmt(t.sell_price) : '—';
    const qty   = t.quantity   != null ? t.quantity.toLocaleString('en-IN') : '—';
    tr.innerHTML = `
      <td>${fmtDate(t.trade_date)}</td>
      <td>${t.stakeholder_name}</td>
      <td style="font-family:monospace;font-size:12px">${t.pan_number}</td>
      <td>${t.stock_name}</td>
      <td style="color:var(--text-muted)">${buyP}</td>
      <td style="color:var(--text-muted)">${sellP}</td>
      <td style="color:var(--text-muted);text-align:center">${qty}</td>
      <td><span class="pill ${t.type}">${t.type === 'profit' ? '📈 Profit' : '📉 Loss'}</span></td>
      <td style="font-weight:600;color:${t.type==='profit'?'var(--profit)':'var(--loss)'}">${t.type==='profit'?'+':'-'}${fmt(t.amount)}</td>
      <td style="font-weight:600;color:${t.type==='profit'?'var(--profit)':'var(--loss)'}">${pct}</td>
      <td style="color:var(--text-muted);font-size:12px">${t.notes || '—'}</td>
      <td>
        <button class="action-btn edit" data-id="${t.id}">✏️ Edit</button>
        <button class="action-btn del"  data-id="${t.id}">🗑️ Delete</button>
      </td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll('.action-btn.edit').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(trades.find(t => t.id == btn.dataset.id))));
  body.querySelectorAll('.action-btn.del').forEach(btn =>
    btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id))));
}

['h-stakeholder','h-stock','h-type','h-from','h-to'].forEach(id =>
  document.getElementById(id)?.addEventListener('change', renderHistory));
document.getElementById('h-reset')?.addEventListener('click', () => {
  ['h-stakeholder','h-stock','h-type','h-from','h-to'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderHistory();
});

/* ─── Edit Modal ─────────────────────────────────────────────────────────── */
function openEditModal(trade) {
  refreshFormDropdowns();
  document.getElementById('edit-id').value          = trade.id;
  document.getElementById('edit-stakeholder').value = trade.stakeholder_id;
  document.getElementById('edit-stock').value       = trade.stock_id;
  document.getElementById('edit-buy-price').value   = trade.buy_price  ?? '';
  document.getElementById('edit-sell-price').value  = trade.sell_price ?? '';
  document.getElementById('edit-quantity').value    = trade.quantity   ?? '';
  document.getElementById('edit-date').value        = trade.trade_date;
  document.getElementById('edit-notes').value       = trade.notes || '';
  document.getElementById('edit-error').classList.add('hidden');
  // Trigger preview if data exists
  calcPnL('edit-buy-price','edit-sell-price','edit-quantity','edit-calc-preview','edit-calc-badge','edit-calc-detail');
  document.getElementById('edit-modal').classList.remove('hidden');
}

document.getElementById('edit-form').addEventListener('submit', e => {
  e.preventDefault();
  const id = parseInt(document.getElementById('edit-id').value);
  DB.updateTrade(id, {
    stakeholder_id: document.getElementById('edit-stakeholder').value,
    stock_id:       document.getElementById('edit-stock').value,
    buy_price:      document.getElementById('edit-buy-price').value,
    sell_price:     document.getElementById('edit-sell-price').value,
    quantity:       document.getElementById('edit-quantity').value,
    trade_date:     document.getElementById('edit-date').value,
    notes:          document.getElementById('edit-notes').value.trim(),
  });
  closeEditModal();
  renderHistory();
});

const closeEditModal = () => document.getElementById('edit-modal').classList.add('hidden');
document.getElementById('modal-close').addEventListener('click', closeEditModal);
document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
document.getElementById('edit-modal').addEventListener('click', e => { if (e.target.id === 'edit-modal') closeEditModal(); });

/* ─── Delete Modal ───────────────────────────────────────────────────────── */
function openDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('delete-modal').classList.remove('hidden');
}
const closeDeleteModal = () => {
  pendingDeleteId = null;
  document.getElementById('delete-modal').classList.add('hidden');
};
document.getElementById('delete-modal-close').addEventListener('click', closeDeleteModal);
document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
document.getElementById('delete-modal').addEventListener('click', e => { if (e.target.id === 'delete-modal') closeDeleteModal(); });
document.getElementById('delete-confirm').addEventListener('click', () => {
  if (pendingDeleteId === null) return;
  DB.deleteTrade(pendingDeleteId);
  closeDeleteModal();
  renderHistory();
});

/* ─── Manage ─────────────────────────────────────────────────────────────── */
function renderManage() {
  renderStakeholdersList();
  renderStocksList();
}

function renderStakeholdersList() {
  const list = document.getElementById('stakeholders-list');
  const stk  = DB.getStakeholders();
  list.innerHTML = '';
  if (stk.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:13px">No stakeholders yet</div>';
    return;
  }
  stk.forEach(s => {
    const item = document.createElement('div');
    item.className = 'manage-item';
    item.innerHTML = `
      <div class="manage-item-info">
        <div class="manage-item-name">${s.name}</div>
        <div class="manage-item-sub">${s.pan_number}</div>
      </div>
      <button class="manage-item-del" data-id="${s.id}">✕</button>`;
    item.querySelector('.manage-item-del').addEventListener('click', () => {
      if (!confirm(`Delete "${s.name}"? All their trades will also be deleted.`)) return;
      DB.deleteStakeholder(s.id);
      refreshFormDropdowns();
      renderManage();
    });
    list.appendChild(item);
  });
}

function renderStocksList() {
  const list = document.getElementById('stocks-list');
  const sts  = DB.getStocks();
  list.innerHTML = '';
  if (sts.length === 0) {
    list.innerHTML = '<div style="color:var(--text-muted);font-size:13px">No stocks yet</div>';
    return;
  }
  sts.forEach(s => {
    const item = document.createElement('div');
    item.className = 'manage-item';
    item.innerHTML = `
      <div class="manage-item-name">${s.name}</div>
      <button class="manage-item-del" data-id="${s.id}">✕</button>`;
    item.querySelector('.manage-item-del').addEventListener('click', () => {
      const res = DB.deleteStock(s.id);
      if (res?.error) { alert(res.error); return; }
      refreshFormDropdowns();
      renderManage();
    });
    list.appendChild(item);
  });
}

document.getElementById('add-stakeholder-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('new-s-name').value.trim();
  const pan  = document.getElementById('new-s-pan').value.trim().toUpperCase();
  if (!name || !pan) return;
  const res = DB.addStakeholder(name, pan);
  if (res.error) { alert(res.error); return; }
  document.getElementById('new-s-name').value = '';
  document.getElementById('new-s-pan').value  = '';
  refreshFormDropdowns();
  renderManage();
});

document.getElementById('add-stock-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('new-stock-sym').value.trim();
  if (!name) return;
  const res = DB.addStock(name);
  if (res.error) { alert(res.error); return; }
  document.getElementById('new-stock-sym').value = '';
  refreshFormDropdowns();
  renderManage();
});


/* ─── Floating Symbols ───────────────────────────────────────────────────── */
function initFloaters() {
  const wrap = document.getElementById('floaters');
  const symbols = ['₹','$','₹','$','₹','📈','📉','₹','$','₹','💹','₹'];
  const colors  = [
    'rgba(108,99,255,0.22)','rgba(34,197,94,0.18)','rgba(245,158,11,0.18)',
    'rgba(167,139,250,0.18)','rgba(239,68,68,0.16)','rgba(34,197,94,0.15)',
  ];
  symbols.forEach((sym, i) => {
    const el = document.createElement('span');
    el.className  = 'float-sym';
    el.textContent = sym;
    const left  = 5 + (i * 8.5) % 92;
    const dur   = 12 + (i * 3.1) % 10;
    const delay = -(i * 2.3) % dur;
    const fs    = 16 + (i * 4) % 20;
    const col   = colors[i % colors.length];
    el.style.cssText = `--left:${left}%;--dur:${dur}s;--delay:${delay}s;--fs:${fs}px;--col:${col}`;
    wrap.appendChild(el);
  });
}

/* ─── Sentiment update ───────────────────────────────────────────────────── */
function updateSentiment(net, totalProfit, totalLoss) {
  const bullCard = document.getElementById('bull-card');
  const bearCard = document.getElementById('bear-card');
  const moodIcon = document.getElementById('mood-icon');
  const moodText = document.getElementById('mood-text');
  const bullStat = document.getElementById('bull-stat');
  const bearStat = document.getElementById('bear-stat');

  bullStat.textContent = '+' + fmt(totalProfit);
  bearStat.textContent = '-' + fmt(totalLoss);

  if (net === 0) {
    bullCard.classList.remove('active-bull');
    bearCard.classList.remove('active-bear');
    moodIcon.textContent = '📊';
    moodText.textContent = 'Awaiting Trades';
  } else if (net > 0) {
    bullCard.classList.add('active-bull');
    bullCard.classList.remove('active-bear');
    bearCard.classList.remove('active-bull', 'active-bear');
    moodIcon.textContent = '🐂';
    moodText.textContent = 'Bull Market';
  } else {
    bearCard.classList.add('active-bear');
    bearCard.classList.remove('active-bull');
    bullCard.classList.remove('active-bull', 'active-bear');
    moodIcon.textContent = '🐻';
    moodText.textContent = 'Bear Market';
  }
}

/* ─── Theme toggle ───────────────────────────────────────────────────────── */
(function initTheme() {
  const saved = localStorage.getItem('pt_theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
  updateThemeBtn();
})();

function updateThemeBtn() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  btn.textContent = isLight ? '🌙 Dark mode' : '☀ Light mode';
}

document.getElementById('btn-theme')?.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('pt_theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('pt_theme', 'light');
  }
  updateThemeBtn();
});

/* ─── Quick date range helper ────────────────────────────────────────────── */
function quickDateRange(range) {
  const t = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const todayStr = fmt(t);
  let from = todayStr, to = todayStr;
  if (range === 'week') {
    const d = new Date(t); d.setDate(t.getDate() - t.getDay() + 1);
    from = fmt(d);
  } else if (range === 'month') {
    from = `${t.getFullYear()}-${pad(t.getMonth()+1)}-01`;
  } else if (range === 'year') {
    from = `${t.getFullYear()}-01-01`;
  }
  return { from, to };
}

document.querySelectorAll('#page-dashboard .btn-quick').forEach(btn => {
  btn.addEventListener('click', () => {
    const { from, to } = quickDateRange(btn.dataset.range);
    document.getElementById('f-from').value = from;
    document.getElementById('f-to').value   = to;
    renderDashboard();
  });
});

document.querySelectorAll('#page-history .btn-quick').forEach(btn => {
  btn.addEventListener('click', () => {
    const { from, to } = quickDateRange(btn.dataset.range);
    document.getElementById('h-from').value = from;
    document.getElementById('h-to').value   = to;
    renderHistory();
  });
});

/* ─── History: search + CSV ──────────────────────────────────────────────── */
document.getElementById('h-search')?.addEventListener('input', renderHistory);

document.getElementById('btn-csv')?.addEventListener('click', () => {
  const trades = currentHistoryTrades || [];
  if (!trades.length) { alert('No trades to export.'); return; }
  const headers = ['Date','Stakeholder','PAN','Stock','Buy Price','Sell Price','Qty','Type','P&L','Return %','Notes'];
  const rows = trades.map(t => [
    t.trade_date, t.stakeholder_name, t.pan_number, t.stock_name,
    t.buy_price ?? '', t.sell_price ?? '', t.quantity ?? '',
    t.type, (t.type === 'profit' ? '' : '-') + t.amount.toFixed(2),
    t.pct != null ? t.pct.toFixed(2) + '%' : '',
    t.notes || ''
  ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `trades-${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
});

let currentHistoryTrades = [];

/* ─── Unsaved changes warning ────────────────────────────────────────────── */
let formDirty = false;
['trade-stakeholder','trade-stock','trade-buy-price','trade-sell-price','trade-quantity','trade-notes','trade-date']
  .forEach(id => document.getElementById(id)?.addEventListener('input', () => { formDirty = true; }));
document.getElementById('trade-form')?.addEventListener('submit', () => { formDirty = false; });
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    if (formDirty && link.dataset.page !== 'add-trade') {
      if (!confirm('You have unsaved trade details. Leave anyway?')) { e.stopImmediatePropagation(); }
      else formDirty = false;
    }
  }, true);
});

/* ─── Export / Import ────────────────────────────────────────────────────── */
document.getElementById('btn-export')?.addEventListener('click', () => {
  const data = {
    version: 1,
    exported_at: new Date().toISOString(),
    stakeholders: DB.getStakeholders(),
    stocks:       DB.getStocks(),
    trades:       DB.rawTrades(),
    uid:          localStorage.getItem('pt_uid') || '0',
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `portfolio-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-file-input')?.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const statusEl = document.getElementById('import-status');

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.stakeholders || !data.stocks || !data.trades)
        throw new Error('Invalid backup file — missing required fields');

      const confirmed = confirm(
        `Import will REPLACE all current data on this device.\n\n` +
        `Backup contains:\n` +
        `  • ${data.stakeholders.length} stakeholders\n` +
        `  • ${data.stocks.length} stocks\n` +
        `  • ${data.trades.length} trades\n\n` +
        `Exported on: ${data.exported_at ? new Date(data.exported_at).toLocaleString('en-IN') : 'unknown'}\n\n` +
        `Continue?`
      );
      if (!confirmed) { e.target.value = ''; return; }

      localStorage.setItem('pt_stakeholders', JSON.stringify(data.stakeholders));
      localStorage.setItem('pt_stocks',       JSON.stringify(data.stocks));
      localStorage.setItem('pt_trades',       JSON.stringify(data.trades));
      if (data.uid) localStorage.setItem('pt_uid', data.uid);

      statusEl.textContent = `✅ Import successful — ${data.trades.length} trades, ${data.stakeholders.length} stakeholders restored.`;
      statusEl.className = 'import-status success';
      statusEl.classList.remove('hidden');

      refreshFormDropdowns();
      renderDashboard();
      renderManage();
    } catch (err) {
      statusEl.textContent = `❌ Import failed: ${err.message}`;
      statusEl.className = 'import-status error';
      statusEl.classList.remove('hidden');
    }
    e.target.value = '';
    setTimeout(() => statusEl.classList.add('hidden'), 5000);
  };
  reader.readAsText(file);
});


// Price lookup when a stock is selected in the trade form
document.getElementById('trade-stock')?.addEventListener('change', async () => {
  const stockId   = document.getElementById('trade-stock').value;
  const hint      = document.getElementById('price-hint');
  if (!stockId || !hint) { hint && hint.classList.add('hidden'); return; }

  const stockName = DB.getStocks().find(s => s.id === +stockId)?.name;
  if (!stockName) return;

  hint.textContent = '⏳ Fetching current price…';
  hint.className   = 'price-hint loading';
  hint.classList.remove('hidden');

  try {
    const data = await fetch(`/api/prices?symbols=${encodeURIComponent(stockName)}`).then(r => r.json());
    const q = data[stockName.toUpperCase()];

    if (data.error || !q || q.price == null) throw new Error('not found');

    const price    = q.price;
    const fmtP     = price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const status   = q.market_open ? 'Live' : 'Prev Close';
    const chgSign  = q.change_pct >= 0 ? '▲' : '▼';
    hint.className = 'price-hint success';
    hint.innerHTML = `NSE: <strong>₹${fmtP}</strong> <small style="opacity:.6">${status} · ${chgSign}${Math.abs(q.change_pct).toFixed(2)}%</small>
      <button type="button" class="btn-use-price" id="use-buy">↙ Buy</button>
      <button type="button" class="btn-use-price" id="use-sell">↙ Sell</button>`;

    document.getElementById('use-buy')?.addEventListener('click', () => {
      document.getElementById('trade-buy-price').value = price;
      document.getElementById('trade-buy-price').dispatchEvent(new Event('input'));
    });
    document.getElementById('use-sell')?.addEventListener('click', () => {
      document.getElementById('trade-sell-price').value = price;
      document.getElementById('trade-sell-price').dispatchEvent(new Event('input'));
    });
  } catch (_) {
    hint.textContent = `${stockName} not found on NSE — enter price manually`;
    hint.className   = 'price-hint error';
    setTimeout(() => hint.classList.add('hidden'), 4000);
  }
});

// Hide hint when stock is cleared
document.getElementById('trade-form')?.addEventListener('reset', () => {
  const h = document.getElementById('price-hint');
  if (h) h.classList.add('hidden');
});

/* ─── Init ───────────────────────────────────────────────────────────────── */
initFloaters();
refreshFormDropdowns();
renderDashboard();
