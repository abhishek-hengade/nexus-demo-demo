// ═══════════════════════════════════════════════════════════
//  NexusOS Pro — App Logic v3.0
//  Premium UI: smooth transitions, real data, clean state mgmt
// ═══════════════════════════════════════════════════════════

/* ─── App State ─── */
const state = {
  view: 'dashboard',
  floor: 1,
  user: null,
  employees: [],
  desks: [],
  rooms: [],
  visitors: [],
  assets: [],
  attendance: [],
  deptChart: null,
  cmdFocusIdx: 0,
  badgeEmployee: null,
};

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', async () => {
  initClock();
  initTheme();
  initNavigation();
  initCommandPalette();
  initPersonaToggle();
  initTopbarActions();
  await bootstrap();
});

async function bootstrap() {
  try {
    const [emps, desks, rooms, visitors, assets, att] = await Promise.all([
      api.get('/employees'),
      api.get('/desks'),
      api.get('/rooms'),
      api.get('/visitors'),
      api.get('/assets'),
      api.get('/attendance'),
    ]);
    state.employees  = emps    || [];
    state.desks      = desks   || [];
    state.rooms      = rooms   || [];
    state.visitors   = visitors|| [];
    state.assets     = assets  || [];
    state.attendance = att     || [];

    // Set default user
    state.user = state.employees[0] || { name: 'Admin', role: 'System Admin', avatar: '' };
    renderUserChip();
    renderPersonaList();
    populateEmployeeDropdowns();

    // Render initial view
    renderView(state.view);

    // Update nav badge
    updateDeskBadge();
  } catch(e) {
    showToast('Failed to connect to backend API', 'error');
    console.error(e);
  }
}

/* ─── Clock ─── */
function initClock() {
  const el = document.getElementById('live-clock');
  function tick() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    if (el) el.textContent = `${time} IST`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ─── Navigation ─── */
function initNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      navigateTo(view);
      window.sound?.click();
    });
  });
}

function navigateTo(view) {
  // Update active nav item
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Update page title
  const titles = {
    dashboard:  ['Overview', 'Real-time workspace telemetry'],
    desks:      ['Floor Plan', 'Smart desk booking & occupancy'],
    rooms:      ['Meeting Rooms', 'Conference pod reservations'],
    employees:  ['Personnel', 'Team directory & management'],
    attendance: ['Attendance', 'Clock-in · leave management'],
    visitors:   ['Visitors & Badges', 'Visitor registration & secure passes'],
    assets:     ['IT Assets', 'Hardware inventory & assignments'],
  };

  const [title, sub] = titles[view] || ['NexusOS', ''];
  document.getElementById('page-title').textContent = title;

  // Switch view sections
  document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
  const section = document.getElementById(`view-${view}`);
  if (section) section.classList.add('active');

  state.view = view;
  renderView(view);
}

function renderView(view) {
  switch(view) {
    case 'dashboard':  renderDashboard();  break;
    case 'desks':      renderDesks();      break;
    case 'rooms':      renderRooms();      break;
    case 'employees':  renderEmployees();  break;
    case 'attendance': renderAttendance(); break;
    case 'visitors':   renderVisitors();   break;
    case 'assets':     renderAssets();     break;
  }
}

/* ─── Dashboard ─── */
function renderDashboard() {
  const onsite   = state.attendance.filter(a => a.status === 'in-office').length;
  const remote   = state.attendance.filter(a => a.status === 'remote').length;
  const occupied = state.desks.filter(d => d.status === 'occupied').length;
  const total    = state.desks.length || 1;
  const booked   = state.rooms.filter(r => r.status === 'booked').length;
  const pct      = Math.round((occupied / total) * 100);

  setText('stat-employees', state.employees.length);
  setText('stat-onsite',   onsite);
  setText('stat-remote',   `${remote} Remote`);
  setText('stat-desk-pct', `${pct}%`);
  setText('stat-desk-sub', `${occupied} / ${total} desks occupied`);
  setText('stat-rooms',    booked);

  document.getElementById('stat-desk-bar').style.width = `${pct}%`;

  renderDeptChart();
  renderAccessLog();
}

