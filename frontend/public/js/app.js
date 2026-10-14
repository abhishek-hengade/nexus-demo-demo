// NexusOS Pro — High-Precision Workspace Intelligence System Logic

let state = {
  user: null,
  availablePersonas: [],
  currentFloor: 1,
  activeView: 'dashboard',
  selectedDesk: null,
  selectedRoomId: null,
  deptChartInstance: null,
  latestDeptData: null
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initSoundButton();
  initClock();
  initCommandPalette();
  initEventListeners();
  await loadCurrentUser();
  await loadView(state.activeView);
});

// Precision Real-time Clock
function initClock() {
  const clockEl = document.getElementById('live-clock');
  function update() {
    const now = new Date();
    if (clockEl) {
      clockEl.innerHTML = `<i class="fa-regular fa-clock mr-1 text-cyan-400"></i>${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} IST`;
    }
  }
  update();
  setInterval(update, 1000);
}

// Obsidian Dark / Light Theme
function initTheme() {
  const saved = localStorage.getItem('nexus_theme');
  if (saved === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }

  document.getElementById('btn-dark-toggle')?.addEventListener('click', () => {
    window.sound?.playClick();
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('nexus_theme', isDark ? 'dark' : 'light');
    if (state.deptChartInstance && state.latestDeptData) {
      renderDeptChart(state.latestDeptData);
    }
  });
}

// Sound FX Controller
function initSoundButton() {
  const btn = document.getElementById('btn-sound-toggle');
  const icon = document.getElementById('icon-sound');
  function updateIcon() {
    if (!icon) return;
    const isEnabled = window.sound?.enabled;
    if (isEnabled) {
      icon.className = 'fa-solid fa-volume-high text-xs text-cyan-400';
    } else {
      icon.className = 'fa-solid fa-volume-xmark text-xs text-slate-500';
    }
  }

  updateIcon();
  btn?.addEventListener('click', () => {
    const enabled = window.sound?.toggle();
    updateIcon();
    showToast(`Synthesizer Audio ${enabled ? 'Enabled' : 'Muted'}`, 'info');
  });
}

