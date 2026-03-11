// ===== BASIC PAGE SWITCH (for non-hash buttons like Get Started) =====
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');
}

// ===== PHASE 2: CLIENT-SIDE ROUTING =====

let currentUser = null; 

// clear forms when navigating
function clearLoginForm() {
  const email = document.getElementById("login-email");
  const pw = document.getElementById("login-password");
  if (email) email.value = "";
  if (pw) pw.value = "";
}

function clearRegisterForm() {
  const f = document.getElementById("reg-first");
  const l = document.getElementById("reg-last");
  const e = document.getElementById("reg-email");
  const p = document.getElementById("reg-password");
  if (f) f.value = "";
  if (l) l.value = "";
  if (e) e.value = "";
  if (p) p.value = "";
}

// show green banner on login after verification
function showLoginVerifiedBannerIfNeeded() {
  const flag = localStorage.getItem("just_verified");
  const err = document.getElementById("login-error");
  if (!err) return;

  if (flag === "1") {
    localStorage.removeItem("just_verified");
    err.classList.remove("alert-danger");
    err.classList.add("alert-success");
    err.textContent = "Email verified! You may now log in.";
    err.classList.remove("d-none");
  } else {
    err.classList.add("alert-danger");
    err.classList.remove("alert-success");
    err.classList.add("d-none");
    err.textContent = "";
  }
}

const ROUTE_MAP = {
  "#/": "home-page",
  "#/register": "register-page",
  "#/verify-email": "verify-page",
  "#/login": "login-page",
  "#/profile": "profile-page",
  "#/accounts": "accounts-page",
  "#/departments": "departments-page",
  "#/employees": "employees-page",
  "#/requests": "requests-page",
  "#/admin-requests": "admin-requests-page"
};

const PROTECTED_ROUTES = [
  "#/profile",
  "#/accounts",
  "#/departments",
  "#/employees",
  "#/requests",
  "#/admin-requests"
];

const ADMIN_ROUTES = ["#/accounts", "#/departments", "#/employees", "#/admin-requests"];

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  let hash = window.location.hash || "#/";
  if (!ROUTE_MAP[hash]) {
    hash = "#/";
  }

  const isAuth = !!currentUser;
  const isAdmin = isAuth && currentUser.role === "admin";

  if (!isAuth && PROTECTED_ROUTES.includes(hash)) {
    hash = "#/login";
    window.location.hash = hash;
  }

  if (!isAdmin && ADMIN_ROUTES.includes(hash)) {
    hash = "#/";
    window.location.hash = hash;
  }

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const pageId = ROUTE_MAP[hash];
  const pageEl = document.getElementById(pageId);
  if (pageEl) pageEl.classList.add("active");

  if (hash === "#/profile") renderProfile();
  if (hash === "#/accounts") renderAccountsList();
  if (hash === "#/departments") renderDepartments();
  if (hash === "#/employees") renderEmployeesTable();
  if (hash === "#/requests") renderRequests();
  if (hash === "#/admin-requests") renderAdminRequests();
  if (hash === "#/login") {
    clearLoginForm();
    showLoginVerifiedBannerIfNeeded();
  }
  if (hash === "#/register") clearRegisterForm();
}

window.addEventListener("hashchange", handleRouting);

// ===== PHASE 4: STORAGE & DB SEED =====

const STORAGE_KEY = "ipt_demo_v1";

function seedDb() {
  window.db = {
    accounts: [
      {
        id: 1,
        firstName: "Admin",
        lastName: "User",
        email: "admin@example.com",
        password: "Password123!",   // admin login
        role: "admin",
        verified: true
      }
    ],
    departments: [
      { id: 1, name: "Engineering", description: "Software team" },
      { id: 2, name: "HR", description: "Human Resources" }
    ],
    employees: [],
    requests: []
  };
  saveToStorage();
}