function renderDeptChart() {
  const depts = {};
  state.employees.forEach(e => {
    const d = e.department || 'Unknown';
    depts[d] = (depts[d] || 0) + 1;
  });

  const labels = Object.keys(depts);
  const data   = Object.values(depts);

  const palette = [
    'rgba(34,211,238,0.8)',
    'rgba(129,140,248,0.8)',
    'rgba(52,211,153,0.8)',
    'rgba(251,191,36,0.8)',
    'rgba(251,113,133,0.8)',
    'rgba(167,139,250,0.8)',
    'rgba(99,102,241,0.8)',
    'rgba(244,114,182,0.8)',
  ];

  const ctx = document.getElementById('dept-chart');
  if (!ctx) return;

  if (state.deptChart) { state.deptChart.destroy(); }

  state.deptChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: palette.slice(0, labels.length),
        borderColor: 'transparent',
        borderRadius: 7,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,20,37,0.95)',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          titleColor: 'rgba(255,255,255,0.6)',
          bodyColor: 'rgba(255,255,255,0.9)',
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.raw} member${ctx.raw === 1 ? '' : 's'}`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10, family: 'JetBrains Mono' } },
          border: { color: 'rgba(255,255,255,0.06)' },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'rgba(255,255,255,0.3)', font: { size: 10, family: 'JetBrains Mono' }, stepSize: 1 },
          border: { color: 'rgba(255,255,255,0.06)' },
          beginAtZero: true,
        }
      },
      animation: { duration: 600, easing: 'easeOutQuart' },
    }
  });
}

function renderAccessLog() {
  const el = document.getElementById('access-log');
  if (!el) return;

  const events = [
    { name: 'Alice Chen',       action: 'clocked in',       time: '2m ago',  color: 'var(--emerald)' },
    { name: 'Desks Floor 01',   action: '3 new bookings',   time: '8m ago',  color: 'var(--cyan)' },
    { name: 'Ravi Sharma',      action: 'visitor registered',time: '15m ago', color: 'var(--indigo)' },
    { name: 'Board Room A',     action: 'reserved until 15:00', time: '22m ago', color: 'var(--amber)' },
    { name: 'Marcus Lee',       action: 'clocked out',      time: '41m ago', color: 'var(--rose)' },
  ];

  // Merge real attendance data
  const live = state.attendance.slice(-3).reverse().map(a => {
    const emp = state.employees.find(e => e.id === a.employeeId);
    return { name: emp?.name || 'Unknown', action: a.status, time: formatRelative(a.date), color: 'var(--cyan)' };
  });

  const all = [...live, ...events].slice(0, 6);

  el.innerHTML = all.map(e => `
    <div class="activity-item">
      <span class="activity-dot" style="background:${e.color}"></span>
      <div>
        <div class="activity-text"><strong style="color:rgba(255,255,255,0.8)">${e.name}</strong> ${e.action}</div>
        <div class="activity-time">${e.time}</div>
      </div>
    </div>
  `).join('');
}

/* ─── Desks / Floor Plan ─── */
function renderDesks() {
  const map = document.getElementById('floor-map');
  if (!map) return;

  const floorDesks = state.desks.filter(d => (d.floor || 1) === state.floor);

  if (!floorDesks.length) {
    map.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(255,255,255,0.25);font-family:var(--font-mono);font-size:12px">No desks configured for this floor. <a href="#" onclick="event.preventDefault();api.post('/seed').then(()=>location.reload())" style="color:var(--cyan)">Seed demo data</a></div>`;
    return;
  }

  // Group desks by zone/section
  const zones = {};
  floorDesks.forEach(d => {
    const zone = d.section || d.zone || (d.deskId?.startsWith('E') ? 'Engineering' : d.deskId?.startsWith('P') ? 'Product' : 'General');
    if (!zones[zone]) zones[zone] = [];
    zones[zone].push(d);
  });

  let html = '';
  for (const [zone, desks] of Object.entries(zones)) {
    html += `<div class="desk-row-header"><i class="fa-solid fa-location-dot" style="color:rgba(255,255,255,0.3)"></i>${zone}</div>`;
    desks.forEach(d => {
      const occupant = state.employees.find(e => e.deskId === d.id || e.id === d.occupantId);
      const status   = d.status || 'available';
      html += `
        <div class="desk-pod ${status}" onclick="openDeskModal('${d.id}')">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="desk-id">${d.deskId || d.id}</div>
            <span class="desk-status-dot"></span>
          </div>
          <div class="desk-occupant">${occupant?.name || (status === 'available' ? 'Available' : status === 'maintenance' ? 'Maintenance' : 'Reserved')}</div>
          <div class="desk-dept">${occupant?.department || d.equipment || ''}</div>
        </div>
      `;
    });
  }

  map.innerHTML = html;
}

function switchFloor(n) {
  state.floor = n;
  document.getElementById('tab-floor-1').classList.toggle('active', n === 1);
  document.getElementById('tab-floor-2').classList.toggle('active', n === 2);
  document.getElementById('floor-title').textContent =
    n === 1 ? 'Level 01 · Engineering & UX Wing' : 'Level 02 · Executive & Operations';
  renderDesks();
  window.sound?.click();
}

function updateDeskBadge() {
  const free = state.desks.filter(d => d.status === 'available').length;
  const el = document.getElementById('badge-desks');
  if (el) el.textContent = `${free} Free`;
}