// Global Event Listeners
function initEventListeners() {
  // Navigation Sidebar
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      window.sound?.playClick();
      const view = btn.dataset.view;
      navigateToView(view);
    });
  });

  // Persona Menu Dropdown
  const personaBtn = document.getElementById('btn-persona-dropdown');
  const personaMenu = document.getElementById('persona-menu');
  if (personaBtn && personaMenu) {
    personaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.sound?.playClick();
      personaMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => personaMenu.classList.add('hidden'));
  }

  // Quick Attendance
  document.getElementById('btn-quick-attendance')?.addEventListener('click', handleAttendanceAction);

  // Reset Demo Database
  document.getElementById('btn-reset-db')?.addEventListener('click', async () => {
    window.sound?.playWarning();
    if (confirm('Reset platform data back to initial architectural seed state?')) {
      try {
        await API.resetDatabase();
        if (typeof confetti === 'function') confetti();
        window.sound?.playSuccess();
        showToast('Database reset to default seed data!', 'success');
        await loadCurrentUser();
        await loadView(state.activeView);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });

  // Employee search and filters
  document.getElementById('input-employee-search')?.addEventListener('input', debounce(loadEmployees, 300));
  document.getElementById('select-dept-filter')?.addEventListener('change', () => { window.sound?.playClick(); loadEmployees(); });
  document.getElementById('select-status-filter')?.addEventListener('change', () => { window.sound?.playClick(); loadEmployees(); });

  // Confirmation actions
  document.getElementById('btn-confirm-desk-booking')?.addEventListener('click', confirmDeskBooking);
  document.getElementById('btn-confirm-room-booking')?.addEventListener('click', confirmRoomBooking);
}

// Animated Numerical Counter
function animateCounter(el, target, suffix = '', duration = 750) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const currentVal = Math.floor(start + (target - start) * ease);

    el.innerText = `${currentVal}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.innerText = `${target}${suffix}`;
    }
  }

  requestAnimationFrame(step);
}

// ================= COMMAND PALETTE (CTRL+K) =================
const COMMANDS = [
  { title: 'Overview Telemetry', desc: 'Real-time telemetry and metrics', icon: 'fa-chart-simple', action: () => navigateToView('dashboard') },
  { title: 'Level 01 CAD Blueprint', desc: 'Inspect & book Level 01 Engineering workstations', icon: 'fa-layer-group', action: () => { navigateToView('desks'); switchFloor(1); } },
  { title: 'Level 02 CAD Blueprint', desc: 'Inspect & book Level 02 Executive & Operations pods', icon: 'fa-layer-group', action: () => { navigateToView('desks'); switchFloor(2); } },
  { title: 'Conference Pods', desc: 'Reserve rooms and inspect live schedules', icon: 'fa-door-open', action: () => navigateToView('rooms') },
  { title: 'Personnel Directory', desc: 'Staff directory with filters and contact cards', icon: 'fa-id-card-clip', action: () => navigateToView('employees') },
  { title: 'Clock Shift In / Out', desc: 'Timestamp your active presence on campus', icon: 'fa-fingerprint', action: handleAttendanceAction },
  { title: 'Issue Visitor Clearance', desc: 'Generate NFC & QR code visitor badge', icon: 'fa-id-card', action: () => openModal('modal-add-visitor') },
  { title: 'Onboard Staff Member', desc: 'Add new profile to directory', icon: 'fa-user-plus', action: () => openModal('modal-add-employee') },
  { title: 'Hardware Inventory', desc: 'Track MacBooks, 4K Displays & equipment', icon: 'fa-server', action: () => navigateToView('assets') },
  { title: 'Toggle Theme', desc: 'Switch Dark/Light visual mode', icon: 'fa-moon', action: () => document.getElementById('btn-dark-toggle')?.click() },
  { title: 'Restore Seed Data', desc: 'Wipe and reload clean demo records', icon: 'fa-arrows-rotate', action: () => document.getElementById('btn-reset-db')?.click() }
];

function initCommandPalette() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    if (e.key === 'Escape') {
      closeCommandPalette();
    }
  });

  const input = document.getElementById('input-command-palette');
  input?.addEventListener('input', (e) => renderCommandResults(e.target.value));
}

window.openCommandPalette = function () {
  window.sound?.playPop();
  const modal = document.getElementById('modal-command-palette');
  const input = document.getElementById('input-command-palette');
  if (modal && input) {
    modal.classList.remove('hidden');
    input.value = '';
    renderCommandResults('');
    input.focus();
  }
};

window.closeCommandPalette = function () {
  document.getElementById('modal-command-palette')?.classList.add('hidden');
};

function renderCommandResults(query = '') {
  const container = document.getElementById('command-palette-results');
  if (!container) return;

  const q = query.toLowerCase().trim();
  const filtered = COMMANDS.filter(c => c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-6 text-center text-slate-500 font-mono text-xs">
        No matching system commands found.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((c, idx) => `
    <button onclick="executeCommand(${COMMANDS.indexOf(c)})" class="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 text-left transition-colors group">
      <div class="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs">
        <i class="fa-solid ${c.icon}"></i>
      </div>
      <div class="flex-1">
        <div class="font-bold text-white text-xs">${c.title}</div>
        <div class="text-[10px] text-slate-400">${c.desc}</div>
      </div>
      <i class="fa-solid fa-chevron-right text-[10px] text-slate-500 group-hover:text-cyan-400 transition-colors"></i>
    </button>
  `).join('');
}

window.executeCommand = function (index) {
  closeCommandPalette();
  const cmd = COMMANDS[index];
  if (cmd && cmd.action) {
    cmd.action();
  }
};

// ================= PERSONAS & CURRENT USER =================
async function loadCurrentUser() {
  try {
    const res = await API.getMe();
    state.user = res.data.user;
    state.availablePersonas = res.data.availablePersonas;

    document.getElementById('current-user-name').innerText = state.user.name;
    document.getElementById('current-user-role').innerText = state.user.role;
    document.getElementById('current-user-avatar').src = state.user.avatar;

    const listEl = document.getElementById('persona-list');
    if (listEl) {
      listEl.innerHTML = state.availablePersonas.map(p => `
        <button onclick="switchUserPersona('${p.id}')" class="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors ${p.id === state.user.id ? 'bg-cyan-500/10 font-bold' : ''}">
          <img src="${p.avatar}" class="w-7 h-7 rounded-lg object-cover">
          <div class="truncate">
            <div class="text-xs text-white">${p.name}</div>
            <div class="text-[10px] text-slate-400 font-mono">${p.role}</div>
          </div>
          ${p.id === state.user.id ? '<i class="fa-solid fa-check text-cyan-400 text-xs ml-auto"></i>' : ''}
        </button>
      `).join('');
    }

    const hostSelect = document.getElementById('vis-host');
    if (hostSelect) {
      hostSelect.innerHTML = state.availablePersonas.map(p => `
        <option value="${p.name}">${p.name} (${p.department})</option>
      `).join('');
    }

  } catch (err) {
    console.error('Failed to load user persona:', err);
  }
}

window.switchUserPersona = async function (id) {
  window.sound?.playClick();
  API.setUserId(id);
  await loadCurrentUser();
  showToast(`Active Persona switched to ${state.user.name}`, 'info');
  await loadView(state.activeView);
};

// ================= NAVIGATION =================
window.navigateToView = async function (viewName) {
  state.activeView = viewName;

  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.dataset.view === viewName) {
      btn.className = 'nav-item w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-sm';
    } else {
      btn.className = 'nav-item w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-slate-400 hover:bg-white/5 hover:text-white';
    }
  });

  document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));

  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.remove('hidden');
  }

  const titles = {
    dashboard: 'Overview Telemetry',
    desks: 'CAD Floor Blueprint & Workstation Grid',
    rooms: 'Conference Pods & AV Systems',
    employees: 'Personnel Directory & Roster',
    attendance: 'Shift Logging & Clearances',
    visitors: 'Campus Security & Visitor Pass',
    assets: 'Hardware & Peripheral Inventory'
  };
  document.getElementById('current-view-title').innerText = titles[viewName] || 'Dashboard';

  await loadView(viewName);
};

async function loadView(viewName) {
  switch (viewName) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'desks':
      await loadDesks(state.currentFloor);
      break;
    case 'rooms':
      await loadRooms();
      break;
    case 'employees':
      await loadEmployees();
      break;
    case 'attendance':
      await loadAttendance();
      break;
    case 'visitors':
      await loadVisitors();
      break;
    case 'assets':
      await loadAssets();
      break;
  }
}

// ================= 1. DASHBOARD =================
async function loadDashboard() {
  try {
    const res = await API.getDashboard();
    const { metrics, departments, announcements, recentActivity } = res.data;

    animateCounter(document.getElementById('stat-total-employees'), metrics.totalEmployees);
    animateCounter(document.getElementById('stat-in-office'), metrics.inOfficeToday);
    document.getElementById('stat-remote-sub').innerText = `${metrics.remoteToday} Remote`;
    animateCounter(document.getElementById('stat-desk-rate'), metrics.deskOccupancyRate, '%');
    document.getElementById('stat-desk-count').innerText = `${metrics.occupiedDesks} / ${metrics.totalDesks} Desks`;
    document.getElementById('stat-desk-progress').style.width = `${metrics.deskOccupancyRate}%`;
    animateCounter(document.getElementById('stat-booked-rooms'), metrics.bookedRooms);

    const availBadge = document.getElementById('badge-available-desks');
    if (availBadge) availBadge.innerText = `${metrics.availableDesks} Free`;

    // Campus Notices
    const annEl = document.getElementById('dashboard-announcements');
    annEl.innerHTML = announcements.map(a => `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-obsidian-850 border border-slate-200 dark:border-white/5">
        <div class="flex items-center justify-between text-[10px] font-mono mb-1">
          <span class="text-cyan-400 font-bold">${a.category}</span>
          <span class="text-slate-500">${a.date}</span>
        </div>
        <div class="font-bold text-xs text-white leading-snug">${a.title}</div>
        <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">${a.content}</p>
      </div>
    `).join('');

    // Telemetry Activity Feed
    const actEl = document.getElementById('dashboard-activity');
    actEl.innerHTML = recentActivity.map(act => `
      <div class="flex items-center gap-2.5 font-mono text-[11px]">
        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        <span class="flex-1 truncate text-slate-300">${act.text}</span>
        <span class="text-[10px] text-slate-500 whitespace-nowrap">${act.time}</span>
      </div>
    `).join('');

    state.latestDeptData = departments;
    renderDeptChart(departments);

  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderDeptChart(departments) {
  const canvas = document.getElementById('deptChart');
  if (!canvas) return;

  if (state.deptChartInstance) {
    state.deptChartInstance.destroy();
  }

  const isDark = document.documentElement.classList.contains('dark');
  const labels = Object.keys(departments);
  const data = Object.values(departments);

  state.deptChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Personnel Headcount',
        data,
        backgroundColor: [
          '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'
        ],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: isDark ? '#64748b' : '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
          ticks: { stepSize: 1, color: isDark ? '#64748b' : '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        }
      }
    }
  });
}

// ================= 2. ARCHITECTURAL CAD DESK GRID =================
window.switchFloor = function (floorNum) {
  window.sound?.playClick();
  state.currentFloor = floorNum;
  
  const f1 = document.getElementById('tab-floor-1');
  const f2 = document.getElementById('tab-floor-2');
  if (floorNum === 1) {
    f1.className = 'px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all bg-cyan-500 text-white shadow-sm';
    f2.className = 'px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all text-slate-400 hover:text-white';
    document.getElementById('floor-title').innerText = 'LEVEL 01: Engineering & UX Wing';
  } else {
    f2.className = 'px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all bg-cyan-500 text-white shadow-sm';
    f1.className = 'px-4 py-1.5 rounded-lg text-xs font-mono font-bold transition-all text-slate-400 hover:text-white';
    document.getElementById('floor-title').innerText = 'LEVEL 02: Executive & Operations Wing';
  }

  loadDesks(floorNum);
};

async function loadDesks(floor = 1) {
  try {
    const res = await API.getDesks(floor);
    const container = document.getElementById('desks-container');
    if (!container) return;

    container.innerHTML = res.data.map(desk => {
      const isAvailable = desk.status === 'Available';
      const isOccupied = desk.status === 'Occupied';
      const isReserved = desk.status === 'Reserved';
      const isMine = desk.bookedEmail === state.user.email;

      let statusClass = 'status-available';
      let dotColor = 'bg-emerald-500';
      if (isOccupied) { statusClass = 'status-occupied'; dotColor = 'bg-rose-500'; }
      if (isReserved) { statusClass = 'status-reserved'; dotColor = 'bg-indigo-500'; }
      if (desk.status === 'Under Maintenance') { statusClass = 'status-maintenance'; dotColor = 'bg-amber-500'; }

      return `
        <div onclick="handleDeskClick('${desk.id}')" class="workstation-pod ${statusClass}">
          <div class="flex items-center justify-between mb-2">
            <span class="font-mono font-bold text-xs text-white">${desk.id}</span>
            <span class="w-2 h-2 rounded-full ${dotColor} ${isAvailable ? 'radar-beacon' : ''}"></span>
          </div>

          <!-- Top-down CAD Desk Drawing Representation -->
          <div class="my-3 py-2 px-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
            <div class="text-[11px] font-mono text-slate-300 truncate">${desk.type}</div>
            <i class="fa-solid fa-display text-slate-400 text-xs"></i>
          </div>

          <div class="text-[10px] font-mono text-slate-500 uppercase tracking-wider truncate mb-1">
            ${desk.section}
          </div>

          ${desk.bookedBy ? `
            <div class="text-[11px] font-mono font-bold text-white truncate flex items-center gap-1.5">
              <i class="fa-solid fa-user-check text-cyan-400 text-[10px]"></i>
              <span class="truncate">${isMine ? 'You' : desk.bookedBy}</span>
            </div>
          ` : `
            <div class="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
              <i class="fa-solid fa-plus text-[10px]"></i> Free to Book
            </div>
          `}
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load desks:', err);
  }
}

