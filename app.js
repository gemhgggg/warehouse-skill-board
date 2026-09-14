const bundledData = JSON.parse(JSON.stringify(window.SKILL_DATA));
const backendConfig = window.SKILL_BOARD_CONFIG || {};
const siteId = resolveSiteId();
const siteProfile = backendConfig.sites?.[siteId] || { name: siteId };
let data = normalizeData(JSON.parse(JSON.stringify(window.SKILL_DATA)));
let dataEnvelope = null;
let siteBaseline = JSON.parse(JSON.stringify(data));
let dataVersion = 0;
let authSession = null;
const state = { area: "全部", group: "全部", query: "" };

const els = {
  wall: document.getElementById("matrixWall"),
  groupFilter: document.getElementById("groupFilter"),
  search: document.getElementById("searchInput"),
  legend: document.getElementById("legend"),
  updatedAt: document.getElementById("updatedAt"),
  siteName: document.getElementById("siteName"),
  kpiGroups: document.getElementById("kpiGroups"),
  kpiEmployees: document.getElementById("kpiEmployees"),
  kpiAttainment: document.getElementById("kpiAttainment"),
  kpiGaps: document.getElementById("kpiGaps"),
  resultNote: document.getElementById("resultNote"),
  backdrop: document.getElementById("dialogBackdrop"),
  dialog: document.getElementById("dialog"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogEyebrow: document.getElementById("dialogEyebrow"),
  dialogBody: document.getElementById("dialogBody"),
  openEditor: document.getElementById("openEditor"),
  loginBackdrop: document.getElementById("loginBackdrop"),
  loginForm: document.getElementById("loginForm"),
  loginMessage: document.getElementById("loginMessage"),
  editorPhone: document.getElementById("editorPhone"),
  editorPassword: document.getElementById("editorPassword"),
  editorBackdrop: document.getElementById("editorBackdrop"),
  editGroupSelect: document.getElementById("editGroupSelect"),
  editEmployeeSelect: document.getElementById("editEmployeeSelect"),
  employeeEditor: document.getElementById("employeeEditor"),
  skillEditor: document.getElementById("skillEditor"),
  editorMessage: document.getElementById("editorMessage"),
  editName: document.getElementById("editName"),
  editRole: document.getElementById("editRole"),
  editPosition: document.getElementById("editPosition"),
  editBackup: document.getElementById("editBackup"),
  matrixEditorPanel: document.getElementById("matrixEditorPanel"),
  groupsEditorPanel: document.getElementById("groupsEditorPanel"),
  plansEditorPanel: document.getElementById("plansEditorPanel"),
  multiEditorPanel: document.getElementById("multiEditorPanel"),
  editGroupQuery: document.getElementById("editGroupQuery"),
  editGroupAdminSelect: document.getElementById("editGroupAdminSelect"),
  groupEditor: document.getElementById("groupEditor"),
  groupEditorMessage: document.getElementById("groupEditorMessage"),
  editGroupArea: document.getElementById("editGroupArea"),
  editGroupName: document.getElementById("editGroupName"),
  editGroupDepartment: document.getElementById("editGroupDepartment"),
  editGroupSourceSheet: document.getElementById("editGroupSourceSheet"),
  editGroupDocumentNo: document.getElementById("editGroupDocumentNo"),
  editGroupUpdatedBy: document.getElementById("editGroupUpdatedBy"),
  editGroupEmployeeCount: document.getElementById("editGroupEmployeeCount"),
  editGroupSkillCount: document.getElementById("editGroupSkillCount"),
  editPlanSelect: document.getElementById("editPlanSelect"),
  planEditor: document.getElementById("planEditor"),
  planEditorMessage: document.getElementById("planEditorMessage"),
  editPlanName: document.getElementById("editPlanName"),
  editPlanRole: document.getElementById("editPlanRole"),
  editPlanCurrent: document.getElementById("editPlanCurrent"),
  editPlanTarget: document.getElementById("editPlanTarget"),
  editPlanContent: document.getElementById("editPlanContent"),
  editPlanStart: document.getElementById("editPlanStart"),
  editPlanEnd: document.getElementById("editPlanEnd"),
  editMultiBoardSelect: document.getElementById("editMultiBoardSelect"),
  editMultiSectionSelect: document.getElementById("editMultiSectionSelect"),
  editMultiEmployeeSelect: document.getElementById("editMultiEmployeeSelect"),
  multiEditor: document.getElementById("multiEditor"),
  multiSkillEditor: document.getElementById("multiSkillEditor"),
  multiEditorMessage: document.getElementById("multiEditorMessage"),
  editMultiName: document.getElementById("editMultiName"),
  editMultiRole: document.getElementById("editMultiRole"),
};

function resolveSiteId() {
  const pathMatch = window.location.pathname.match(/\/(funing|hefei)(?:\/|$)/i);
  const querySite = new URLSearchParams(window.location.search).get("site");
  const candidate = String(pathMatch?.[1] || querySite || backendConfig.defaultSiteId || "funing").toLowerCase();
  return backendConfig.sites?.[candidate] ? candidate : (backendConfig.defaultSiteId || "funing");
}

function applySiteIdentity() {
  const siteName = siteProfile.name || siteId;
  els.siteName.textContent = siteName;
  document.body.classList.add(`site-${siteId}`);
  document.title = `${siteName}仓储部员工技能看板`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = `${siteName}仓储部成品仓与原辅料仓员工技能矩阵、技能缺口和培养计划看板`;
  document.getElementById("loginTitle").textContent = `${siteName} · 在线编辑登录`;
  document.getElementById("editorTitle").textContent = `${siteName} · 在线编辑看板数据`;
}

function normalizeData(input) {
  const normalized = input && typeof input === "object" ? input : {};
  normalized.meta ||= JSON.parse(JSON.stringify(bundledData.meta));
  normalized.groups = Array.isArray(normalized.groups) ? normalized.groups : JSON.parse(JSON.stringify(bundledData.groups || []));
  normalized.plans = Array.isArray(normalized.plans) ? normalized.plans : [];
  normalized.plans.forEach((plan, index) => { plan.id ||= `plan-${index + 1}`; });
  if (!Array.isArray(normalized.multiSkillBoards) || !normalized.multiSkillBoards.length) {
    normalized.multiSkillBoards = JSON.parse(JSON.stringify(bundledData.multiSkillBoards || []));
  }
  normalized.multiSkillBoards.forEach((board, boardIndex) => {
    board.id ||= `multi-board-${boardIndex + 1}`;
    board.sections = Array.isArray(board.sections) ? board.sections : [];
    board.sections.forEach((section, sectionIndex) => {
      section.id ||= `${board.id}-section-${sectionIndex + 1}`;
      section.skills = Array.isArray(section.skills) ? section.skills : [];
      section.employees = Array.isArray(section.employees) ? section.employees : [];
      section.employees.forEach((employee, employeeIndex) => {
        employee.id ||= `${section.id}-employee-${employeeIndex + 1}`;
        employee.capabilities = section.skills.map((_, skillIndex) => Boolean(employee.capabilities?.[skillIndex]));
      });
    });
  });
  return normalized;
}

function backendConfigured() {
  return /^https:\/\//.test(backendConfig.backendUrl || "") && Boolean(backendConfig.anonKey);
}

function apiUrl(path) {
  return `${String(backendConfig.backendUrl).replace(/\/$/, "")}${path}`;
}

async function parseApiResponse(response) {
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const message = body?.message || body?.error_description || body?.hint || "服务器暂时无法处理请求";
    throw new Error(message);
  }
  return body;
}