/* Desk modal */
function openDeskModal(id) {
  const desk = state.desks.find(d => d.id == id);
  if (!desk) return;
  window.sound?.click();

  const occupant   = state.employees.find(e => e.deskId === desk.id || e.id === desk.occupantId);
  const titleEl    = document.getElementById('desk-modal-title');
  const subEl      = document.getElementById('desk-modal-sub');
  const bodyEl     = document.getElementById('desk-modal-body');
  const footerEl   = document.getElementById('desk-modal-footer');

  titleEl.textContent = `Workstation ${desk.deskId || desk.id}`;
  subEl.textContent   = `Floor ${desk.floor || 1} · ${desk.section || desk.zone || 'General Zone'}`;

  const statusColor = {
    available: 'var(--emerald)', occupied: 'var(--rose)',
    reserved: 'var(--indigo)', maintenance: 'var(--amber)'
  }[desk.status] || 'var(--cyan)';

  bodyEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${infoCell('Status',    `<span style="color:${statusColor};font-weight:700;text-transform:capitalize">${desk.status || 'available'}</span>`)}
      ${infoCell('Desk ID',   desk.deskId || desk.id)}
      ${infoCell('Equipment', desk.equipment || 'Standard Setup')}
      ${infoCell('Zone',      desk.section || desk.zone || 'General')}
    </div>
    ${occupant ? `
      <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--r-md)">
        <img src="${avatar(occupant)}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;border:1.5px solid var(--border-2)">
        <div>
          <div style="font-weight:700;color:white">${occupant.name}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);font-family:var(--font-mono)">${occupant.role || occupant.position || '—'} · ${occupant.department}</div>
        </div>
      </div>
    ` : `<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,0.3);font-family:var(--font-mono);font-size:12px"><i class="fa-solid fa-circle-check" style="color:var(--emerald);font-size:24px;display:block;margin-bottom:8px"></i>This workstation is available to book</div>`}
  `;

  footerEl.innerHTML = '';
  if (desk.status === 'available') {
    footerEl.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('desk-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="bookDesk('${desk.id}')"><i class="fa-solid fa-check"></i> Reserve This Desk</button>
    `;
  } else if (desk.status === 'occupied') {
    footerEl.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('desk-modal')">Cancel</button>
      <button class="btn btn-danger" onclick="releaseDesk('${desk.id}')"><i class="fa-solid fa-circle-xmark"></i> Release Desk</button>
    `;
  } else {
    footerEl.innerHTML = `<button class="btn btn-ghost" onclick="closeModal('desk-modal')">Close</button>`;
  }

  openModal('desk-modal');
}

async function bookDesk(id) {
  try {
    const emp = state.user;
    await api.put(`/desks/${id}`, { status: 'occupied', occupantId: emp?.id });
    const desk = state.desks.find(d => d.id == id);
    if (desk) { desk.status = 'occupied'; desk.occupantId = emp?.id; }
    closeModal('desk-modal');
    renderDesks(); updateDeskBadge();
    showToast('Desk reserved successfully', 'success');
    window.sound?.success();
  } catch(e) { showToast('Failed to book desk', 'error'); }
}

async function releaseDesk(id) {
  try {
    await api.put(`/desks/${id}`, { status: 'available', occupantId: null });
    const desk = state.desks.find(d => d.id == id);
    if (desk) { desk.status = 'available'; desk.occupantId = null; }
    closeModal('desk-modal');
    renderDesks(); updateDeskBadge();
    showToast('Desk released', 'info');
    window.sound?.click();
  } catch(e) { showToast('Failed to release desk', 'error'); }
}

/* ─── Rooms ─── */
function renderRooms() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;

  if (!state.rooms.length) {
    grid.innerHTML = `<div style="padding:40px;color:rgba(255,255,255,0.3);font-family:var(--font-mono)">No rooms found.</div>`;
    return;
  }

  grid.innerHTML = state.rooms.map(r => {
    const status = r.status || 'available';
    const amenities = (r.amenities || ['Projector', 'Video Call', 'Whiteboard']).slice(0, 4);
    const cap = r.capacity || 8;
    const used = r.status === 'booked' ? Math.floor(cap * 0.7) : 0;

    return `
      <div class="room-card ${status}" onclick="openRoomModal('${r.id}')">
        <div class="room-header">
          <div>
            <div class="room-name">${r.name}</div>
            <div class="room-meta"><i class="fa-solid fa-users" style="margin-right:4px"></i>Capacity: ${cap}</div>
          </div>
          <span class="room-status-chip ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
        <div class="room-amenities">
          ${amenities.map(a => `<span class="amenity-tag"><i class="fa-solid fa-check" style="color:rgba(255,255,255,0.2);font-size:9px"></i>${a}</span>`).join('')}
        </div>
        ${r.bookedBy ? `<div style="margin-top:10px;padding:8px 10px;background:var(--surface-2);border-radius:8px;font-size:11px;color:rgba(255,255,255,0.45)"><i class="fa-solid fa-user" style="margin-right:6px;color:var(--rose)"></i>Booked by: ${r.bookedBy}</div>` : ''}
        <div class="room-capacity-bar">
          <div class="room-capacity-label">
            <span>Utilisation</span>
            <span>${used} / ${cap}</span>
          </div>
          <div class="room-capacity-track">
            <div class="room-capacity-fill" style="width:${cap > 0 ? Math.round((used/cap)*100) : 0}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openRoomModal(id) {
  const room = state.rooms.find(r => r.id == id);
  if (!room) return;
  window.sound?.click();

  document.getElementById('room-modal-title').textContent = room.name;
  document.getElementById('room-modal-sub').textContent = `Capacity: ${room.capacity || 8} · Floor ${room.floor || 1}`;

  const status = room.status || 'available';
  const amenities = room.amenities || ['Projector', '4K Display', 'Video Conferencing', 'Whiteboard', 'Air Conditioning'];

  document.getElementById('room-modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      ${infoCell('Status', `<span style="color:${status==='available'?'var(--emerald)':'var(--rose)'};font-weight:700;text-transform:capitalize">${status}</span>`)}
      ${infoCell('Capacity', `${room.capacity || 8} persons`)}
      ${infoCell('Floor', `Level 0${room.floor || 1}`)}
      ${infoCell('Type', room.type || 'Conference Room')}
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:10.5px;font-family:var(--font-mono);color:rgba(255,255,255,0.3);margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase">Amenities</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${amenities.map(a => `<span class="chip chip-indigo"><i class="fa-solid fa-check" style="margin-right:4px"></i>${a}</span>`).join('')}
      </div>
    </div>
    ${status === 'available' ? `
      <div style="margin-bottom:14px">
        <label class="form-label">Meeting Title</label>
        <input type="text" class="form-input" id="room-booking-title" placeholder="E.g. Sprint Planning">
        <label class="form-label" style="margin-top:10px">Duration</label>
        <select class="form-input" id="room-booking-duration">
          <option value="30">30 minutes</option>
          <option value="60" selected>1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
        </select>
      </div>
    ` : `
      <div style="padding:12px 14px;background:var(--rose-dim);border:1px solid rgba(251,113,133,0.2);border-radius:var(--r-md);font-size:12px;color:rgba(255,255,255,0.6)">
        <i class="fa-solid fa-circle-info" style="color:var(--rose);margin-right:6px"></i>
        Booked by <strong style="color:white">${room.bookedBy || 'a team member'}</strong>. Contact them to renegotiate the slot.
      </div>
    `}
  `;

  const footer = document.getElementById('room-modal-footer');
  footer.innerHTML = '';
  if (status === 'available') {
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('room-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="bookRoom('${room.id}')"><i class="fa-solid fa-calendar-check"></i> Confirm Booking</button>
    `;
  } else {
    footer.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('room-modal')">Close</button>
      <button class="btn btn-danger" onclick="releaseRoom('${room.id}')"><i class="fa-solid fa-circle-xmark"></i> Free Room</button>
    `;
  }

  openModal('room-modal');
}

async function bookRoom(id) {
  const title = document.getElementById('room-booking-title')?.value || 'Meeting';
  try {
    await api.put(`/rooms/${id}`, { status: 'booked', bookedBy: state.user?.name || 'You', title });
    const room = state.rooms.find(r => r.id == id);
    if (room) { room.status = 'booked'; room.bookedBy = state.user?.name || 'You'; }
    closeModal('room-modal');
    renderRooms();
    if (state.view === 'dashboard') renderDashboard();
    showToast(`${title} — room booked!`, 'success');
    window.sound?.success();
  } catch(e) { showToast('Booking failed', 'error'); }
}

async function releaseRoom(id) {
  try {
    await api.put(`/rooms/${id}`, { status: 'available', bookedBy: null });
    const room = state.rooms.find(r => r.id == id);
    if (room) { room.status = 'available'; room.bookedBy = null; }
    closeModal('room-modal');
    renderRooms();
    if (state.view === 'dashboard') renderDashboard();
    showToast('Room released', 'info');
    window.sound?.click();
  } catch(e) { showToast('Failed to release room', 'error'); }
}

/* ─── Employees ─── */
function renderEmployees(filter = '') {
  const tbody = document.getElementById('emp-tbody');
  if (!tbody) return;

  const f = filter.toLowerCase();
  const list = state.employees.filter(e =>
    !f || (e.name||'').toLowerCase().includes(f) ||
           (e.department||'').toLowerCase().includes(f) ||
           (e.email||'').toLowerCase().includes(f)
  );

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:rgba(255,255,255,0.25);font-family:var(--font-mono)">No results.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => {
    const statusColor = { 'in-office': 'emerald', 'remote': 'cyan', 'out': 'slate' }[e.status] || 'slate';
    const deskLabel = state.desks.find(d => d.occupantId === e.id || d.id === e.deskId)?.deskId || '—';
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <img src="${avatar(e)}" class="emp-avatar" alt="${e.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=0d1425&color=22d3ee&size=64'">
            <div>
              <div class="emp-name">${e.name}</div>
              <div class="emp-email">${e.email || '—'}</div>
            </div>
          </div>
        </td>
        <td>${e.department || '—'}</td>
        <td style="color:rgba(255,255,255,0.6)">${e.role || e.position || '—'}</td>
        <td><span class="chip chip-${statusColor}">${capitalise(e.status || 'out')}</span></td>
        <td><span class="chip chip-slate">${deskLabel}</span></td>
        <td>
          <button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="deleteEmployee('${e.id}')">
            <i class="fa-solid fa-trash-can" style="color:var(--rose)"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind search
  const searchEl = document.getElementById('emp-search');
  if (searchEl && !searchEl.dataset.bound) {
    searchEl.dataset.bound = '1';
    searchEl.addEventListener('input', () => renderEmployees(searchEl.value));
  }
}

function openAddEmployeeModal() {
  window.sound?.click();
  openModal('emp-modal');
}

async function submitEmployee() {
  const fname = document.getElementById('emp-fname').value.trim();
  const lname = document.getElementById('emp-lname').value.trim();
  const email = document.getElementById('emp-email').value.trim();
  const dept  = document.getElementById('emp-dept').value;
  const role  = document.getElementById('emp-role').value.trim();
  const floor = document.getElementById('emp-floor').value;
  const type  = document.getElementById('emp-type').value;

  if (!fname || !lname || !email || !role) { showToast('Please fill in required fields', 'warning'); return; }

  try {
    const emp = await api.post('/employees', {
      name: `${fname} ${lname}`, email, department: dept, role, floor: +floor, employmentType: type, status: 'out',
    });
    state.employees.push(emp);
    closeModal('emp-modal');
    renderEmployees();
    populateEmployeeDropdowns();
    renderPersonaList();
    showToast(`${emp.name} added to directory`, 'success');
    window.sound?.success();
    ['emp-fname','emp-lname','emp-email','emp-role'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  } catch(e) { showToast('Failed to add employee', 'error'); }
}

async function deleteEmployee(id) {
  if (!confirm('Remove this employee?')) return;
  try {
    await api.delete(`/employees/${id}`);
    state.employees = state.employees.filter(e => e.id != id);
    renderEmployees();
    populateEmployeeDropdowns();
    showToast('Employee removed', 'info');
  } catch(e) { showToast('Failed to delete employee', 'error'); }
}

/* ─── Attendance ─── */
function renderAttendance() {
  const tbody = document.getElementById('att-tbody');
  if (!tbody) return;

  const sorted = [...state.attendance].sort((a,b) => new Date(b.date||b.checkIn||0) - new Date(a.date||a.checkIn||0));

  tbody.innerHTML = sorted.slice(0, 30).map(a => {
    const emp = state.employees.find(e => e.id === a.employeeId);
    const name = emp?.name || 'Unknown';
    const date = a.date ? new Date(a.date).toLocaleDateString('en-IN') : '—';
    const checkIn  = a.checkIn  ? new Date(a.checkIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—';
    const checkOut = a.checkOut ? new Date(a.checkOut).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—';
    const statusColor = { 'in-office': 'emerald', 'remote': 'cyan', 'out': 'slate' }[a.status] || 'slate';
    const hours = (a.checkIn && a.checkOut)
      ? `${((new Date(a.checkOut) - new Date(a.checkIn)) / 3600000).toFixed(1)}h`
      : '—';

    return `
      <tr>
        <td>${name}</td>
        <td style="font-family:var(--font-mono);font-size:11px">${date}</td>
        <td style="font-family:var(--font-mono);font-size:11px;color:var(--emerald)">${checkIn}</td>
        <td style="font-family:var(--font-mono);font-size:11px;color:var(--rose)">${checkOut}</td>
        <td><span class="chip chip-${statusColor}">${capitalise(a.status||'out')}</span></td>
        <td style="font-family:var(--font-mono);font-size:11px;color:rgba(255,255,255,0.5)">${hours}</td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:30px;color:rgba(255,255,255,0.25);font-family:var(--font-mono)">No records yet.</td></tr>`;
}

async function submitAttendance() {
  const empId = document.getElementById('att-employee').value;
  const status = document.getElementById('att-status').value;
  const notes  = document.getElementById('att-notes').value;

  if (!empId) { showToast('Select an employee', 'warning'); return; }

  try {
    const rec = await api.post('/attendance', { employeeId: empId, status, notes, date: new Date().toISOString(), checkIn: new Date().toISOString() });
    state.attendance.push(rec);

    // Update employee status locally
    const emp = state.employees.find(e => e.id == empId);
    if (emp) emp.status = status;

    // Update clockin button if it's the current user
    if (state.user?.id == empId) updateClockinBtn(status);

    renderAttendance();
    if (state.view === 'dashboard') renderDashboard();
    showToast('Attendance recorded', 'success');
    window.sound?.success();
  } catch(e) { showToast('Failed to record attendance', 'error'); }
}

async function submitLeave() {
  const empId = document.getElementById('leave-employee').value;
  const start = document.getElementById('leave-start').value;
  const end   = document.getElementById('leave-end').value;
  const type  = document.getElementById('leave-type').value;

  if (!empId || !start || !end) { showToast('Fill all required fields', 'warning'); return; }

  try {
    await api.post('/attendance/leave', { employeeId: empId, leaveType: type, startDate: start, endDate: end, status: 'pending' });
    showToast('Leave request submitted', 'success');
    window.sound?.success();
  } catch(e) { showToast('Failed to submit leave request', 'error'); }
}

/* ─── Visitors ─── */
function renderVisitors() {
  const tbody = document.getElementById('vis-tbody');
  if (tbody) {
    tbody.innerHTML = state.visitors.slice(-20).reverse().map(v => {
      const host = state.employees.find(e => e.id === v.hostId);
      return `
        <tr>
          <td>
            <div style="font-weight:600;color:white">${v.name}</div>
            <div style="font-size:10px;font-family:var(--font-mono);color:rgba(255,255,255,0.35)">${v.organization || v.org || '—'}</div>
          </td>
          <td>${host?.name || v.hostName || '—'}</td>
          <td style="font-family:var(--font-mono);font-size:11px">${v.checkIn ? new Date(v.checkIn).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
          <td><span class="chip chip-indigo">${v.accessLevel || 'Lobby'}</span></td>
          <td><span class="chip chip-${v.checkOut ? 'slate' : 'emerald'}">${v.checkOut ? 'Checked Out' : 'Active'}</span></td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="5" style="text-align:center;padding:30px;color:rgba(255,255,255,0.25);font-family:var(--font-mono)">No visitors today.</td></tr>`;
  }

  // Set datetime-local to now
  const dtEl = document.getElementById('vis-checkin');
  if (dtEl && !dtEl.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dtEl.value = now.toISOString().slice(0,16);
  }
}

async function registerVisitor() {
  const name    = document.getElementById('vis-name').value.trim();
  const org     = document.getElementById('vis-org').value.trim();
  const phone   = document.getElementById('vis-phone').value.trim();
  const hostId  = document.getElementById('vis-host').value;
  const purpose = document.getElementById('vis-purpose').value.trim();
  const checkin = document.getElementById('vis-checkin').value;
  const access  = document.getElementById('vis-access').value;

  if (!name || !hostId) { showToast('Visitor name and host are required', 'warning'); return; }

  try {
    const vis = await api.post('/visitors', {
      name, organization: org, phone, hostId, purpose, checkIn: checkin || new Date().toISOString(),
      accessLevel: access, badgeId: `NX-${Math.floor(100000 + Math.random() * 900000)}`
    });
    state.visitors.push(vis);
    renderVisitors();
    updateBadgePreview(vis);
    showToast(`Visitor pass issued for ${name}`, 'success');
    window.sound?.success();

    // Clear form
    ['vis-name','vis-org','vis-phone','vis-purpose'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = '';
    });
  } catch(e) { showToast('Failed to register visitor', 'error'); }
}

function updateBadgePreview(vis) {
  const host = state.employees.find(e => e.id == vis.hostId);
  setText('badge-name',   vis.name || '— Visitor Name —');
  setText('badge-org',    vis.organization || '—');
  setText('badge-host',   host?.name || '—');
  setText('badge-access', vis.accessLevel || '—');
  setText('badge-id',     vis.badgeId || `NX-${Math.floor(100000+Math.random()*900000)}`);
  setText('badge-time',   vis.checkIn ? new Date(vis.checkIn).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}) : '—');

  // Simple QR-like pattern in the badge
  const qr = document.getElementById('badge-qr');
  if (qr) {
    qr.innerHTML = `<svg viewBox="0 0 100 100" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
      ${generateQRPattern()}
    </svg>`;
  }
}