window.handleDeskClick = async function (deskId) {
  try {
    const res = await API.getDesks();
    const desk = res.data.find(d => d.id === deskId);
    if (!desk) return;

    state.selectedDesk = desk;

    if (desk.bookedEmail === state.user.email) {
      window.sound?.playWarning();
      if (confirm(`You currently have ${desk.id} allocated. Release workstation?`)) {
        await API.releaseDesk(desk.id);
        window.sound?.playSuccess();
        showToast(`${desk.id} released to pool`, 'info');
        await loadDesks(state.currentFloor);
        await loadDashboard();
      }
      return;
    }

    if (desk.status !== 'Available') {
      window.sound?.playWarning();
      showToast(`${desk.id} is occupied by ${desk.bookedBy || 'another staff member'}.`, 'warning');
      return;
    }

    window.sound?.playPop();
    document.getElementById('modal-desk-id').innerText = desk.id;
    document.getElementById('modal-desk-type').innerText = desk.type;
    document.getElementById('modal-desk-section').innerText = desk.section;
    document.getElementById('modal-desk-floor').innerText = `Level 0${desk.floor}`;
    document.getElementById('input-desk-booked-by').value = `${state.user.name} (${state.user.email})`;

    openModal('modal-book-desk');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

async function confirmDeskBooking() {
  if (!state.selectedDesk) return;
  try {
    const res = await API.bookDesk(state.selectedDesk.id, {
      bookedBy: state.user.name,
      bookedEmail: state.user.email
    });

    closeModal('modal-book-desk');
    window.sound?.playSuccess();
    if (typeof confetti === 'function') confetti();
    showToast(res.message, 'success');
    await loadDesks(state.currentFloor);
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ================= 3. CONFERENCE PODS & TIMELINES =================
async function loadRooms() {
  try {
    const res = await API.getRooms();
    const container = document.getElementById('rooms-container');
    if (!container) return;

    container.innerHTML = res.data.map(room => {
      const isBooked = room.status === 'Booked';

      return `
        <div class="pro-card p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3 font-mono">
              <span class="text-[10px] text-slate-500 uppercase">Level 0${room.floor}</span>
              <span class="status-pill ${isBooked ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
                <span class="w-1.5 h-1.5 rounded-full ${isBooked ? 'bg-amber-400' : 'bg-emerald-400'}"></span>
                ${room.status}
              </span>
            </div>

            <h4 class="font-extrabold text-base text-white tracking-tight">${room.name}</h4>
            <div class="text-xs font-mono text-slate-400 mt-1 flex items-center gap-2">
              <i class="fa-solid fa-users text-cyan-500"></i> Max Capacity: ${room.capacity} Engineers
            </div>

            <!-- AV Hardware Badges -->
            <div class="flex flex-wrap gap-1.5 my-3.5">
              ${room.amenities.map(a => `
                <span class="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-slate-300">${a}</span>
              `).join('')}
            </div>

            <!-- Visual 9 AM - 6 PM Schedule Occupancy Bar -->
            <div class="my-3 font-mono text-[10px]">
              <div class="flex justify-between text-slate-500 mb-1">
                <span>09:00</span>
                <span>13:00</span>
                <span>18:00</span>
              </div>
              <div class="w-full h-2 rounded-full bg-white/5 flex overflow-hidden border border-white/5">
                <div class="h-full bg-emerald-500/40" style="width: 35%"></div>
                <div class="h-full ${isBooked ? 'bg-amber-500' : 'bg-emerald-500/40'}" style="width: 35%"></div>
                <div class="h-full bg-emerald-500/40" style="width: 30%"></div>
              </div>
            </div>

            <!-- Booking Info -->
            ${isBooked && room.currentBooking ? `
              <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono my-3">
                <div class="font-bold text-amber-300 truncate">${room.currentBooking.title}</div>
                <div class="text-[10px] text-amber-400 mt-0.5">
                  ${room.currentBooking.startTime} - ${room.currentBooking.endTime} • Lead: ${room.currentBooking.bookedBy}
                </div>
              </div>
            ` : `
              <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 my-3 flex items-center gap-2">
                <i class="fa-regular fa-clock"></i> Open for reservation
              </div>
            `}
          </div>

          <div class="mt-2 font-mono">
            ${isBooked ? `
              <button onclick="cancelRoomBooking('${room.id}')" class="w-full py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-rose-400 transition-colors">
                Free Up Pod
              </button>
            ` : `
              <button onclick="openRoomBookingModal('${room.id}', '${room.name}')" class="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-white shadow-md shadow-cyan-500/20 transition-all">
                Reserve Pod
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load rooms:', err);
  }
}

window.openRoomBookingModal = function (roomId, roomName) {
  window.sound?.playPop();
  state.selectedRoomId = roomId;
  document.getElementById('modal-room-name').innerText = roomName;
  document.getElementById('input-room-organizer').value = state.user.name;
  openModal('modal-book-room');
};

async function confirmRoomBooking() {
  const title = document.getElementById('input-room-title').value.trim();
  const startTime = document.getElementById('input-room-start').value;
  const endTime = document.getElementById('input-room-end').value;

  if (!title) {
    window.sound?.playWarning();
    showToast('Enter session title', 'warning');
    return;
  }

  try {
    const res = await API.bookRoom(state.selectedRoomId, {
      title,
      startTime,
      endTime,
      bookedBy: state.user.name
    });

    closeModal('modal-book-room');
    window.sound?.playSuccess();
    if (typeof confetti === 'function') confetti();
    showToast(res.message, 'success');
    await loadRooms();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.cancelRoomBooking = async function (roomId) {
  window.sound?.playWarning();
  if (confirm('Release conference room reservation?')) {
    try {
      const res = await API.cancelRoom(roomId);
      window.sound?.playClick();
      showToast(res.message, 'info');
      await loadRooms();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

// ================= 4. STAFF DIRECTORY =================
async function loadEmployees() {
  const search = document.getElementById('input-employee-search')?.value || '';
  const department = document.getElementById('select-dept-filter')?.value || 'All';
  const status = document.getElementById('select-status-filter')?.value || 'All';

  try {
    const res = await API.getEmployees({ search, department, status });
    const container = document.getElementById('employees-container');
    if (!container) return;

    if (res.data.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
          No personnel match your search filters.
        </div>
      `;
      return;
    }

    container.innerHTML = res.data.map(emp => {
      const isOnline = emp.status === 'In-Office';
      const isRemote = emp.status === 'Remote';

      let statusBadge = 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      if (isOnline) statusBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      if (isRemote) statusBadge = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';

      return `
        <div class="pro-card p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-3">
              <img src="${emp.avatar}" class="w-11 h-11 rounded-xl object-cover ring-1 ring-white/10">
              <span class="status-pill ${statusBadge}">
                ${emp.status}
              </span>
            </div>

            <h4 class="font-bold text-sm text-white">${emp.name}</h4>
            <p class="text-xs text-cyan-400 font-mono mt-0.5">${emp.role}</p>
            <p class="text-[10px] text-slate-400 uppercase font-mono">${emp.department}</p>

            <div class="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-[11px] font-mono text-slate-400">
              <div class="flex items-center gap-2 truncate">
                <i class="fa-regular fa-envelope text-slate-500"></i>
                <span class="truncate text-slate-300">${emp.email}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-phone text-slate-500"></i>
                <span class="text-slate-300">${emp.phone}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-chair text-slate-500"></i>
                <span class="text-slate-300">${emp.deskId ? `Desk ${emp.deskId}` : 'Hot-Desk Flex'}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-between font-mono text-xs">
            <button onclick="switchUserPersona('${emp.id}')" class="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold">
              Switch Persona &rarr;
            </button>
            <button onclick="deleteEmployee('${emp.id}')" class="text-slate-500 hover:text-rose-400 p-1">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load employees:', err);
  }
}

window.handleCreateEmployee = async function (e) {
  e.preventDefault();
  const name = document.getElementById('new-emp-name').value.trim();
  const email = document.getElementById('new-emp-email').value.trim();
  const role = document.getElementById('new-emp-role').value.trim();
  const department = document.getElementById('new-emp-dept').value;
  const phone = document.getElementById('new-emp-phone').value.trim();
  const status = document.getElementById('new-emp-status').value;

  try {
    const res = await API.createEmployee({ name, email, role, department, phone, status });
    closeModal('modal-add-employee');
    window.sound?.playSuccess();
    showToast(res.message, 'success');
    document.getElementById('form-add-employee').reset();
    await loadEmployees();
    await loadCurrentUser();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteEmployee = async function (id) {
  window.sound?.playWarning();
  if (confirm('De-register personnel profile?')) {
    try {
      const res = await API.deleteEmployee(id);
      showToast(res.message, 'info');
      await loadEmployees();
      await loadCurrentUser();
      await loadDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

// ================= 5. ATTENDANCE & LEAVES =================
async function loadAttendance() {
  try {
    const [attRes, leavesRes] = await Promise.all([
      API.getAttendanceToday(),
      API.getLeaves()
    ]);

    const activeLog = attRes.data.find(a => a.employeeId === state.user.id && !a.clockOut);
    const statusLabel = document.getElementById('attendance-status-label');
    const clockActionBtn = document.getElementById('btn-clock-action-text');
    const quickBtnText = document.getElementById('quick-attendance-text');

    if (activeLog) {
      if (statusLabel) {
        statusLabel.innerText = `Online (${activeLog.clockIn})`;
        statusLabel.className = 'font-mono font-bold text-sm text-emerald-400';
      }
      if (clockActionBtn) clockActionBtn.innerText = 'Clock Out Shift';
      if (quickBtnText) quickBtnText.innerText = 'Clock Out';
    } else {
      if (statusLabel) {
        statusLabel.innerText = 'Shift Concluded';
        statusLabel.className = 'font-mono font-bold text-sm text-slate-500';
      }
      if (clockActionBtn) clockActionBtn.innerText = 'Clock In Shift';
      if (quickBtnText) quickBtnText.innerText = 'Clock In';
    }

    document.getElementById('attendance-count-badge').innerText = `${attRes.data.length} Present`;

    const tableBody = document.getElementById('attendance-table-body');
    if (tableBody) {
      tableBody.innerHTML = attRes.data.map(log => `
        <tr class="hover:bg-white/5 font-mono text-xs">
          <td class="py-2.5 font-bold text-white">${log.employeeName}</td>
          <td class="py-2.5 text-slate-400">${log.clockIn}</td>
          <td class="py-2.5">
            <span class="status-pill ${log.mode === 'Remote' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
              ${log.mode}
            </span>
          </td>
          <td class="py-2.5 text-slate-400">${log.clockOut ? `Done (${log.clockOut})` : 'Active'}</td>
        </tr>
      `).join('');
    }

    const leavesList = document.getElementById('leaves-list-container');
    if (leavesList) {
      leavesList.innerHTML = leavesRes.data.map(lv => {
        const isPending = lv.status === 'Pending';
        const isApproved = lv.status === 'Approved';

        let badge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        if (isApproved) badge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        if (lv.status === 'Rejected') badge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

        return `
          <div class="p-3 rounded-xl bg-obsidian-850 border border-white/5 flex items-start justify-between gap-3 font-mono text-xs">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-bold text-white">${lv.employeeName}</span>
                <span class="status-pill ${badge}">${lv.status}</span>
              </div>
              <div class="text-[11px] text-cyan-400 font-bold">${lv.leaveType} (${lv.days} day)</div>
              <div class="text-[10px] text-slate-500 mt-0.5">${lv.startDate} to ${lv.endDate} • "${lv.reason}"</div>
            </div>

            ${isPending ? `
              <div class="flex items-center gap-1.5 whitespace-nowrap">
                <button onclick="updateLeave('${lv.id}', 'Approved')" class="px-2.5 py-1 rounded-lg font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                  Approve
                </button>
                <button onclick="updateLeave('${lv.id}', 'Rejected')" class="px-2.5 py-1 rounded-lg font-bold bg-white/5 text-rose-400 hover:bg-white/10 transition-colors">
                  Reject
                </button>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

  } catch (err) {
    console.error('Failed to load attendance:', err);
  }
}

window.handleAttendanceAction = async function () {
  try {
    const attRes = await API.getAttendanceToday();
    const active = attRes.data.find(a => a.employeeId === state.user.id && !a.clockOut);

    if (active) {
      const res = await API.clockOut({ employeeId: state.user.id });
      window.sound?.playClick();
      showToast(res.message, 'info');
    } else {
      const res = await API.clockIn({
        employeeId: state.user.id,
        employeeName: state.user.name,
        mode: state.user.status === 'Remote' ? 'Remote' : 'In-Office'
      });
      window.sound?.playSuccess();
      if (typeof confetti === 'function') confetti();
      showToast(res.message, 'success');
    }

    await loadAttendance();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.handleApplyLeave = async function (e) {
  e.preventDefault();
  const leaveType = document.getElementById('leave-type').value;
  const startDate = document.getElementById('leave-start-date').value;
  const endDate = document.getElementById('leave-end-date').value;
  const reason = document.getElementById('leave-reason').value.trim();

  try {
    const res = await API.applyLeave({
      employeeId: state.user.id,
      employeeName: state.user.name,
      department: state.user.department,
      leaveType,
      startDate,
      endDate,
      days: 1,
      reason
    });

    closeModal('modal-apply-leave');
    window.sound?.playSuccess();
    showToast(res.message, 'success');
    document.getElementById('form-apply-leave').reset();
    await loadAttendance();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.updateLeave = async function (id, status) {
  try {
    const res = await API.updateLeaveStatus(id, status);
    if (status === 'Approved') {
      window.sound?.playSuccess();
    } else {
      window.sound?.playClick();
    }
    showToast(res.message, status === 'Approved' ? 'success' : 'info');
    await loadAttendance();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ================= 6. VISITORS & 3D BADGES =================
async function loadVisitors() {
  try {
    const res = await API.getVisitors();
    const tbody = document.getElementById('visitors-table-body');
    if (!tbody) return;

    tbody.innerHTML = res.data.map(vis => {
      const isCheckedIn = vis.status === 'Checked-In';

      return `
        <tr class="hover:bg-white/5 font-mono text-xs">
          <td class="py-3 font-bold text-cyan-400">${vis.badgeNumber}</td>
          <td class="py-3 font-bold text-white">${vis.name}</td>
          <td class="py-3 text-slate-400">${vis.company}</td>
          <td class="py-3 text-slate-400">${vis.hostEmployee}</td>
          <td class="py-3 text-slate-400">${vis.purpose}</td>
          <td class="py-3 text-slate-400">${vis.checkInTime || 'Expected'}</td>
          <td class="py-3">
            <span class="status-pill ${isCheckedIn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}">
              ${vis.status}
            </span>
          </td>
          <td class="py-3 text-right space-x-2">
            <button onclick="viewVisitorBadge('${vis.id}')" class="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors">
              Pass NFC
            </button>
            ${isCheckedIn ? `
              <button onclick="checkoutVisitor('${vis.id}')" class="px-2.5 py-1 rounded-lg bg-white/5 text-rose-400 hover:bg-white/10 transition-colors">
                Check Out
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load visitors:', err);
  }
}

window.handleCreateVisitor = async function (e) {
  e.preventDefault();
  const name = document.getElementById('vis-name').value.trim();
  const company = document.getElementById('vis-company').value.trim();
  const hostEmployee = document.getElementById('vis-host').value;
  const purpose = document.getElementById('vis-purpose').value.trim();
  const ndaSigned = document.getElementById('vis-nda').checked;

  try {
    const res = await API.createVisitor({ name, company, hostEmployee, purpose, ndaSigned, checkInNow: true });
    closeModal('modal-add-visitor');
    window.sound?.playSuccess();
    showToast(res.message, 'success');
    document.getElementById('form-add-visitor').reset();
    await loadVisitors();
    await loadDashboard();
    viewVisitorBadge(res.data.id);
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.viewVisitorBadge = async function (id) {
  try {
    const res = await API.getVisitorBadge(id);
    const vis = res.data;

    document.getElementById('badge-vis-name').innerText = vis.name;
    document.getElementById('badge-vis-company').innerText = vis.company;
    document.getElementById('badge-vis-id').innerText = vis.badgeNumber;
    document.getElementById('badge-vis-host').innerText = vis.hostEmployee;
    document.getElementById('badge-vis-date').innerText = vis.date;

    document.getElementById('badge-flipper')?.classList.remove('is-flipped');
    openModal('modal-visitor-badge');
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.flipBadge = function () {
  window.sound?.playClick();
  document.getElementById('badge-flipper')?.classList.toggle('is-flipped');
};

window.checkoutVisitor = async function (id) {
  try {
    const res = await API.checkoutVisitor(id);
    window.sound?.playClick();
    showToast(res.message, 'info');
    await loadVisitors();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ================= 7. HARDWARE ASSETS =================
async function loadAssets() {
  try {
    const res = await API.getAssets();
    const container = document.getElementById('assets-container');
    if (!container) return;

    container.innerHTML = res.data.map(asset => {
      const isInUse = asset.status === 'In Use';

      return `
        <div class="pro-card p-5 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3 font-mono">
              <span class="text-[10px] text-slate-500 uppercase">${asset.category}</span>
              <span class="status-pill ${isInUse ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
                ${asset.status}
              </span>
            </div>

            <h4 class="font-bold text-sm text-white">${asset.name}</h4>
            <div class="font-mono text-[10px] text-slate-500 mt-1">SN: ${asset.serialNumber}</div>

            <div class="mt-4 p-3 rounded-xl bg-obsidian-850 border border-white/5 font-mono text-[11px] space-y-1">
              <div class="flex justify-between">
                <span class="text-slate-500">Holder:</span>
                <span class="font-bold text-white">${asset.assignedTo || 'In Vault Storage'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Condition:</span>
                <span class="text-emerald-400">${asset.condition}</span>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-white/5 font-mono text-xs">
            ${isInUse ? `
              <button onclick="toggleAssetAssign('${asset.id}', 'None')" class="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
                Return to Vault
              </button>
            ` : `
              <button onclick="toggleAssetAssign('${asset.id}', '${state.user.name}')" class="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-bold transition-all shadow-md shadow-cyan-500/20">
                Claim for My Setup
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load assets:', err);
  }
}

window.toggleAssetAssign = async function (id, assignee) {
  try {
    const res = await API.assignAsset(id, assignee);
    window.sound?.playSuccess();
    showToast(res.message, 'success');
    await loadAssets();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.handleCreateAsset = async function (e) {
  e.preventDefault();
  const name = document.getElementById('asset-name').value.trim();
  const category = document.getElementById('asset-category').value;
  const condition = document.getElementById('asset-condition').value;

  try {
    const res = await API.createAsset({ name, category, condition });
    closeModal('modal-add-asset');
    window.sound?.playSuccess();
    showToast(res.message, 'success');
    document.getElementById('form-add-asset').reset();
    await loadAssets();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ================= MODAL HELPERS =================
window.openModal = function (modalId) {
  window.sound?.playPop();
  document.getElementById(modalId)?.classList.remove('hidden');
};

window.closeModal = function (modalId) {
  window.sound?.playClick();
  document.getElementById(modalId)?.classList.add('hidden');
};

function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}