async function loadRemoteData() {
  if (!backendConfigured()) return false;
  const response = await fetch(apiUrl("/rest/v1/dashboard_state?id=eq.1&select=data,version,updated_at"), {
    headers: { apikey: backendConfig.anonKey },
    cache: "no-store",
  });
  const rows = await parseApiResponse(response);
  if (!Array.isArray(rows) || !rows[0]?.data) return false;
  dataEnvelope = JSON.parse(JSON.stringify(rows[0].data));
  const remoteSiteData = dataEnvelope.sites?.[siteId] || dataEnvelope;
  data = normalizeData(JSON.parse(JSON.stringify(remoteSiteData)));
  siteBaseline = JSON.parse(JSON.stringify(data));
  dataVersion = Number(rows[0].version || 0);
  return true;
}

async function authenticateEditor(phone, password) {
  const domain = backendConfig.authEmailDomain || "skillboard.local";
  const response = await fetch(apiUrl("/auth/v1/token?grant_type=password"), {
    method: "POST",
    headers: { apikey: backendConfig.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${phone}@${domain}`, password }),
  });
  return parseApiResponse(response);
}

async function saveRemoteData() {
  if (!authSession?.access_token) throw new Error("登录已失效，请重新验证");
  const payload = buildSavePayload();
  const response = await fetch(apiUrl("/rest/v1/rpc/save_dashboard"), {
    method: "POST",
    headers: {
      apikey: backendConfig.anonKey,
      Authorization: `Bearer ${authSession.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_data: payload, p_expected_version: dataVersion }),
  });
  const result = await parseApiResponse(response);
  const saved = Array.isArray(result) ? result[0] : result;
  dataVersion = Number(saved?.version || dataVersion + 1);
  dataEnvelope = payload;
  siteBaseline = JSON.parse(JSON.stringify(data));
  return saved;
}

