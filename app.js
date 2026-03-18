/* ─── STATE ─────────────────────────────────── */
let allTargets = [];
let allResources = [];
let progressChart = null;
let hoursChart = null;

/* ─── INIT ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  updateDateLine();
});

function updateDateLine() {
  const d = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('date-line').textContent = d.toLocaleDateString('en-IN', opts);
}

/* ─── SECTION NAVIGATION ─────────────────────── */
function showSection(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`sec-${name}`).classList.add('active');
  if (el) el.classList.add('active');
  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'targets') renderTargetsFull();
  if (name === 'resources') renderResources();
  if (name === 'analytics') populateChartSelect();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ─── LOAD DASHBOARD ─────────────────────────── */
async function loadDashboard() {
  const res = await fetch('/api/dashboard');
  const data = await res.json();

  document.getElementById('greeting').textContent = data.greeting;
  document.getElementById('w-icon').textContent = data.weather.icon;
  document.getElementById('w-temp').textContent = data.weather.temp;
  document.getElementById('w-desc').textContent = data.weather.description;

  document.getElementById('stat-targets').textContent = data.stats.total_targets;
  document.getElementById('stat-active').textContent = data.stats.active_targets;
  document.getElementById('stat-hours').textContent = data.stats.total_hours;
  document.getElementById('stat-resources').textContent = data.stats.total_resources;

  allTargets = data.targets;
  allResources = data.resources;

  renderDashboardTargets(data.targets.filter(t => t.status !== 'completed').slice(0, 4));
  populateTargetDropdowns();
}

/* ─── RENDER DASHBOARD TARGETS ───────────────── */
function renderDashboardTargets(targets) {
  const el = document.getElementById('dashboard-targets');
  if (!targets.length) {
    el.innerHTML = `<div class="empty-state">
      <span class="es-icon">🎯</span>
      <p>No active targets yet. Add your first one!</p>
      <button class="btn-primary" onclick="showSection('targets');showModal('addTargetModal')">+ Add Target</button>
    </div>`;
    return;
  }
  el.innerHTML = targets.map(t => targetCard(t)).join('');
}

function renderTargetsFull() {
  const el = document.getElementById('targets-list');
  if (!allTargets.length) {
    el.innerHTML = `<div class="empty-state">
      <span class="es-icon">🎯</span>
      <p>No targets yet.</p>
      <button class="btn-primary" onclick="showModal('addTargetModal')">+ Add Target</button>
    </div>`;
    return;
  }
  el.innerHTML = allTargets.map(t => targetCard(t)).join('');
}

function targetCard(t) {
  const pct = t.percent || 0;
  const done = t.status === 'completed';
  return `
  <div class="target-card ${done ? 'completed' : ''}" onclick="openDetail('${t.id}')">
    <div class="tc-header">
      <span class="tc-cat ${done ? 'tc-status-done' : ''}">${done ? '✅ Completed' : t.category}</span>
      <span class="tc-title">${t.title}</span>
      <div class="tc-actions" onclick="event.stopPropagation()">
        ${!done ? `<button class="icon-btn" title="Log Progress" onclick="openLogModal('${t.id}')">⏱️</button>` : ''}
        <button class="icon-btn" title="Delete" onclick="deleteTarget('${t.id}')">🗑️</button>
      </div>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar ${done ? 'done' : ''}" style="width:${pct}%"></div>
    </div>
    <div class="tc-meta">
      <span><b>${pct}%</b> complete</span>
      <span><b>${t.total_hours || 0}h</b> / ${t.goal_hours}h</span>
      ${t.deadline ? `<span>📅 <b>${t.deadline}</b></span>` : ''}
      <span>📝 <b>${t.log_count || 0}</b> sessions</span>
    </div>
  </div>`;
}