function generateQRPattern() {
  let rects = '';
  const size = 7;
  const grid = Array.from({length: size}, () => Array.from({length: size}, () => Math.random() > 0.45));
  // Corner squares
  [[0,0],[0,5],[5,0]].forEach(([r,c]) => {
    for(let dr=0;dr<2;dr++) for(let dc=0;dc<2;dc++) grid[r+dr][c+dc] = true;
  });
  for(let r=0;r<size;r++) for(let c=0;c<size;c++) {
    if(grid[r][c]) rects += `<rect x="${c*14}" y="${r*14}" width="12" height="12" fill="#111" rx="2"/>`;
  }
  return `<rect width="100" height="100" fill="white" rx="4"/>${rects}`;
}

function printBadge() {
  window.print();
  showToast('Badge sent to printer', 'info');
}

/* ─── Assets ─── */
function renderAssets(filter = '') {
  const grid = document.getElementById('asset-grid');
  if (!grid) return;

  const f = filter.toLowerCase();
  const list = state.assets.filter(a =>
    !f || (a.name||'').toLowerCase().includes(f) ||
           (a.serialNumber||'').toLowerCase().includes(f)
  );

  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:60px;text-align:center;color:rgba(255,255,255,0.25);font-family:var(--font-mono)">No assets found.</div>`;
    return;
  }

  const icons = { laptop:'fa-laptop', monitor:'fa-desktop', phone:'fa-mobile-screen', printer:'fa-print', server:'fa-server', headset:'fa-headset', tablet:'fa-tablet', misc:'fa-microchip' };

  grid.innerHTML = list.map(a => {
    const emp = state.employees.find(e => e.id === a.assignedTo);
    const typeKey = a.type?.toLowerCase() || 'misc';
    const statusColor = { active:'emerald', spare:'cyan', maintenance:'amber', retired:'rose' }[a.status] || 'slate';
    return `
      <div class="asset-card">
        <div class="asset-icon ${typeKey}">
          <i class="fa-solid ${icons[typeKey] || 'fa-microchip'}"></i>
        </div>
        <div class="asset-name">${a.name}</div>
        <div class="asset-serial mono">${a.serialNumber || 'N/A'}</div>
        <div style="margin-top:8px"><span class="chip chip-${statusColor}">${capitalise(a.status||'active')}</span></div>
        <div class="asset-owner">${emp ? `<i class="fa-solid fa-user" style="margin-right:5px;color:rgba(255,255,255,0.3)"></i>${emp.name}` : '<i class="fa-solid fa-circle" style="margin-right:5px;color:rgba(255,255,255,0.15)"></i>Unassigned'}</div>
      </div>
    `;
  }).join('');

  const searchEl = document.getElementById('asset-search');
  if (searchEl && !searchEl.dataset.bound) {
    searchEl.dataset.bound = '1';
    searchEl.addEventListener('input', () => renderAssets(searchEl.value));
  }
}