function buildSavePayload() {
  const envelope = dataEnvelope && typeof dataEnvelope === "object" ? JSON.parse(JSON.stringify(dataEnvelope)) : {};
  const seed = JSON.parse(JSON.stringify(siteBaseline || data));
  envelope.sites ||= {};
  Object.keys(backendConfig.sites || { funing: {}, hefei: {} }).forEach((id) => {
    envelope.sites[id] ||= JSON.parse(JSON.stringify(seed));
  });
  envelope.sites[siteId] = JSON.parse(JSON.stringify(data));
  const legacy = siteId === "funing" ? data : (envelope.sites.funing || seed);
  envelope.meta = JSON.parse(JSON.stringify(legacy.meta));
  envelope.groups = JSON.parse(JSON.stringify(legacy.groups));
  envelope.plans = JSON.parse(JSON.stringify(legacy.plans || []));
  envelope.multiSkillBoards = JSON.parse(JSON.stringify(legacy.multiSkillBoards || []));
  envelope.siteSchemaVersion = 2;
  return envelope;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function levelFor(score) {
  if (score < 25) return { level: 1, fill: 0, label: "尚未掌握" };
  if (score < 50) return { level: 2, fill: 25, label: "学习中" };
  if (score < 75) return { level: 3, fill: 50, label: "基本掌握" };
  if (score <= 90) return { level: 4, fill: 75, label: "基本熟练" };
  return { level: 5, fill: 100, label: "熟练/可带徒" };
}

function dotMarkup(skill, size = "") {
  const actual = Number(skill.actual || 0);
  const required = Number(skill.required || 0);
  const level = levelFor(actual);
  const isGap = required > 0 && actual < required;
  const isNA = required === 0 && actual === 0;
  const classes = ["skill-dot", `l${level.level}`, isGap ? "gap" : "", isNA ? "na" : "", size].filter(Boolean).join(" ");
  const title = `${skill.name}：实际 ${actual}，岗位要求 ${required || "不要求"}，${level.label}${isGap ? "，待提升" : ""}`;
  return `<span class="${classes}" style="--fill:${level.fill}%" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></span>`;
}

function employeeStats(employee) {
  const requiredSkills = employee.skills.filter((skill) => Number(skill.required) > 0);
  const met = requiredSkills.filter((skill) => Number(skill.actual) >= Number(skill.required)).length;
  const gaps = requiredSkills.length - met;
  const mentor = employee.skills.filter((skill) => Number(skill.actual) >= 91).length;
  return { required: requiredSkills.length, met, gaps, mentor, rate: requiredSkills.length ? met / requiredSkills.length * 100 : 100 };
}

function groupStats(group) {
  const stats = group.employees.map(employeeStats);
  const required = stats.reduce((sum, item) => sum + item.required, 0);
  const met = stats.reduce((sum, item) => sum + item.met, 0);
  const gaps = required - met;
  const mentors = stats.filter((item) => item.mentor > 0).length;
  return { required, met, gaps, mentors, rate: required ? met / required * 100 : 100 };
}

function filteredGroups() {
  return data.groups
    .filter((group) => state.area === "全部" || group.area === state.area)
    .filter((group) => state.group === "全部" || group.id === state.group)
    .map((group) => {
      const query = state.query.trim().toLowerCase();
      if (!query) return group;
      return {
        ...group,
        employees: group.employees.filter((employee) => {
          const haystack = [employee.name, employee.role, employee.position, employee.backup, ...employee.skills.map((skill) => skill.name)].join(" ").toLowerCase();
          return haystack.includes(query);
        }),
      };
    })
    .filter((group) => group.employees.length > 0);
}

function renderLegend() {
  els.legend.innerHTML = data.meta.levelRules.map((rule, index) => {
    const score = [0, 30, 60, 85, 95][index];
    return `<span class="legend-item">${dotMarkup({ name: rule.label, actual: score, required: 0 })}<span>${rule.label} ${rule.min}–${rule.max}</span></span>`;
  }).join("") + `<span class="legend-item">${dotMarkup({ name: "待提升", actual: 40, required: 90 })}<span>红圈：低于岗位要求</span></span>`;
}

function updateGroupOptions() {
  const options = data.groups.filter((group) => state.area === "全部" || group.area === state.area);
  const currentValid = options.some((group) => group.id === state.group);
  if (!currentValid) state.group = "全部";
  els.groupFilter.innerHTML = `<option value="全部">全部业务组</option>` + options.map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`).join("");
  els.groupFilter.value = state.group;
}

function renderKpis(groups) {
  const employees = groups.flatMap((group) => group.employees);
  const allStats = employees.map(employeeStats);
  const required = allStats.reduce((sum, item) => sum + item.required, 0);
  const met = allStats.reduce((sum, item) => sum + item.met, 0);
  els.kpiGroups.textContent = groups.length;
  els.kpiEmployees.textContent = employees.length;
  els.kpiAttainment.textContent = required ? `${(met / required * 100).toFixed(1)}%` : "—";
  els.kpiGaps.textContent = required - met;
  els.resultNote.textContent = state.query
    ? `已找到 ${employees.length} 名匹配员工。点击员工行查看明细。`
    : "点击员工行查看明细，点击卡片右下角展开完整矩阵。";
}

function groupCard(group) {
  const stats = groupStats(group);
  const skills = group.employees[0]?.skills || [];
  const shownSkills = skills.slice(0, 16);
  const rows = group.employees.map((employee, employeeIndex) => {
    const dots = employee.skills.slice(0, 16).map((skill) => dotMarkup(skill)).join("");
    return `<button class="mini-row" type="button" data-action="employee" data-group="${escapeHtml(group.id)}" data-employee="${employeeIndex}">
      <span class="employee-label"><strong>${escapeHtml(employee.name)}</strong><small>${escapeHtml(employee.role)}</small></span>
      <span class="dot-grid">${dots}</span>
    </button>`;
  }).join("");

  return `<article class="group-card">
    <header class="group-banner"><h3>${escapeHtml(group.name)}</h3><span>${group.employees.length} 人</span></header>
    <div class="group-body">
      <div class="group-summary">
        <div class="rate-block"><strong>${stats.rate.toFixed(1)}%</strong><span>岗位技能达标率</span></div>
        <div class="mini-stats">
          <div class="mini-stat danger"><strong>${stats.gaps}</strong><span>待提升项</span></div>
          <div class="mini-stat"><strong>${stats.mentors}</strong><span>可带徒员工</span></div>
        </div>
      </div>
      <div class="progress-track" aria-label="达标率 ${stats.rate.toFixed(1)}%"><div class="progress-fill" style="width:${stats.rate}%"></div></div>
      <div class="mini-matrix">
        <div class="mini-header"><span>员工 / 技能</span><div class="mini-scale" aria-hidden="true">${shownSkills.map(() => "<i></i>").join("")}</div></div>
        ${rows}
      </div>
      <footer class="card-footer"><span class="area-chip">${escapeHtml(group.area)} · 更新 ${escapeHtml(group.updateDate)}</span><button class="open-button" type="button" data-action="group" data-group="${escapeHtml(group.id)}">查看完整矩阵</button></footer>
    </div>
  </article>`;
}

function planCard() {
  return `<article class="plan-card">
    <header class="group-banner"><h3>员工提升计划</h3><span>${data.plans.length} 项</span></header>
    <div class="group-body">
      <div class="plan-list">
        ${data.plans.slice(0, 4).map((plan) => `<div class="plan-item"><strong>${escapeHtml(plan.name)} · ${escapeHtml(plan.target)}</strong><p>${escapeHtml(plan.content)}</p><span>${escapeHtml(plan.start)} 至 ${escapeHtml(plan.end)}</span></div>`).join("")}
      </div>
      <footer class="card-footer"><span class="area-chip">跨仓库培养计划</span><button class="open-button" type="button" data-action="plans">查看全部计划</button></footer>
    </div>
  </article>`;
}

function multiSkillCard(board) {
  const employees = board.sections.flatMap((section) => section.employees);
  const capabilityCount = board.sections.reduce((sum, section) => sum + section.employees.reduce((employeeSum, employee) => employeeSum + employee.capabilities.filter(Boolean).length, 0), 0);
  const total = board.sections.reduce((sum, section) => sum + section.employees.length * section.skills.length, 0);
  const preview = employees.slice(0, 5).map((employee) => `<div class="multi-preview-row"><strong>${escapeHtml(employee.name)}</strong><span>${escapeHtml(employee.role)}</span></div>`).join("");
  return `<article class="group-card multi-card">
    <header class="group-banner"><h3>${escapeHtml(board.title)}</h3><span>${employees.length} 人</span></header>
    <div class="group-body">
      <div class="group-summary">
        <div class="rate-block"><strong>${total ? (capabilityCount / total * 100).toFixed(1) : "0.0"}%</strong><span>技能具备率</span></div>
        <div class="mini-stats"><div class="mini-stat"><strong>${board.sections.length}</strong><span>人员类别</span></div></div>
      </div>
      <div class="multi-preview">${preview}</div>
      <footer class="card-footer"><span class="area-chip">${escapeHtml(board.area)} · 多能工</span><button class="open-button" type="button" data-action="multi" data-board="${escapeHtml(board.id)}">查看完整一览表</button></footer>
    </div>
  </article>`;
}

function render() {
  const groups = filteredGroups();
  renderKpis(groups);
  const showExtras = state.group === "全部" && !state.query;
  const boards = (data.multiSkillBoards || []).filter((board) => state.area === "全部" || board.area === state.area);
  const cards = groups.map(groupCard).join("") + (showExtras ? boards.map(multiSkillCard).join("") + planCard() : "");
  els.wall.innerHTML = cards || `<div class="empty-card">没有找到匹配的员工或业务组，请调整筛选条件。</div>`;
}

function openDialog(title, eyebrow, content) {
  els.dialogTitle.textContent = title;
  els.dialogEyebrow.textContent = eyebrow;
  els.dialogBody.innerHTML = content;
  els.backdrop.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("closeDialog").focus();
}

function closeDialog() {
  els.backdrop.hidden = true;
  document.body.style.overflow = "";
}

function setFormMessage(element, message = "", type = "") {
  element.textContent = message;
  element.className = `form-message ${type}`.trim();
}

function openLogin() {
  setFormMessage(els.loginMessage);
  els.editorPassword.value = "";
  els.loginBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => els.editorPhone.focus(), 0);
}

function closeLogin() {
  els.loginBackdrop.hidden = true;
  document.body.style.overflow = "";
}

function selectedEditGroup() {
  return data.groups.find((group) => group.id === els.editGroupSelect.value) || data.groups[0];
}

function selectedEmployeeIndex() {
  return Math.max(0, Number(els.editEmployeeSelect.value || 0));
}

function selectedEditEmployee() {
  const group = selectedEditGroup();
  return group?.employees[selectedEmployeeIndex()];
}

function populateEmployeeOptions(index = 0) {
  const group = selectedEditGroup();
  els.editEmployeeSelect.innerHTML = (group?.employees || []).map((employee, employeeIndex) =>
    `<option value="${employeeIndex}">${escapeHtml(employee.name)} · ${escapeHtml(employee.role)}</option>`
  ).join("");
  els.editEmployeeSelect.value = String(Math.min(index, Math.max(0, (group?.employees.length || 1) - 1)));
  renderEmployeeEditor();
}

function populateEditor() {
  populateMatrixGroupOptions();
  els.editGroupQuery.value = "";
  populateGroupAdminOptions();
  populatePlanOptions();
  populateMultiBoardOptions();
}

function populateMatrixGroupOptions(selectedId = "") {
  els.editGroupSelect.innerHTML = data.groups.map((group) =>
    `<option value="${escapeHtml(group.id)}">${escapeHtml(group.area)} · ${escapeHtml(group.name)}</option>`
  ).join("");
  els.editGroupSelect.value = data.groups.some((group) => group.id === selectedId) ? selectedId : data.groups[0]?.id || "";
  populateEmployeeOptions(0);
}

function renderEmployeeEditor() {
  const employee = selectedEditEmployee();
  if (!employee) {
    els.employeeEditor.hidden = true;
    return;
  }
  els.employeeEditor.hidden = false;
  els.editName.value = employee.name || "";
  els.editRole.value = employee.role || "";
  els.editPosition.value = employee.position || "";
  els.editBackup.value = employee.backup || "";
  els.skillEditor.innerHTML = employee.skills.map((skill, index) => `<div class="skill-edit-row" data-skill-index="${index}">
    <strong>${escapeHtml(skill.name)}</strong>
    <label><span>岗位要求</span><input class="required-input" type="number" min="0" max="100" step="1" value="${Number(skill.required || 0)}" /></label>
    <label><span>实际具备</span><input class="actual-input" type="number" min="0" max="100" step="1" value="${Number(skill.actual || 0)}" /></label>
  </div>`).join("");
  setFormMessage(els.editorMessage);
}

function commitFormToEmployee() {
  const employee = selectedEditEmployee();
  if (!employee) throw new Error("请选择员工");
  const name = els.editName.value.trim();
  const role = els.editRole.value.trim();
  if (!name || !role) throw new Error("姓名和岗位不能为空");
  employee.name = name;
  employee.role = role;
  employee.position = els.editPosition.value.trim();
  employee.backup = els.editBackup.value.trim();
  els.skillEditor.querySelectorAll(".skill-edit-row").forEach((row) => {
    const index = Number(row.dataset.skillIndex);
    const required = Number(row.querySelector(".required-input").value);
    const actual = Number(row.querySelector(".actual-input").value);
    if (!Number.isFinite(required) || !Number.isFinite(actual) || required < 0 || required > 100 || actual < 0 || actual > 100) {
      throw new Error("技能分数必须在 0–100 之间");
    }
    employee.skills[index].required = required;
    employee.skills[index].actual = actual;
  });
  const group = selectedEditGroup();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  group.updateDate = today;
  data.meta.updated = today;
}

function touchData() {
  const now = new Date();
  data.meta.updated = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function selectedAdminGroup() {
  return data.groups.find((group) => group.id === els.editGroupAdminSelect.value) || null;
}

function populateGroupAdminOptions(selectedId = "") {
  const query = els.editGroupQuery.value.trim().toLowerCase();
  const groups = data.groups.filter((group) => !query || [group.area, group.name, group.department, group.documentNo]
    .some((value) => String(value || "").toLowerCase().includes(query)));
  els.editGroupAdminSelect.innerHTML = groups.map((group) =>
    `<option value="${escapeHtml(group.id)}">${escapeHtml(group.area)} · ${escapeHtml(group.name)}</option>`
  ).join("");
  els.editGroupAdminSelect.value = groups.some((group) => group.id === selectedId) ? selectedId : groups[0]?.id || "";
  renderGroupEditor();
}

function renderGroupEditor() {
  const group = selectedAdminGroup();
  els.groupEditor.hidden = !group;
  if (!group) return;
  els.editGroupArea.value = group.area || "成品仓";
  els.editGroupName.value = group.name || "";
  els.editGroupDepartment.value = group.department || "仓储部";
  els.editGroupSourceSheet.value = group.sourceSheet || "";
  els.editGroupDocumentNo.value = group.documentNo || "";
  els.editGroupUpdatedBy.value = group.updatedBy || "";
  els.editGroupEmployeeCount.value = String(group.employees?.length || 0);
  els.editGroupSkillCount.value = String(group.employees?.[0]?.skills?.length || 0);
  setFormMessage(els.groupEditorMessage);
}

function commitGroupForm() {
  const group = selectedAdminGroup();
  if (!group) throw new Error("请选择业务组");
  const area = els.editGroupArea.value;
  const name = els.editGroupName.value.trim();
  if (!name) throw new Error("业务组名称不能为空");
  const duplicate = data.groups.some((item) => item.id !== group.id && item.area === area && item.name.trim() === name);
  if (duplicate) throw new Error(`“${area} · ${name}”已经存在`);
  group.area = area;
  group.name = name;
  group.department = els.editGroupDepartment.value.trim() || "仓储部";
  group.sourceSheet = els.editGroupSourceSheet.value.trim();
  group.documentNo = els.editGroupDocumentNo.value.trim();
  group.updatedBy = els.editGroupUpdatedBy.value.trim();
  touchData();
  group.updateDate = data.meta.updated;
}

function selectedPlan() {
  return data.plans.find((plan) => plan.id === els.editPlanSelect.value) || data.plans[0];
}

function populatePlanOptions(selectedId = "") {
  els.editPlanSelect.innerHTML = data.plans.map((plan) => `<option value="${escapeHtml(plan.id)}">${escapeHtml(plan.name)} · ${escapeHtml(plan.target)}</option>`).join("");
  const target = data.plans.some((plan) => plan.id === selectedId) ? selectedId : data.plans[0]?.id || "";
  els.editPlanSelect.value = target;
  renderPlanEditor();
}

function renderPlanEditor() {
  const plan = selectedPlan();
  els.planEditor.hidden = !plan;
  if (!plan) return;
  els.editPlanName.value = plan.name || "";
  els.editPlanRole.value = plan.role || "";
  els.editPlanCurrent.value = plan.current || "";
  els.editPlanTarget.value = plan.target || "";
  els.editPlanContent.value = plan.content || "";
  els.editPlanStart.value = plan.start || "";
  els.editPlanEnd.value = plan.end || "";
  setFormMessage(els.planEditorMessage);
}

function selectedMultiBoard() {
  return data.multiSkillBoards.find((board) => board.id === els.editMultiBoardSelect.value) || data.multiSkillBoards[0];
}

function selectedMultiSection() {
  const board = selectedMultiBoard();
  return board?.sections.find((section) => section.id === els.editMultiSectionSelect.value) || board?.sections[0];
}

function selectedMultiEmployee() {
  const section = selectedMultiSection();
  return section?.employees.find((employee) => employee.id === els.editMultiEmployeeSelect.value) || section?.employees[0];
}

function populateMultiBoardOptions(selectedId = "") {
  els.editMultiBoardSelect.innerHTML = data.multiSkillBoards.map((board) => `<option value="${escapeHtml(board.id)}">${escapeHtml(board.title)}</option>`).join("");
  els.editMultiBoardSelect.value = data.multiSkillBoards.some((board) => board.id === selectedId) ? selectedId : data.multiSkillBoards[0]?.id || "";
  populateMultiSectionOptions();
}

function populateMultiSectionOptions(selectedId = "") {
  const board = selectedMultiBoard();
  els.editMultiSectionSelect.innerHTML = (board?.sections || []).map((section) => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.name)}</option>`).join("");
  els.editMultiSectionSelect.value = board?.sections.some((section) => section.id === selectedId) ? selectedId : board?.sections[0]?.id || "";
  populateMultiEmployeeOptions();
}