function loadFromStorage() {
  let raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    seedDb();
    return;
  }

  try {
    window.db = JSON.parse(raw);
    if (!window.db.accounts) throw new Error("no accounts");
  } catch (e) {
    console.error("Corrupt storage, reseeding", e);
    seedDb();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

// ===== PHASE 3: AUTHENTICATION SYSTEM =====

function handleRegister() {
  hideError("register-error");

  const first = document.getElementById("reg-first").value.trim();
  const last = document.getElementById("reg-last").value.trim();
  const email = document.getElementById("reg-email").value.trim().toLowerCase();
  const pw = document.getElementById("reg-password").value;

  if (!first || !last || !email || !pw) {
    showError("register-error", "All fields are required.");
    return;
  }
  if (pw.length < 6) {
    showError("register-error", "Password must be at least 6 characters.");
    return;
  }

  const exists = window.db.accounts.find(a => a.email === email);
  if (exists) {
    showError("register-error", "An account with this email already exists.");
    return;
  }

  const newId = window.db.accounts.length
    ? Math.max(...window.db.accounts.map(a => a.id)) + 1
    : 1;

  window.db.accounts.push({
    id: newId,
    firstName: first,
    lastName: last,
    email: email,
    password: pw,
    role: "user",
    verified: false
  });

  saveToStorage();

  localStorage.setItem("unverified_email", email);
  navigateTo("#/verify-email");
}

function simulateVerification() {
  const email = localStorage.getItem("unverified_email");
  if (!email) return;

  const acc = window.db.accounts.find(a => a.email === email);
  if (acc) {
    acc.verified = true;
    saveToStorage();
  }

  // set one-time flag for login banner
  localStorage.setItem("just_verified", "1");

  navigateTo("#/login");
}

function handleLogin() {
  hideError("login-error");

  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pw = document.getElementById("login-password").value;

  if (!email || !pw) {
    showError("login-error", "Please enter email and password.");
    return;
  }

  const user = window.db.accounts.find(
    a => a.email === email && a.password === pw && a.verified
  );

  if (!user) {
    showError("login-error", "Invalid credentials or email not verified.");
    return;
  }

  localStorage.setItem("auth_token", user.email);
  setAuthState(true, user);
  navigateTo("#/profile");
}

function setAuthState(isAuth, user = null) {
  currentUser = isAuth ? user : null;

  document.body.classList.remove("not-authenticated", "authenticated", "is-admin");
  if (isAuth) {
    document.body.classList.add("authenticated");
    if (user.role === "admin") {
      document.body.classList.add("is-admin");
    }
    const navUsername = document.getElementById("nav-username");
    if (navUsername) {
      navUsername.textContent = user.role === "admin"
        ? "Admin"
        : `${user.firstName} ${user.lastName}`;
    }
  } else {
    document.body.classList.add("not-authenticated");
    const navUsername = document.getElementById("nav-username");
    if (navUsername) navUsername.textContent = "User";
  }
}

function logout() {
  localStorage.removeItem("auth_token");
  setAuthState(false);
  navigateTo("#/login");   // go to login; handleRouting() clears form
}

// ===== PHASE 5: PROFILE PAGE =====

function renderProfile() {
  if (!currentUser) return;
  const card = document.getElementById("profile-card");
  const fullName = `${currentUser.firstName} ${currentUser.lastName}`;
  card.innerHTML = `
    <p><strong>${fullName}</strong></p>
    <p>Email: ${currentUser.email}</p>
    <p>Role: ${currentUser.role === "admin" ? "Admin" : "User"}</p>
    <button class="btn btn-outline-primary" onclick="alert('Edit Profile not implemented yet.')">
      Edit Profile
    </button>
  `;
}

// ===== PHASE 6: ADMIN FEATURES (CRUD) =====

// --- Accounts ---
function renderAccountsList() {
  const tbody = document.getElementById("accounts-table-body");
  tbody.innerHTML = "";

  window.db.accounts.forEach(acc => {
    const tr = document.createElement("tr");
    const name = `${acc.firstName} ${acc.lastName}`;
    tr.innerHTML = `
      <td>${name}</td>
      <td>${acc.email}</td>
      <td>${acc.role}</td>
      <td>${acc.verified ? "✔" : "—"}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editAccount(${acc.id})">Edit</button>
        <button class="btn btn-sm btn-outline-warning me-1" onclick="openResetPasswordModal(${acc.id})">Reset Password</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteAccount(${acc.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  cancelAccountForm(false);
}

function startAddAccount() {
  document.getElementById("account-id").value = "";
  document.getElementById("account-first").value = "";
  document.getElementById("account-last").value = "";
  document.getElementById("account-email").value = "";
  document.getElementById("account-password").value = "";
  document.getElementById("account-role").value = "user";
  document.getElementById("account-verified").checked = false;
  hideError("account-form-error");
}

function editAccount(id) {
  const acc = window.db.accounts.find(a => a.id === id);
  if (!acc) return;
  document.getElementById("account-id").value = acc.id;
  document.getElementById("account-first").value = acc.firstName;
  document.getElementById("account-last").value = acc.lastName;
  document.getElementById("account-email").value = acc.email;
  document.getElementById("account-password").value = acc.password;
  document.getElementById("account-role").value = acc.role;
  document.getElementById("account-verified").checked = acc.verified;
  hideError("account-form-error");
}

function saveAccount() {
  hideError("account-form-error");
  const idVal = document.getElementById("account-id").value;
  const first = document.getElementById("account-first").value.trim();
  const last = document.getElementById("account-last").value.trim();
  const email = document.getElementById("account-email").value.trim().toLowerCase();
  const pw = document.getElementById("account-password").value;
  const role = document.getElementById("account-role").value;
  const verified = document.getElementById("account-verified").checked;

  if (!first || !last || !email || !pw) {
    showError("account-form-error", "All fields are required.");
    return;
  }
  if (pw.length < 6) {
    showError("account-form-error", "Password must be at least 6 characters.");
    return;
  }

  if (idVal) {
    const acc = window.db.accounts.find(a => a.id === Number(idVal));
    if (!acc) return;
    acc.firstName = first;
    acc.lastName = last;
    acc.email = email;
    acc.password = pw;
    acc.role = role;
    acc.verified = verified;
  } else {
    const exists = window.db.accounts.some(a => a.email === email);
    if (exists) {
      showError("account-form-error", "Email already exists.");
      return;
    }
    const newId = window.db.accounts.length
      ? Math.max(...window.db.accounts.map(a => a.id)) + 1
      : 1;
    window.db.accounts.push({
      id: newId,
      firstName: first,
      lastName: last,
      email,
      password: pw,
      role,
      verified
    });
  }

  saveToStorage();
  renderAccountsList();
}

function cancelAccountForm(clear = true) {
  hideError("account-form-error");
  if (!clear) return;
  document.getElementById("account-id").value = "";
  document.getElementById("account-first").value = "";
  document.getElementById("account-last").value = "";
  document.getElementById("account-email").value = "";
  document.getElementById("account-password").value = "";
  document.getElementById("account-role").value = "user";
  document.getElementById("account-verified").checked = false;
}


// --- Reset Password Modal (NEW) ---
function openResetPasswordModal(id) {
  const acc = window.db.accounts.find(a => a.id === id);
  if (!acc) return;

  let modal = document.getElementById('reset-pw-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reset-pw-modal';
    modal.className = 'modal-backdrop-custom d-none';
    modal.innerHTML = `
      <div class="modal-custom">
        <div class="modal-header">
          <h5 class="modal-title">Reset Password</h5>
          <button type="button" class="btn-close" onclick="closeResetPasswordModal()"></button>
        </div>
        <div class="modal-body">
          <div id="reset-pw-error" class="alert alert-danger d-none"></div>
          <label class="form-label">New Password (min 6 chars)</label>
          <input id="reset-pw-input" class="form-control mb-3" type="password" />
          <label class="form-label">Confirm Password</label>
          <input id="reset-pw-confirm" class="form-control" type="password" />
          <input type="hidden" id="reset-pw-user-id" />
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="confirmResetPassword()">Reset Password</button>
          <button class="btn btn-secondary" onclick="closeResetPasswordModal()">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('reset-pw-user-id').value = id;
  document.getElementById('reset-pw-input').value = '';
  document.getElementById('reset-pw-confirm').value = '';
  hideError('reset-pw-error');
  modal.classList.remove('d-none');
}

function closeResetPasswordModal() {
  const modal = document.getElementById('reset-pw-modal');
  if (modal) modal.classList.add('d-none');
}

function confirmResetPassword() {
  hideError('reset-pw-error');
  const id = Number(document.getElementById('reset-pw-user-id').value);
  const newPw = document.getElementById('reset-pw-input').value;
  const confirmPw = document.getElementById('reset-pw-confirm').value;

  if (!newPw || newPw.length < 6) {
    showError('reset-pw-error', 'Password must be at least 6 characters.');
    return;
  }
  if (newPw !== confirmPw) {
    showError('reset-pw-error', 'Passwords do not match.');
    return;
  }

  const acc = window.db.accounts.find(a => a.id === id);
  if (acc) {
    acc.password = newPw;
    saveToStorage();
    closeResetPasswordModal();
    renderAccountsList();
    alert('Password reset successfully!');
  }
}

function deleteAccount(id) {
  const acc = window.db.accounts.find(a => a.id === id);
  if (!acc) return;
  if (currentUser && acc.email === currentUser.email) {
    alert("You cannot delete your own account.");
    return;
  }
  if (!confirm("Are you sure you want to delete this account?")) return;
  window.db.accounts = window.db.accounts.filter(a => a.id !== id);
  saveToStorage();
  renderAccountsList();
}

// --- Departments ---
function renderDepartments() {
  const tbody = document.getElementById("departments-table-body");
  tbody.innerHTML = "";
  window.db.departments.forEach(dep => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dep.name}</td>
      <td>${dep.description}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="alert('Edit Department not implemented.')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="alert('Delete Department not implemented.')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Employees ---
function renderEmployeesTable() {
  const tbody = document.getElementById("employees-table-body");
  tbody.innerHTML = "";

  const deptById = {};
  window.db.departments.forEach(d => deptById[d.id] = d.name);

  window.db.employees.forEach(emp => {
    const tr = document.createElement("tr");
    const deptName = deptById[emp.departmentId] || "";
    tr.innerHTML = `
      <td>${emp.employeeId}</td>
      <td>${emp.userEmail}</td>
      <td>${emp.position}</td>
      <td>${deptName}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee(${emp.id})">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee(${emp.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const select = document.getElementById("employee-dept");
  select.innerHTML = "";
  window.db.departments.forEach(dep => {
    const opt = document.createElement("option");
    opt.value = dep.id;
    opt.textContent = dep.name;
    select.appendChild(opt);
  });

  cancelEmployeeForm(false);
}

function startAddEmployee() {
  document.getElementById("employee-id-hidden").value = "";
  document.getElementById("employee-id").value = "";
  document.getElementById("employee-email").value = "";
  document.getElementById("employee-position").value = "";
  document.getElementById("employee-hiredate").value = "";
  hideError("employee-form-error");
}

function editEmployee(id) {
  const emp = window.db.employees.find(e => e.id === id);
  if (!emp) return;
  document.getElementById("employee-id-hidden").value = emp.id;
  document.getElementById("employee-id").value = emp.employeeId;
  document.getElementById("employee-email").value = emp.userEmail;
  document.getElementById("employee-position").value = emp.position;
  document.getElementById("employee-dept").value = emp.departmentId;
  document.getElementById("employee-hiredate").value = emp.hireDate;
  hideError("employee-form-error");
}

function saveEmployee() {
  hideError("employee-form-error");
  const hiddenId = document.getElementById("employee-id-hidden").value;
  const empId = document.getElementById("employee-id").value.trim();
  const email = document.getElementById("employee-email").value.trim().toLowerCase();
  const position = document.getElementById("employee-position").value.trim();
  const deptId = Number(document.getElementById("employee-dept").value);
  const hireDate = document.getElementById("employee-hiredate").value.trim();

  if (!empId || !email || !position || !deptId || !hireDate) {
    showError("employee-form-error", "All fields are required.");
    return;
  }

  const account = window.db.accounts.find(a => a.email === email);
  if (!account) {
    showError("employee-form-error", "User email must match an existing account.");
    return;
  }

  if (hiddenId) {
    const emp = window.db.employees.find(e => e.id === Number(hiddenId));
    if (!emp) return;
    emp.employeeId = empId;
    emp.userEmail = email;
    emp.position = position;
    emp.departmentId = deptId;
    emp.hireDate = hireDate;
  } else {
    const newId = window.db.employees.length
      ? Math.max(...window.db.employees.map(e => e.id)) + 1
      : 1;
    window.db.employees.push({
      id: newId,
      employeeId: empId,
      userEmail: email,
      position,
      departmentId: deptId,
      hireDate
    });
  }

  saveToStorage();
  renderEmployeesTable();
}

function cancelEmployeeForm(clear = true) {
  hideError("employee-form-error");
  if (!clear) return;
  document.getElementById("employee-id-hidden").value = "";
  document.getElementById("employee-id").value = "";
  document.getElementById("employee-email").value = "";
  document.getElementById("employee-position").value = "";
  document.getElementById("employee-hiredate").value = "";
}

function deleteEmployee(id) {
  if (!confirm("Delete this employee?")) return;
  window.db.employees = window.db.employees.filter(e => e.id !== id);
  saveToStorage();
  renderEmployeesTable();
}

// ===== PHASE 7: USER REQUESTS =====

function renderRequests() {
  if (!currentUser) return;
  const tbody = document.getElementById("requests-table-body");
  const table = document.getElementById("requests-table");
  const empty = document.getElementById("requests-empty-text");

  const myReqs = window.db.requests.filter(r => r.employeeEmail === currentUser.email);
  tbody.innerHTML = "";

  if (!myReqs.length) {
    empty.classList.remove("d-none");
    table.classList.add("d-none");
    return;
  }

  empty.classList.add("d-none");
  table.classList.remove("d-none");

  myReqs.forEach(req => {
    const tr = document.createElement("tr");
    const itemsText = req.items.map(i => `${i.name} (x${i.qty})`).join(", ");
    const badgeClass =
      req.status === "Approved" ? "success" :
      req.status === "Rejected" ? "danger" : "warning";

    tr.innerHTML = `
      <td>${req.date}</td>
      <td>${req.type}</td>
      <td>${itemsText}</td>
      <td><span class="badge bg-${badgeClass}">${req.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ADMIN VIEW: ALL REQUESTS
function renderAdminRequests() {
  if (!currentUser || currentUser.role !== "admin") return;

  const tbody = document.getElementById("admin-requests-table-body");
  tbody.innerHTML = "";

  if (!window.db.requests.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="text-center text-muted">No requests yet.</td>`;
    tbody.appendChild(tr);
    return;
  }

  window.db.requests.forEach(req => {
    const acc = window.db.accounts.find(a => a.email === req.employeeEmail);
    const name = acc ? `${acc.firstName} ${acc.lastName}` : req.employeeEmail;

    const itemsText = req.items.map(i => `${i.name} (x${i.qty})`).join(", ");
    const badgeClass =
      req.status === "Approved" ? "success" :
      req.status === "Rejected" ? "danger" : "warning";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${req.date}</td>
      <td>${req.type}</td>
      <td>${name}</td>
      <td>${itemsText}</td>
      <td><span class="badge bg-${badgeClass}">${req.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function openNewRequest() {
  hideError("request-form-error");
  const container = document.getElementById("request-items-container");
  container.innerHTML = "";
  addRequestItem();
  document.getElementById("request-modal-backdrop").classList.remove("d-none");
}

function closeNewRequest() {
  document.getElementById("request-modal-backdrop").classList.add("d-none");
}

function addRequestItem() {
  const container = document.getElementById("request-items-container");
  const row = document.createElement("div");
  row.className = "row mb-2";
  row.innerHTML = `
    <div class="col-7">
      <input class="form-control request-item-name" placeholder="Item name" />
    </div>
    <div class="col-3">
      <input class="form-control request-item-qty" type="number" min="1" value="1" />
    </div>
    <div class="col-2 d-flex align-items-center">
      <button class="btn btn-outline-danger btn-sm" onclick="this.closest('.row').remove()">×</button>
    </div>
  `;
  container.appendChild(row);
}

function submitRequest() {
  if (!currentUser) {
    showError("request-form-error", "You must be logged in.");
    return;
  }
  hideError("request-form-error");

  const type = document.getElementById("request-type").value;
  const nameInputs = document.querySelectorAll(".request-item-name");
  const qtyInputs = document.querySelectorAll(".request-item-qty");

  const items = [];
  nameInputs.forEach((el, idx) => {
    const name = el.value.trim();
    const qty = Number(qtyInputs[idx].value || 0);
    if (name && qty > 0) {
      items.push({ name, qty });
    }
  });

  if (!items.length) {
    showError("request-form-error", "Add at least one item.");
    return;
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString();

  window.db.requests.push({
    id: window.db.requests.length
      ? Math.max(...window.db.requests.map(r => r.id)) + 1
      : 1,
    type,
    items,
    status: "Pending",
    date: dateStr,
    employeeEmail: currentUser.email
  });

  saveToStorage();
  closeNewRequest();
  renderRequests();
  if (currentUser.role === "admin") {
    renderAdminRequests();
  }
}

function deleteRequest(requestId) {
  fetch(`/api/requests/${requestId}`, {
    method: 'DELETE',
  })
  .then(response => {
    if (response.ok) {
      alert('Request deleted successfully');
      // Refresh or remove the entry from the DOM
    } else {
      alert('Failed to delete request');
    }
  });
}

// ===== UTILS =====

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("d-none");
}

function hideError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("d-none");
}

// ===== INITIALIZATION =====

(function initApp() {
  loadFromStorage();

  const token = localStorage.getItem("auth_token");
  if (token) {
    const user = window.db.accounts.find(a => a.email === token);
    if (user) {
      setAuthState(true, user);
    } else {
      setAuthState(false);
    }
  } else {
    setAuthState(false);
  }

  if (!window.location.hash) {
    window.location.hash = "#/";
  }

  handleRouting();
})();