function openAddAssetModal() {
  window.sound?.click();
  // Populate employee dropdown in asset modal
  const sel = document.getElementById('asset-employee');
  if (sel) {
    sel.innerHTML = `<option value="">Unassigned</option>` +
      state.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  }
  openModal('asset-modal');
}

async function submitAsset() {
  const name   = document.getElementById('asset-name').value.trim();
  const type   = document.getElementById('asset-type').value;
  const serial = document.getElementById('asset-serial').value.trim();
  const empId  = document.getElementById('asset-employee').value;
  const status = document.getElementById('asset-status').value;

  if (!name) { showToast('Asset name is required', 'warning'); return; }

  try {
    const asset = await api.post('/assets', { name, type, serialNumber: serial, assignedTo: empId||null, status });
    state.assets.push(asset);
    closeModal('asset-modal');
    renderAssets();
    showToast(`${name} added to inventory`, 'success');
    window.sound?.success();
    document.getElementById('asset-name').value = '';
    document.getElementById('asset-serial').value = '';
  } catch(e) { showToast('Failed to add asset', 'error'); }
}

/* ─── User / Persona ─── */
function renderUserChip() {
  if (!state.user) return;
  setText('user-name', state.user.name);
  setText('user-role', state.user.role || state.user.position || '—');
  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) {
    avatarEl.src = avatar(state.user);
    avatarEl.onerror = () => { avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.name)}&background=0d1425&color=22d3ee&size=64`; };
  }
}

function renderPersonaList() {
  const list = document.getElementById('persona-list');
  if (!list) return;
  list.innerHTML = state.employees.slice(0, 8).map(e => `
    <div class="persona-item" onclick="switchPersona('${e.id}')">
      <img src="${avatar(e)}" class="persona-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(e.name)}&background=0d1425&color=22d3ee&size=64'" alt="${e.name}">
      <div class="persona-info">
        <div class="persona-name">${e.name}</div>
        <div class="persona-role">${e.role || e.position || '—'} · ${e.department || ''}</div>
      </div>
    </div>
  `).join('');
}

function switchPersona(id) {
  const emp = state.employees.find(e => e.id == id);
  if (emp) {
    state.user = emp;
    renderUserChip();
    updateClockinBtn(emp.status);
    closePersonaDropdown();
    showToast(`Viewing as ${emp.name}`, 'info');
    window.sound?.click();
  }
}

function initPersonaToggle() {
  const btn = document.getElementById('btn-user');
  const dd  = document.getElementById('persona-dropdown');
  if (btn && dd) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', () => closePersonaDropdown());
  }
}

function closePersonaDropdown() {
  document.getElementById('persona-dropdown')?.classList.remove('open');
}

function populateEmployeeDropdowns() {
  ['att-employee','leave-employee','vis-host'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<option value="">Select employee…</option>` +
        state.employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
    }
  });
}