function populateMultiEmployeeOptions(selectedId = "") {
  const section = selectedMultiSection();
  els.editMultiEmployeeSelect.innerHTML = (section?.employees || []).map((employee) => `<option value="${escapeHtml(employee.id)}">${escapeHtml(employee.name)} · ${escapeHtml(employee.role)}</option>`).join("");
  els.editMultiEmployeeSelect.value = section?.employees.some((employee) => employee.id === selectedId) ? selectedId : section?.employees[0]?.id || "";
  renderMultiEditor();
}

function renderMultiEditor() {
  const section = selectedMultiSection();
  const employee = selectedMultiEmployee();
  els.multiEditor.hidden = !section;
  if (!section) return;
  els.editMultiName.disabled = !employee;
  els.editMultiRole.disabled = !employee;
  els.editMultiName.value = employee?.name || "";
  els.editMultiRole.value = employee?.role || "";
  els.multiSkillEditor.innerHTML = section.skills.map((skill, index) => `<div class="multi-skill-edit-row" data-skill-index="${index}">
    <input class="multi-skill-name" value="${escapeHtml(skill)}" aria-label="技能名称" />
    <label class="capability-toggle"><input class="multi-skill-state" type="checkbox" ${employee?.capabilities[index] ? "checked" : ""} ${employee ? "" : "disabled"} /><span>已具备</span></label>
    <button class="danger-button delete-multi-skill" type="button">删除技能</button>
  </div>`).join("");
  setFormMessage(els.multiEditorMessage, employee ? "" : "当前类别暂无人员，可点击“新增人员”。");
}

