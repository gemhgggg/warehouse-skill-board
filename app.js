const data = window.SKILL_DATA;
const state = { area: "全部", group: "全部", query: "" };

const els = {
  wall: document.getElementById("matrixWall"),
  groupFilter: document.getElementById("groupFilter"),
  search: document.getElementById("searchInput"),
  legend: document.getElementById("legend"),
  updatedAt: document.getElementById("updatedAt"),
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
};

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
  const rows = group.employees.map((employee) => {
    const employeeIndex = data.groups.find((item) => item.id === group.id).employees.findIndex((item) => item.name === employee.name);
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

function render() {
  const groups = filteredGroups();
  renderKpis(groups);
  els.wall.innerHTML = groups.length ? groups.map(groupCard).join("") + ((state.area === "全部" && state.group === "全部" && !state.query) ? planCard() : "") : `<div class="empty-card">没有找到匹配的员工或业务组，请调整筛选条件。</div>`;
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
  openDialog("员工提升计划", "仓储部 · 计划明细", `<div class="table-scroll"><table class="plan-detail-table"><thead><tr><th>人员</th><th>目前岗位</th><th>培训岗位</th><th>培训内容</th><th>计划周期</th></tr></thead><tbody>${rows}</tbody></table></div>`);
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
  const group = data.groups.find((item) => item.id === target.dataset.group);
  if (!group) return;
  if (action === "group") openGroup(group);
  if (action === "employee") openEmployee(group, group.employees[Number(target.dataset.employee)]);
});

document.getElementById("closeDialog").addEventListener("click", closeDialog);
els.backdrop.addEventListener("click", (event) => { if (event.target === els.backdrop) closeDialog(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !els.backdrop.hidden) closeDialog(); });

els.updatedAt.textContent = data.meta.updated;
renderLegend();
updateGroupOptions();
render();