/* ─── ADD TARGET ─────────────────────────────── */
async function addTarget() {
  const title = document.getElementById('t-title').value.trim();
  if (!title) { toast('Please enter a title'); return; }
  const body = {
    title,
    description: document.getElementById('t-desc').value,
    category: document.getElementById('t-cat').value,
    goal_hours: document.getElementById('t-hours').value || 10,
    deadline: document.getElementById('t-deadline').value,
  };
  await fetch('/api/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  closeAllModals();
  clearForm(['t-title', 't-desc', 't-hours', 't-deadline']);
  toast('Target added! 🎯');
  await loadDashboard();
  renderTargetsFull();
  populateChartSelect();
}

/* ─── DELETE TARGET ──────────────────────────── */
async function deleteTarget(id) {
  if (!confirm('Delete this target and all its logs?')) return;
  await fetch(`/api/targets/${id}`, { method: 'DELETE' });
  toast('Target deleted');
  await loadDashboard();
  renderTargetsFull();
}

/* ─── LOG PROGRESS ───────────────────────────── */
function openLogModal(targetId) {
  document.getElementById('log-target-id').value = targetId;
  document.getElementById('log-hours').value = '';
  document.getElementById('log-note').value = '';
  showModal('logModal');
}

async function logProgress() {
  const id = document.getElementById('log-target-id').value;
  const hours = document.getElementById('log-hours').value;
  const note = document.getElementById('log-note').value;
  if (!hours || hours <= 0) { toast('Enter valid hours'); return; }
  await fetch(`/api/targets/${id}/log`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours: parseFloat(hours), note })
  });
  closeAllModals();
  toast('Progress logged! 🔥');
  await loadDashboard();
  renderTargetsFull();
}

/* ─── TARGET DETAIL MODAL ────────────────────── */
async function openDetail(targetId) {
  const t = allTargets.find(x => x.id === targetId);
  if (!t) return;
  const logs = t.logs || [];
  const logRows = logs.slice().reverse().map(l => `
    <tr>
      <td>${l.date}</td>
      <td><b>${l.hours}h</b></td>
      <td style="color:var(--muted)">${l.note || '—'}</td>
    </tr>`).join('');

  document.getElementById('detail-title').textContent = t.title;
  document.getElementById('detail-body').innerHTML = `
    <p style="color:var(--muted);margin-bottom:16px;font-size:14px">${t.description || 'No description.'}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      <div class="stat-card" style="flex:1;min-width:120px;padding:16px">
        <div class="stat-icon">📊</div>
        <div class="stat-val">${t.percent || 0}%</div>
        <div class="stat-label">Progress</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:120px;padding:16px">
        <div class="stat-icon">⏱️</div>
        <div class="stat-val">${t.total_hours || 0}h</div>
        <div class="stat-label">Logged</div>
      </div>
      <div class="stat-card" style="flex:1;min-width:120px;padding:16px">
        <div class="stat-icon">🎯</div>
        <div class="stat-val">${t.goal_hours}h</div>
        <div class="stat-label">Goal</div>
      </div>
    </div>
    <div class="progress-bar-wrap" style="height:8px;margin-bottom:20px">
      <div class="progress-bar ${t.status==='completed'?'done':''}" style="width:${t.percent||0}%"></div>
    </div>
    <h4 style="margin-bottom:12px;font-family:'Syne',sans-serif">Session History</h4>
    ${logs.length ? `<table class="log-table"><thead><tr><th>Date</th><th>Hours</th><th>Note</th></tr></thead><tbody>${logRows}</tbody></table>` : '<p style="color:var(--muted);font-size:14px">No sessions logged yet.</p>'}
    <button class="btn-primary" style="margin-top:20px" onclick="closeAllModals();openLogModal('${t.id}')">+ Log Progress</button>
  `;
  showModal('detailModal');
}