async function saveAllChanges(messageElement, validate) {
  const submit = messageElement.closest("form").querySelector('button[type="submit"]');
  try {
    if (validate) validate();
    touchData();
    submit.disabled = true;
    setFormMessage(messageElement, "正在保存…");
    await saveRemoteData();
    refreshDashboard();
    setFormMessage(messageElement, "修改已保存，其他人刷新页面即可看到", "success");
    return true;
  } catch (error) {
    const conflict = /conflict|40001/i.test(error.message || "");
    setFormMessage(messageElement, conflict ? "数据已被其他管理员修改，请关闭编辑后刷新再试" : error.message, "error");
    if (/登录|JWT|token/i.test(error.message || "")) logoutEditor();
    return false;
  } finally {
    submit.disabled = false;
  }
}

function refreshDashboard() {
  els.updatedAt.textContent = data.meta.updated;
  updateGroupOptions();
  render();
}

function openEditorPanel() {
  closeLogin();
  populateEditor();
  els.editorBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeEditorPanel() {
  els.editorBackdrop.hidden = true;
  document.body.style.overflow = "";
}

function logoutEditor() {
  authSession = null;
  closeEditorPanel();
  els.openEditor.textContent = "在线编辑";
}

function openGroup(group) {
  const stats = groupStats(group);
  const skills = group.employees[0]?.skills || [];
  const skillCell = (skill, mode) => {
    const value = Number(skill[mode] || 0);
    const companion = Number(skill[mode === "actual" ? "required" : "actual"] || 0);
    const dotSkill = mode === "actual"
      ? { name: skill.name, actual: value, required: Number(skill.required || 0) }
      : { name: skill.name, actual: value, required: 0 };
    const label = `${skill.name}：${mode === "actual" ? "实际具备" : "岗位需要"} ${value}${mode === "actual" ? `，岗位需要 ${companion}` : ""}`;
    return `<td class="matrix-value ${mode === "actual" ? "actual-value" : "required-value"}"><div class="matrix-value-inner" title="${escapeHtml(label)}">${dotMarkup(dotSkill, "matrix-dot")}<small>${value}</small></div></td>`;
  };
  const rows = group.employees.map((employee, employeeIndex) => {
    const qualities = ["工作态度", "协作能力", "执行力"].map((key) => `<td class="quality-cell" rowspan="2">${escapeHtml(employee.qualities[key] || "—")}</td>`).join("");
    return `<tr class="required-row">
      <td class="matrix-fixed role-cell" rowspan="2">${escapeHtml(employee.role)}</td>
      <td class="matrix-fixed name-cell" rowspan="2"><button class="name-link" type="button" data-action="employee" data-group="${escapeHtml(group.id)}" data-employee="${employeeIndex}">${escapeHtml(employee.name)}</button></td>
      <td class="matrix-fixed position-cell" rowspan="2">${escapeHtml(employee.position)}</td>
      <td class="ability-cell">岗位需要</td>
      ${employee.skills.map((skill) => skillCell(skill, "required")).join("")}
      ${qualities}
      <td class="backup-cell" rowspan="2">${escapeHtml(employee.backup || "—")}</td>
    </tr>
    <tr class="actual-row">
      <td class="ability-cell">实际具备</td>
      ${employee.skills.map((skill) => skillCell(skill, "actual")).join("")}
    </tr>`;
  }).join("");
  const table = `<div class="source-matrix-meta">
      <div><span>一级部门</span><strong>${escapeHtml(group.department || "仓储部")}</strong></div>
      <div><span>更新人</span><strong>${escapeHtml(group.updatedBy || "—")}</strong></div>
      <div><span>更新时间</span><strong>${escapeHtml(group.updateDate)}</strong></div>
      <div><span>文件编号</span><strong>${escapeHtml(group.documentNo || "—")}</strong></div>
    </div>
    <div class="matrix-summary-line"><span>${group.employees.length} 名员工</span><span>岗位技能达标率 ${stats.rate.toFixed(1)}%</span><span>待提升 ${stats.gaps} 项</span><span>圆圈下方为原表分数</span></div>
    <div class="source-table-scroll"><table class="source-matrix-table">
      <thead>
        <tr class="group-head"><th colspan="4">技能　岗位　人员</th><th colspan="${skills.length}">专业技能</th><th colspan="3">个人素养</th><th rowspan="2">顶岗人</th></tr>
        <tr class="skill-head"><th>岗位</th><th>姓名</th><th>岗位名称</th><th>岗位需要／实际具备</th>${skills.map((skill) => `<th>${escapeHtml(skill.name)}</th>`).join("")}<th>工作态度</th><th>协作能力</th><th>执行力</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="matrix-note">专业技能圆圈：空白表示尚未掌握，四分之一表示学习中，二分之一表示基本掌握，四分之三表示基本熟练，实心表示熟练并可带徒。黄色行为“实际具备”。</p>`;
  openDialog(group.name, `${group.area} · 完整技能矩阵`, table);
}

function openEmployee(group, employee) {
  const stats = employeeStats(employee);
  const qualityText = Object.entries(employee.qualities).map(([key, value]) => `${key}：${value || "未填写"}`).join("　");
  const list = employee.skills.map((skill) => {
    const required = Number(skill.required || 0);
    const actual = Number(skill.actual || 0);
    const needsWork = required > 0 && actual < required;
    const notRequired = required === 0;
    return `<article class="employee-skill ${needsWork ? "needs-work" : ""} ${notRequired ? "not-required" : ""}">
      <div><h4>${escapeHtml(skill.name)}${needsWork ? " · 待提升" : ""}</h4><div class="skill-bar"><i style="width:${Math.min(actual, 100)}%"></i></div></div>
      <div class="score-pair"><strong>${actual}</strong><span>岗位要求 ${required || "—"}</span></div>
    </article>`;
  }).join("");
  const content = `<div class="detail-meta"><span>${escapeHtml(group.area)} · ${escapeHtml(group.name)}</span><span>${escapeHtml(employee.role)}</span><span>岗位：${escapeHtml(employee.position)}</span><span>顶岗人：${escapeHtml(employee.backup || "未填写")}</span></div>
    <div class="detail-kpis"><div><strong>${stats.rate.toFixed(1)}%</strong><span>个人岗位技能达标率</span></div><div><strong>${stats.gaps}</strong><span>待提升技能项</span></div><div><strong>${stats.mentor}</strong><span>熟练/可带徒技能项</span></div></div>
    <p class="update-note" style="color:#52677d;margin:0 0 14px">${escapeHtml(qualityText)}</p>
    <div class="employee-skill-list">${list}</div>`;
  openDialog(employee.name, `${group.name} · 员工技能明细`, content);
}

function openPlans() {
  const rows = data.plans.map((plan) => `<tr><td><strong>${escapeHtml(plan.name)}</strong><br><small>${escapeHtml(plan.role)}</small></td><td>${escapeHtml(plan.current)}</td><td>${escapeHtml(plan.target)}</td><td>${escapeHtml(plan.content)}</td><td>${escapeHtml(plan.start)}<br>至 ${escapeHtml(plan.end)}</td></tr>`).join("");
  const body = rows || `<tr><td colspan="5" class="empty-table-cell">暂无培养计划</td></tr>`;
  openDialog("员工提升计划", "仓储部 · 计划明细", `<div class="table-scroll"><table class="plan-detail-table"><thead><tr><th>人员</th><th>目前岗位</th><th>培训岗位</th><th>培训内容</th><th>计划周期</th></tr></thead><tbody>${body}</tbody></table></div>`);
}

function multiStatusDot(hasSkill, skillName) {
  const label = `${skillName}：${hasSkill ? "已具备该技能" : "不具备该技能"}`;
  return `<span class="multi-status-dot ${hasSkill ? "has-skill" : "no-skill"}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`;
}

function openMultiSkillBoard(board) {
  const sections = board.sections.map((section) => {
    const rows = section.employees.map((employee, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(employee.role)}</td><td><strong>${escapeHtml(employee.name)}</strong></td>${section.skills.map((skill, skillIndex) => `<td>${multiStatusDot(Boolean(employee.capabilities[skillIndex]), skill)}</td>`).join("")}</tr>`).join("");
    return `<section class="multi-board-section">
      <h3>${escapeHtml(section.name)}</h3>
      <div class="multi-table-scroll"><table class="multi-skill-table"><thead><tr><th>序号</th><th>岗位</th><th>姓名</th>${section.skills.map((skill) => `<th>${escapeHtml(skill)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
    </section>`;
  }).join("");
  openDialog(board.title, `${board.area} · 原表数据`, `${sections}<div class="multi-legend"><span>${multiStatusDot(true, "已具备该技能")} 已具备该技能</span><span>${multiStatusDot(false, "不具备该技能")} 不具备该技能</span></div>`);
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    state.area = button.dataset.area;
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
    updateGroupOptions();
    render();
  });
});

els.groupFilter.addEventListener("change", () => { state.group = els.groupFilter.value; render(); });
els.search.addEventListener("input", () => { state.query = els.search.value; render(); });

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "plans") return openPlans();
  if (action === "multi") {
    const board = data.multiSkillBoards.find((item) => item.id === target.dataset.board);
    if (board) openMultiSkillBoard(board);
    return;
  }
  const group = data.groups.find((item) => item.id === target.dataset.group);
  if (!group) return;
  if (action === "group") openGroup(group);
  if (action === "employee") openEmployee(group, group.employees[Number(target.dataset.employee)]);
});