/* ─── Topbar Actions ─── */
function initTopbarActions() {
  // Clock-in button
  document.getElementById('btn-clockin')?.addEventListener('click', async () => {
    if (!state.user) return;
    const curStatus = state.user.status || 'out';
    const newStatus = curStatus === 'in-office' ? 'out' : 'in-office';
    try {
      await api.post('/attendance', { employeeId: state.user.id, status: newStatus, date: new Date().toISOString(), checkIn: new Date().toISOString() });
      state.user.status = newStatus;
      const rec = state.attendance.find(a => a.employeeId === state.user.id);
      if (rec) rec.status = newStatus; else state.attendance.push({ employeeId: state.user.id, status: newStatus });
      updateClockinBtn(newStatus);
      showToast(newStatus === 'in-office' ? 'Good morning! Clocked in.' : 'Goodbye! Clocked out.', newStatus === 'in-office' ? 'success' : 'info');
      window.sound?.success();
    } catch(e) { showToast('Attendance update failed', 'error'); }
  });

  // Sound toggle
  document.getElementById('btn-sound')?.addEventListener('click', () => {
    const enabled = window.sound?.toggle();
    const icon = document.getElementById('icon-sound');
    if (icon) icon.className = `fa-solid fa-volume-${enabled ? 'high' : 'xmark'}`;
    showToast(`Audio ${enabled ? 'enabled' : 'muted'}`, 'info');
  });

  // Reset DB
  document.getElementById('btn-reset')?.addEventListener('click', async () => {
    if (!confirm('Reset all demo data?')) return;
    try {
      await api.post('/seed', {});
      showToast('Demo data reset', 'success');
      setTimeout(() => location.reload(), 800);
    } catch(e) { showToast('Reset failed', 'error'); }
  });
}

