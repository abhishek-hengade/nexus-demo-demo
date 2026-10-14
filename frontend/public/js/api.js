// API Client for Nexus Office Management App

const API = {
  currentUserId: localStorage.getItem('nexus_user_id') || 'emp-101',

  setUserId(id) {
    this.currentUserId = id;
    localStorage.setItem('nexus_user_id', id);
  },

  async request(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId,
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth / Personas
  getMe: () => API.request('/auth/me'),
  login: (credentials) => API.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  // Stats / Dashboard
  getDashboard: () => API.request('/stats/dashboard'),
  resetDatabase: () => API.request('/stats/reset', { method: 'POST' }),

  // Employees
  getEmployees: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return API.request(`/employees${q ? `?${q}` : ''}`);
  },
  getEmployee: (id) => API.request(`/employees/${id}`),
  createEmployee: (emp) => API.request('/employees', { method: 'POST', body: JSON.stringify(emp) }),
  updateEmployee: (id, updates) => API.request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  deleteEmployee: (id) => API.request(`/employees/${id}`, { method: 'DELETE' }),

  // Desks
  getDesks: (floor) => API.request(`/desks${floor ? `?floor=${floor}` : ''}`),
  bookDesk: (id, payload = {}) => API.request(`/desks/${id}/book`, { method: 'POST', body: JSON.stringify(payload) }),
  releaseDesk: (id) => API.request(`/desks/${id}/release`, { method: 'POST' }),

  // Rooms
  getRooms: () => API.request('/rooms'),
  bookRoom: (id, payload) => API.request(`/rooms/${id}/book`, { method: 'POST', body: JSON.stringify(payload) }),
  cancelRoom: (id) => API.request(`/rooms/${id}/cancel`, { method: 'POST' }),

  // Attendance & Leaves
  getAttendanceToday: () => API.request('/attendance/today'),
  clockIn: (payload) => API.request('/attendance/clock-in', { method: 'POST', body: JSON.stringify(payload) }),
  clockOut: (payload) => API.request('/attendance/clock-out', { method: 'POST', body: JSON.stringify(payload) }),
  getLeaves: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return API.request(`/attendance/leaves${q ? `?${q}` : ''}`);
  },
  applyLeave: (payload) => API.request('/attendance/leaves', { method: 'POST', body: JSON.stringify(payload) }),
  updateLeaveStatus: (id, status) => API.request(`/attendance/leaves/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Visitors
  getVisitors: () => API.request('/visitors'),
  createVisitor: (payload) => API.request('/visitors', { method: 'POST', body: JSON.stringify(payload) }),
  checkoutVisitor: (id) => API.request(`/visitors/${id}/checkout`, { method: 'PUT' }),
  getVisitorBadge: (id) => API.request(`/visitors/${id}/badge`),

  // Assets
  getAssets: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return API.request(`/assets${q ? `?${q}` : ''}`);
  },
  createAsset: (payload) => API.request('/assets', { method: 'POST', body: JSON.stringify(payload) }),
  assignAsset: (id, assignedTo) => API.request(`/assets/${id}/assign`, { method: 'POST', body: JSON.stringify({ assignedTo }) })
};

// UI Notification / Toast helper
window.showToast = function (message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-600 text-white border-emerald-700',
    error: 'bg-rose-600 text-white border-rose-700',
    info: 'bg-indigo-600 text-white border-indigo-700',
    warning: 'bg-amber-600 text-white border-amber-700'
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all duration-300 transform translate-y-2 opacity-0 ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-base"></i>
    <span class="flex-1">${message}</span>
    <button class="opacity-75 hover:opacity-100 text-sm ml-2 focus:outline-none">&times;</button>
  `;

  const closeBtn = toast.querySelector('button');
  closeBtn.onclick = () => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  };

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  });

  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 250);
    }
  }, 4000);
};

window.API = API;