document.getElementById("closeDialog").addEventListener("click", closeDialog);
els.backdrop.addEventListener("click", (event) => { if (event.target === els.backdrop) closeDialog(); });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!els.editorBackdrop.hidden) closeEditorPanel();
  else if (!els.loginBackdrop.hidden) closeLogin();
  else if (!els.backdrop.hidden) closeDialog();
});

els.openEditor.addEventListener("click", () => authSession ? openEditorPanel() : openLogin());
document.getElementById("closeLogin").addEventListener("click", closeLogin);
document.getElementById("cancelLogin").addEventListener("click", closeLogin);
els.loginBackdrop.addEventListener("click", (event) => { if (event.target === els.loginBackdrop) closeLogin(); });
document.getElementById("closeEditor").addEventListener("click", closeEditorPanel);
els.editorBackdrop.addEventListener("click", (event) => { if (event.target === els.editorBackdrop) closeEditorPanel(); });
document.querySelectorAll(".logout-editor").forEach((button) => button.addEventListener("click", logoutEditor));

document.querySelectorAll("[data-editor-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.editorTab;
    document.querySelectorAll("[data-editor-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
    els.matrixEditorPanel.hidden = mode !== "matrix";
    els.groupsEditorPanel.hidden = mode !== "groups";
    els.plansEditorPanel.hidden = mode !== "plans";
    els.multiEditorPanel.hidden = mode !== "multi";
  });
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phone = els.editorPhone.value.replace(/\s+/g, "");
  const password = els.editorPassword.value;
  if (!/^\d{6,20}$/.test(phone)) return setFormMessage(els.loginMessage, "请输入正确的手机号", "error");
  if (!backendConfigured()) return setFormMessage(els.loginMessage, "在线编辑服务尚未初始化，请联系看板维护人员", "error");
  const submit = els.loginForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  setFormMessage(els.loginMessage, "正在验证…");
  try {
    authSession = await authenticateEditor(phone, password);
    els.openEditor.textContent = "继续编辑";
    openEditorPanel();
  } catch (error) {
    setFormMessage(els.loginMessage, "手机号或密码不正确", "error");
  } finally {
    submit.disabled = false;
  }
});