/* ─── RESOURCES ──────────────────────────────── */
function renderResources() {
  const el = document.getElementById('resources-list');
  if (!allResources.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span class="es-icon">📚</span>
      <p>Save YouTube videos and links here.</p>
      <button class="btn-primary" onclick="showModal('addResourceModal')">+ Add Resource</button>
    </div>`;
    return;
  }
  el.innerHTML = allResources.map(r => resourceCard(r)).join('');
}

function resourceCard(r) {
  const isYT = r.type === 'youtube';
  const thumbHtml = r.thumbnail
    ? `<img src="${r.thumbnail}" alt="thumbnail" loading="lazy" onerror="this.style.display='none'">`
    : `<span>${isYT ? '▶️' : '🔗'}</span>`;
  const linked = allTargets.find(t => t.id === r.target_id);
  return `
  <div class="resource-card">
    <div class="rc-thumb">${thumbHtml}</div>
    <div class="rc-body">
      <div class="rc-badge ${isYT ? 'yt' : ''}">${isYT ? '▶ YouTube' : '🔗 Link'}</div>
      <div class="rc-title">${r.title}</div>
      <div class="rc-meta">
        ${linked ? `🎯 ${linked.title} · ` : ''}Added ${r.added_at}
        ${r.last_accessed ? ` · Last opened ${r.last_accessed.split('T')[0]}` : ''}
      </div>
      <div class="rc-actions">
        <a href="${r.url}" target="_blank" class="rc-btn primary" onclick="markAccessed('${r.id}')">
          ${isYT ? '▶ Watch' : '🔗 Open'}
        </a>
        <button class="rc-btn" onclick="deleteResource('${r.id}')">🗑️</button>
      </div>
    </div>
  </div>`;
}

async function addResource() {
  const url = document.getElementById('r-url').value.trim();
  if (!url) { toast('Please enter a URL'); return; }
  const body = {
    url,
    title: document.getElementById('r-title').value.trim(),
    target_id: document.getElementById('r-target').value
  };
  const res = await fetch('/api/resources', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const newR = await res.json();
  closeAllModals();
  clearForm(['r-url', 'r-title']);
  toast('Resource saved! 📚');
  await loadDashboard();
  renderResources();
}

async function deleteResource(id) {
  if (!confirm('Remove this resource?')) return;
  await fetch(`/api/resources/${id}`, { method: 'DELETE' });
  toast('Resource removed');
  await loadDashboard();
  renderResources();
}

async function markAccessed(id) {
  await fetch(`/api/resources/${id}/access`, { method: 'POST' });
  await loadDashboard();
}

/* ─── POPULATE DROPDOWNS ─────────────────────── */
function populateTargetDropdowns() {
  const sel = document.getElementById('r-target');
  sel.innerHTML = '<option value="">None</option>' +
    allTargets.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
}

function populateChartSelect() {
  const sel = document.getElementById('chart-target-select');
  sel.innerHTML = '<option value="">-- choose a target --</option>' +
    allTargets.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
}

/* ─── CHARTS ─────────────────────────────────── */
async function loadChart() {
  const id = document.getElementById('chart-target-select').value;
  if (!id) return;

  const res = await fetch(`/api/chart/${id}`);
  const data = await res.json();
  const labels = data.data.map(d => d.date);
  const cumulative = data.data.map(d => d.cumulative);
  const daily = data.data.map(d => d.hours);
  const goal = data.goal_hours;

  const cfg = { responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#e8e8f0', font: { family: 'DM Sans' } } } },
    scales: {
      x: { ticks: { color: '#6b6b80', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(255,255,255,.05)' } },
      y: { ticks: { color: '#6b6b80', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(255,255,255,.05)' } }
    }
  };

  if (progressChart) progressChart.destroy();
  progressChart = new Chart(document.getElementById('progressChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Cumulative Hours',
          data: cumulative,
          borderColor: '#6c63ff',
          backgroundColor: 'rgba(108,99,255,.1)',
          fill: true, tension: 0.4, pointRadius: 4
        },
        {
          label: `Goal (${goal}h)`,
          data: Array(labels.length).fill(goal),
          borderColor: '#ff6584',
          borderDash: [8, 4], pointRadius: 0
        }
      ]
    },
    options: { ...cfg, plugins: { ...cfg.plugins, title: { display: true, text: `${data.target} – Progress Over Time`, color: '#e8e8f0', font: { family: 'Syne', size: 15 } } } }
  });

  if (hoursChart) hoursChart.destroy();
  hoursChart = new Chart(document.getElementById('hoursChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Hours per Session',
        data: daily,
        backgroundColor: 'rgba(67,217,173,.6)',
        borderColor: '#43d9ad',
        borderRadius: 6
      }]
    },
    options: { ...cfg, plugins: { ...cfg.plugins, title: { display: true, text: 'Daily Hours', color: '#e8e8f0', font: { family: 'Syne', size: 15 } } } }
  });
}

/* ─── MODAL HELPERS ──────────────────────────── */
function showModal(id) {
  document.getElementById('overlay').classList.add('open');
  document.getElementById(id).classList.add('open');
}

function closeAllModals() {
  document.getElementById('overlay').classList.remove('open');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('open'));
}

/* ─── UTILITY ────────────────────────────────── */
function clearForm(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function toast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function exportData() {
  const res = await fetch('/api/export');
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `progress-tracker-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Data exported! 💾');
}

/* ─── KEYBOARD ───────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});