function updateClockinBtn(status) {
  const btn  = document.getElementById('btn-clockin');
  const lbl  = document.getElementById('clockin-label');
  const dot  = document.getElementById('clockin-dot');
  if (!btn) return;
  const active = (status === 'in-office');
  btn.className = `clockin-btn${active ? ' clocked-out' : ''}`;
  if (lbl) lbl.textContent = active ? 'Clock Out' : 'Clock In';
  if (dot) dot.style.background = active ? 'var(--rose)' : 'var(--emerald)';
}

/* ─── Command Palette ─── */
function initCommandPalette() {
  const overlay = document.getElementById('cmd-overlay');
  const input   = document.getElementById('cmd-input');
  const list    = document.getElementById('cmd-list');

  document.getElementById('cmd-trigger')?.addEventListener('click', () => openCmd());

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmd(); }
    if (e.key === 'Escape') closeCmd();
  });

  overlay?.addEventListener('click', e => { if(e.target === overlay) closeCmd(); });

  input?.addEventListener('input', () => renderCmdItems(input.value));
  input?.addEventListener('keydown', e => {
    const items = list?.querySelectorAll('.cmd-item') || [];
    if (e.key === 'ArrowDown') { state.cmdFocusIdx = Math.min(state.cmdFocusIdx+1, items.length-1); highlightCmd(items); }
    if (e.key === 'ArrowUp')   { state.cmdFocusIdx = Math.max(state.cmdFocusIdx-1, 0); highlightCmd(items); }
    if (e.key === 'Enter')     { items[state.cmdFocusIdx]?.click(); }
  });

  renderCmdItems('');
}