els.editGroupSelect.addEventListener("change", () => populateEmployeeOptions(0));
els.editEmployeeSelect.addEventListener("change", renderEmployeeEditor);
els.editGroupQuery.addEventListener("input", () => populateGroupAdminOptions(els.editGroupAdminSelect.value));
els.editGroupAdminSelect.addEventListener("change", renderGroupEditor);
els.editPlanSelect.addEventListener("change", renderPlanEditor);
els.editMultiBoardSelect.addEventListener("change", () => populateMultiSectionOptions());
els.editMultiSectionSelect.addEventListener("change", () => populateMultiEmployeeOptions());
els.editMultiEmployeeSelect.addEventListener("change", renderMultiEditor);

els.employeeEditor.addEventListener("input", (event) => {
  const employee = selectedEditEmployee();
  if (!employee) return;
  if (event.target === els.editName) employee.name = event.target.value;
  else if (event.target === els.editRole) employee.role = event.target.value;
  else if (event.target === els.editPosition) employee.position = event.target.value;
  else if (event.target === els.editBackup) employee.backup = event.target.value;
  else if (event.target.matches(".required-input, .actual-input")) {
    const row = event.target.closest(".skill-edit-row");
    const skill = employee.skills[Number(row.dataset.skillIndex)];
    const value = Number(event.target.value);
    if (Number.isFinite(value)) skill[event.target.matches(".required-input") ? "required" : "actual"] = value;
  }
});

document.getElementById("addEmployee").addEventListener("click", () => {
  const group = selectedEditGroup();
  const templateSkills = group.employees[0]?.skills || [];
  group.employees.push({
    role: "仓管员",
    name: "新员工",
    position: "",
    backup: "",
    qualities: { 工作态度: "合格", 协作能力: "合格", 执行力: "合格" },
    skills: templateSkills.map((skill) => ({ name: skill.name, required: 0, actual: 0 })),
  });
  populateEmployeeOptions(group.employees.length - 1);
  setFormMessage(els.editorMessage, "已新增人员，请填写资料后保存", "success");
});

document.getElementById("deleteEmployee").addEventListener("click", () => {
  const group = selectedEditGroup();
  const employee = selectedEditEmployee();
  if (group.employees.length <= 1) return setFormMessage(els.editorMessage, "每个业务组至少需要保留一名员工", "error");
  if (!employee || !window.confirm(`确定删除“${employee.name}”吗？保存后才会正式生效。`)) return;
  group.employees.splice(selectedEmployeeIndex(), 1);
  populateEmployeeOptions(0);
  setFormMessage(els.editorMessage, "人员已从当前列表移除，请点击保存使修改生效", "success");
});

document.getElementById("addGroup").addEventListener("click", () => {
  const source = selectedAdminGroup() || data.groups[0];
  const sourceSkills = source?.employees?.[0]?.skills || [];
  const id = `group-${Date.now()}`;
  const group = {
    id,
    area: source?.area || "成品仓",
    name: "新业务组",
    sourceSheet: "新业务组",
    documentNo: "",
    department: source?.department || "仓储部",
    updatedBy: "",
    updateDate: data.meta.updated,
    employees: [{
      role: "仓管员",
      name: "新员工",
      position: "",
      backup: "",
      qualities: { 工作态度: "合格", 协作能力: "合格", 执行力: "合格" },
      skills: sourceSkills.map((skill) => ({ name: skill.name, required: 0, actual: 0 })),
    }],
  };
  data.groups.push(group);
  els.editGroupQuery.value = "";
  populateGroupAdminOptions(id);
  populateMatrixGroupOptions(id);
  setFormMessage(els.groupEditorMessage, "已新增业务组，请填写资料后保存", "success");
});

document.getElementById("deleteGroup").addEventListener("click", () => {
  const group = selectedAdminGroup();
  if (!group) return;
  if (data.groups.length <= 1) return setFormMessage(els.groupEditorMessage, "至少需要保留一个业务组", "error");
  const employeeCount = group.employees?.length || 0;
  if (!window.confirm(`确定删除“${group.area} · ${group.name}”吗？该组 ${employeeCount} 名员工也会一并删除，保存后才会正式生效。`)) return;
  data.groups = data.groups.filter((item) => item.id !== group.id);
  els.editGroupQuery.value = "";
  populateGroupAdminOptions();
  populateMatrixGroupOptions();
  setFormMessage(els.groupEditorMessage, "业务组已移除，请点击保存使修改生效", "success");
});

els.planEditor.addEventListener("input", (event) => {
  const plan = selectedPlan();
  if (!plan) return;
  const fields = new Map([
    [els.editPlanName, "name"], [els.editPlanRole, "role"], [els.editPlanCurrent, "current"],
    [els.editPlanTarget, "target"], [els.editPlanContent, "content"], [els.editPlanStart, "start"], [els.editPlanEnd, "end"],
  ]);
  const key = fields.get(event.target);
  if (key) plan[key] = event.target.value;
});

document.getElementById("addPlan").addEventListener("click", () => {
  const plan = { id: `plan-${Date.now()}`, role: "仓管员", name: "新员工", current: "", target: "待填写", content: "", start: "", end: "" };
  data.plans.push(plan);
  populatePlanOptions(plan.id);
  setFormMessage(els.planEditorMessage, "已新增计划，请填写后保存", "success");
});

document.getElementById("deletePlan").addEventListener("click", () => {
  const plan = selectedPlan();
  if (!plan || !window.confirm(`确定删除“${plan.name}”的提升计划吗？保存后才会正式生效。`)) return;
  data.plans = data.plans.filter((item) => item.id !== plan.id);
  populatePlanOptions();
  if (data.plans.length) setFormMessage(els.planEditorMessage, "计划已移除，请点击保存使修改生效", "success");
});

els.multiEditor.addEventListener("input", (event) => {
  const section = selectedMultiSection();
  const employee = selectedMultiEmployee();
  if (!section) return;
  if (event.target === els.editMultiName && employee) employee.name = event.target.value;
  else if (event.target === els.editMultiRole && employee) employee.role = event.target.value;
  else {
    const row = event.target.closest(".multi-skill-edit-row");
    if (!row) return;
    const index = Number(row.dataset.skillIndex);
    if (event.target.matches(".multi-skill-name")) section.skills[index] = event.target.value;
    if (event.target.matches(".multi-skill-state") && employee) employee.capabilities[index] = event.target.checked;
  }
});

document.getElementById("addMultiEmployee").addEventListener("click", () => {
  const section = selectedMultiSection();
  if (!section) return;
  const employee = { id: `${section.id}-employee-${Date.now()}`, role: "仓管员", name: "新员工", capabilities: section.skills.map(() => false) };
  section.employees.push(employee);
  populateMultiEmployeeOptions(employee.id);
  setFormMessage(els.multiEditorMessage, "已新增人员，请填写技能状态后保存", "success");
});

document.getElementById("deleteMultiEmployee").addEventListener("click", () => {
  const section = selectedMultiSection();
  const employee = selectedMultiEmployee();
  if (!section || !employee || !window.confirm(`确定从多能工一览表删除“${employee.name}”吗？保存后才会正式生效。`)) return;
  section.employees = section.employees.filter((item) => item.id !== employee.id);
  populateMultiEmployeeOptions();
  setFormMessage(els.multiEditorMessage, "人员已移除，请点击保存使修改生效", "success");
});

document.getElementById("addMultiSkill").addEventListener("click", () => {
  const section = selectedMultiSection();
  if (!section) return;
  section.skills.push("新技能");
  section.employees.forEach((employee) => employee.capabilities.push(false));
  renderMultiEditor();
  setFormMessage(els.multiEditorMessage, "已新增技能，请修改名称和人员状态后保存", "success");
});

els.multiSkillEditor.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-multi-skill");
  if (!button) return;
  const section = selectedMultiSection();
  const row = button.closest(".multi-skill-edit-row");
  const index = Number(row.dataset.skillIndex);
  const skill = section.skills[index];
  if (!window.confirm(`确定删除技能“${skill}”吗？该列所有员工状态也会删除。`)) return;
  section.skills.splice(index, 1);
  section.employees.forEach((employee) => employee.capabilities.splice(index, 1));
  renderMultiEditor();
  setFormMessage(els.multiEditorMessage, "技能列已移除，请点击保存使修改生效", "success");
});

els.employeeEditor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = els.employeeEditor.querySelector('button[type="submit"]');
  try {
    commitFormToEmployee();
    submit.disabled = true;
    setFormMessage(els.editorMessage, "正在保存…");
    await saveRemoteData();
    refreshDashboard();
    populateEmployeeOptions(selectedEmployeeIndex());
    setFormMessage(els.editorMessage, "修改已保存，其他人刷新页面即可看到", "success");
  } catch (error) {
    const conflict = /conflict|40001/i.test(error.message || "");
    setFormMessage(els.editorMessage, conflict ? "数据已被其他管理员修改，请关闭编辑后刷新再试" : error.message, "error");
    if (/登录|JWT|token/i.test(error.message || "")) logoutEditor();
  } finally {
    submit.disabled = false;
  }
});

els.groupEditor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const groupId = selectedAdminGroup()?.id || "";
  const saved = await saveAllChanges(els.groupEditorMessage, commitGroupForm);
  if (saved) {
    populateGroupAdminOptions(groupId);
    populateMatrixGroupOptions(groupId);
    setFormMessage(els.groupEditorMessage, "修改已保存，其他人刷新页面即可看到", "success");
  }
});

els.planEditor.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveAllChanges(els.planEditorMessage, () => {
    const plan = selectedPlan();
    if (!plan) throw new Error("请先新增一条计划");
    if (!plan.name.trim() || !plan.role.trim() || !plan.target.trim()) throw new Error("姓名、岗位和培训岗位不能为空");
    if (plan.start && plan.end && plan.start > plan.end) throw new Error("结束日期不能早于开始日期");
  });
  populatePlanOptions(selectedPlan()?.id || "");
});

els.multiEditor.addEventListener("submit", async (event) => {
  event.preventDefault();
  const employeeId = selectedMultiEmployee()?.id || "";
  await saveAllChanges(els.multiEditorMessage, () => {
    const section = selectedMultiSection();
    const employee = selectedMultiEmployee();
    if (!employee) throw new Error("请先新增一名人员");
    if (!employee.name.trim() || !employee.role.trim()) throw new Error("姓名和岗位不能为空");
    if (section.skills.some((skill) => !skill.trim())) throw new Error("技能名称不能为空");
  });
  populateMultiEmployeeOptions(employeeId);
});

async function initializeApp() {
  applySiteIdentity();
  try { await loadRemoteData(); } catch (error) { console.warn("在线数据读取失败，已显示内置数据", error); }
  refreshDashboard();
  renderLegend();
  if (backendConfigured()) {
    setInterval(async () => {
      if (!els.editorBackdrop.hidden) return;
      try {
        const previousVersion = dataVersion;
        if (await loadRemoteData() && dataVersion !== previousVersion) refreshDashboard();
      } catch (error) { console.warn("在线数据自动刷新失败", error); }
    }, 60000);
  }
}

initializeApp();