function openCmd() {
  document.getElementById('cmd-overlay')?.classList.add('open');
  setTimeout(() => document.getElementById('cmd-input')?.focus(), 80);
  window.sound?.click();
}

function closeCmd() {
  document.getElementById('cmd-overlay')?.classList.remove('open');
  if (document.getElementById('cmd-input')) document.getElementById('cmd-input').value = '';
}

function highlightCmd(items) {
  items.forEach((item, i) => item.classList.toggle('focused', i === state.cmdFocusIdx));
  items[state.cmdFocusIdx]?.scrollIntoView({block:'nearest'});
}

function renderCmdItems(q) {
  const views = [
    { icon:'fa-chart-tree-map', label:'Overview Dashboard', meta:'view', action: () => navigateTo('dashboard') },
    { icon:'fa-layer-group',    label:'Floor Plan & Desks', meta:'view', action: () => navigateTo('desks') },
    { icon:'fa-chalkboard',     label:'Meeting Rooms',       meta:'view', action: () => navigateTo('rooms') },
    { icon:'fa-id-card-clip',   label:'Personnel Directory', meta:'view', action: () => navigateTo('employees') },
    { icon:'fa-user-clock',     label:'Attendance',          meta:'view', action: () => navigateTo('attendance') },
    { icon:'fa-fingerprint',    label:'Visitors & Badges',   meta:'view', action: () => navigateTo('visitors') },
    { icon:'fa-server',         label:'IT Assets',           meta:'view', action: () => navigateTo('assets') },
  ];

  const empItems = state.employees.map(e => ({
    icon:'fa-user', label:e.name, meta:`${e.department} · ${e.role||e.position||'—'}`,
    action: () => { navigateTo('employees'); closeCmd(); }
  }));

  const all = [...views, ...empItems].filter(i =>
    !q || i.label.toLowerCase().includes(q.toLowerCase()) || (i.meta||'').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 10);

  const list = document.getElementById('cmd-list');
  if (!list) return;

  state.cmdFocusIdx = 0;
  list.innerHTML = all.length ? all.map((item, idx) => `
    <div class="cmd-item${idx===0?' focused':''}" onclick="(${item.action.toString()})();closeCmd()">
      <div class="cmd-item-icon"><i class="fa-solid ${item.icon}"></i></div>
      <div>
        <div class="cmd-item-label">${item.label}</div>
        ${item.meta ? `<div class="cmd-item-meta">${item.meta}</div>` : ''}
      </div>
    </div>
  `).join('') : `<div style="padding:30px;text-align:center;font-size:12px;color:rgba(255,255,255,0.25);font-family:var(--font-mono)">No results for "${q}"</div>`;
}

/* ─── Modal helpers ─── */
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.addEventListener('keydown', escModalListener);
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

function escModalListener(e) {
  if (e.key === 'Escape') {
    ['desk-modal','room-modal','emp-modal','asset-modal'].forEach(id => closeModal(id));
    document.removeEventListener('keydown', escModalListener);
  }
}

/* ─── Toast Notifications ─── */
function showToast(msg, type = 'info') {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warning:'fa-triangle-exclamation' };
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]||'fa-info'} toast-icon"></i><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, 3400);
}

/* ─── Theme (stays dark only — cleaner) ─── */
function initTheme() {
  // Pure dark mode — no toggle needed for v3
}

/* ─── Utility ─── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val ?? '—';
}

function avatar(emp) {
  return emp?.avatar || emp?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp?.name||'X')}&background=0d1425&color=22d3ee&size=64&bold=true`;
}

function capitalise(s) {
  if (!s) return '—';
  return s.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatRelative(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m/60)}h ago`;
}

function infoCell(label, value) {
  return `<div style="background:var(--surface-2);border:1px solid var(--border-1);border-radius:var(--r-sm);padding:10px 12px">
    <div style="font-size:9.5px;font-family:var(--font-mono);color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${label}</div>
    <div style="font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.8)">${value}</div>
  </div>`;
}

// Expose switchFloor for HTML onclick
window.switchFloor = switchFloor;
window.openDeskModal = openDeskModal;
window.closeModal = closeModal;
window.openAddEmployeeModal = openAddEmployeeModal;
window.submitEmployee = submitEmployee;
window.deleteEmployee = deleteEmployee;
window.openRoomModal = openRoomModal;
window.bookDesk = bookDesk;
window.releaseDesk = releaseDesk;
window.bookRoom = bookRoom;
window.releaseRoom = releaseRoom;
window.registerVisitor = registerVisitor;
window.printBadge = printBadge;
window.openAddAssetModal = openAddAssetModal;
window.submitAsset = submitAsset;
window.submitAttendance = submitAttendance;
window.submitLeave = submitLeave;
window.closeCmd = closeCmd;
window.navigateTo = navigateTo;
