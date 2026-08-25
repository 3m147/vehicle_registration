import { DEFAULT_PURPOSES, SITE_GROUPS } from "./sites.js";
import {
  addApplication,
  addGroup,
  addMember,
  deleteMember,
  getApplications,
  getGroups,
  getMembers,
  getRecentMembers,
  isStorageAvailable,
  touchMembers,
  updateMember
} from "./storage.js";
import { maskPhone, maskVehicle, normalizePhone, searchMembers, toggleFavorite } from "./members.js";
import { buildExcelFileName, createExcelFromTemplate } from "./excel.js";
import { getTemplateByVisitDates } from "./templates.js";

const state = {
  members: [],
  selectedMemberIds: [],
  templateArrayBuffer: null,
  loadedTemplateId: "",
  editingMemberId: null
};

const elements = {
  siteSelect: document.querySelector("#siteSelect"),
  receivedDateInput: document.querySelector("#receivedDateInput"),
  startDateInput: document.querySelector("#startDateInput"),
  endDateInput: document.querySelector("#endDateInput"),
  purposeInput: document.querySelector("#purposeInput"),
  departmentInput: document.querySelector("#departmentInput"),
  managerInput: document.querySelector("#managerInput"),
  noteInput: document.querySelector("#noteInput"),
  purposeList: document.querySelector("#purposeList"),
  templateHelpText: document.querySelector("#templateHelpText"),
  templateStatus: document.querySelector("#templateStatus"),
  memberSearchInput: document.querySelector("#memberSearchInput"),
  memberList: document.querySelector("#memberList"),
  recentMembers: document.querySelector("#recentMembers"),
  memberGroups: document.querySelector("#memberGroups"),
  selectedMembers: document.querySelector("#selectedMembers"),
  selectedCount: document.querySelector("#selectedCount"),
  previewBox: document.querySelector("#previewBox"),
  messageBox: document.querySelector("#messageBox"),
  history: document.querySelector("#applicationHistory"),
  generateExcelButton: document.querySelector("#generateExcelButton"),
  openMemberModalButton: document.querySelector("#openMemberModalButton"),
  memberDialog: document.querySelector("#memberDialog"),
  memberForm: document.querySelector("#memberForm"),
  memberDialogTitle: document.querySelector("#memberDialogTitle"),
  memberIdInput: document.querySelector("#memberIdInput"),
  memberCompanyInput: document.querySelector("#memberCompanyInput"),
  memberNameInput: document.querySelector("#memberNameInput"),
  memberPhoneInput: document.querySelector("#memberPhoneInput"),
  memberVehicleInput: document.querySelector("#memberVehicleInput"),
  memberCameraInput: document.querySelector("#memberCameraInput"),
  memberAddNowInput: document.querySelector("#memberAddNowInput"),
  closeMemberModalButton: document.querySelector("#closeMemberModalButton"),
  cancelMemberButton: document.querySelector("#cancelMemberButton"),
  saveGroupButton: document.querySelector("#saveGroupButton")
};

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function showMessage(message, type = "info") {
  elements.messageBox.textContent = message;
  elements.messageBox.className = `message-box ${type}`;

  if (type === "error") {
    elements.messageBox.scrollIntoView({ block: "center" });
  }
}

function clearMessage() {
  elements.messageBox.textContent = "";
  elements.messageBox.className = "message-box";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function getApplicationFormData() {
  return {
    site: elements.siteSelect.value,
    receivedDate: elements.receivedDateInput.value,
    startDate: elements.startDateInput.value,
    endDate: elements.endDateInput.value || elements.startDateInput.value,
    purpose: elements.purposeInput.value.trim(),
    department: elements.departmentInput.value.trim(),
    manager: elements.managerInput.value.trim(),
    note: elements.noteInput.value.trim()
  };
}

function getSelectedMembers() {
  return state.selectedMemberIds
    .map((memberId) => state.members.find((member) => member.id === memberId))
    .filter(Boolean);
}

function getCurrentTemplate() {
  return getTemplateByVisitDates(elements.startDateInput.value, elements.endDateInput.value || elements.startDateInput.value);
}

function validateApplication(application, selectedMembers) {
  const errors = [];
  const template = getCurrentTemplate();
  const maxVisitors = template.maxVisitors || template.mapping?.visitors?.maxRows || 15;

  if (!application.site) errors.push("출입 사이트를 선택해주세요.");
  if (!application.receivedDate) errors.push("접수일자를 선택해주세요.");
  if (!application.startDate) errors.push("출입 시작일을 선택해주세요.");
  if (!application.endDate) errors.push("출입 종료일을 선택해주세요.");
  if (!application.purpose) errors.push("출입 목적을 입력해주세요.");
  if (selectedMembers.length < 1) errors.push("출입자를 최소 1명 선택해주세요.");
  if (selectedMembers.length > maxVisitors) {
    errors.push(`${template.name}에는 최대 ${maxVisitors}명까지 입력할 수 있습니다.`);
  }

  return errors;
}

function renderTemplateState() {
  const template = getCurrentTemplate();
  const maxVisitors = template.maxVisitors || template.mapping?.visitors?.maxRows || 15;

  if (state.templateArrayBuffer && state.loadedTemplateId === template.id) {
    elements.templateStatus.textContent = `${template.name} 준비`;
    elements.templateHelpText.textContent = `${template.name} 양식이 자동 선택되었습니다. 최대 ${maxVisitors}명까지 입력할 수 있습니다.`;
  } else {
    elements.templateStatus.textContent = "템플릿 확인 중";
    elements.templateHelpText.textContent = `${template.name} 양식을 불러오는 중입니다.`;
  }

  elements.templateStatus.classList.toggle(
    "ready",
    Boolean(state.templateArrayBuffer && state.loadedTemplateId === template.id)
  );
}

function renderSiteOptions() {
  elements.siteSelect.innerHTML = '<option value="">사이트 선택</option>';

  SITE_GROUPS.forEach((group) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.group;

    group.sites.forEach((site) => {
      const option = document.createElement("option");
      option.value = site;
      option.textContent = site;
      optgroup.appendChild(option);
    });

    elements.siteSelect.appendChild(optgroup);
  });
}

function renderPurposeOptions() {
  elements.purposeList.innerHTML = DEFAULT_PURPOSES.map((purpose) => {
    return `<option value="${escapeHtml(purpose)}"></option>`;
  }).join("");
}

function setInitialDates() {
  const today = todayText();
  elements.receivedDateInput.value = today;
  elements.startDateInput.value = today;
  elements.endDateInput.value = today;
}

function syncEndDate() {
  if (!elements.endDateInput.value || elements.endDateInput.value < elements.startDateInput.value) {
    elements.endDateInput.value = elements.startDateInput.value;
  }
}

function toggleSelectedMember(memberId) {
  if (state.selectedMemberIds.includes(memberId)) {
    state.selectedMemberIds = state.selectedMemberIds.filter((id) => id !== memberId);
  } else {
    state.selectedMemberIds = [...state.selectedMemberIds, memberId];
  }

  renderAll();
}

function addMemberToSelection(memberId) {
  if (!state.selectedMemberIds.includes(memberId)) {
    state.selectedMemberIds = [...state.selectedMemberIds, memberId];
  }
}

function renderMemberList() {
  const filteredMembers = searchMembers(state.members, elements.memberSearchInput.value);

  if (!filteredMembers.length) {
    elements.memberList.innerHTML = '<p class="empty-text">등록된 출입자가 없습니다.</p>';
    return;
  }

  elements.memberList.innerHTML = filteredMembers
    .map((member) => {
      const checked = state.selectedMemberIds.includes(member.id) ? "checked" : "";
      const favorite = member.favorite ? "★" : "☆";

      return `
        <article class="member-card ${checked ? "selected" : ""}" data-member-id="${member.id}">
          <label class="member-check">
            <input type="checkbox" ${checked} />
            <span>
              <strong>${favorite} ${escapeHtml(member.name)}</strong>
              <small>${escapeHtml(member.company || "소속 미입력")}</small>
            </span>
          </label>
          <div class="member-meta">
            <span>${escapeHtml(maskPhone(member.phone))}</span>
            <span>${escapeHtml(maskVehicle(member.vehicle))}</span>
            <span>카메라 ${escapeHtml(member.camera || "X")}</span>
          </div>
          <div class="card-actions">
            <button type="button" class="text-button" data-action="favorite">${favorite}</button>
            <button type="button" class="text-button" data-action="edit">수정</button>
            <button type="button" class="text-button danger" data-action="delete">삭제</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRecentMembers() {
  const recentMembers = getRecentMembers(8);

  if (!recentMembers.length) {
    elements.recentMembers.innerHTML = '<p class="empty-text">최근 출입자가 없습니다.</p>';
    return;
  }

  elements.recentMembers.innerHTML = recentMembers
    .map((member) => `<button type="button" class="chip" data-member-id="${member.id}">${escapeHtml(member.name)}</button>`)
    .join("");
}

function renderGroups() {
  const groups = getGroups();

  if (!groups.length) {
    elements.memberGroups.innerHTML = '<p class="empty-text">저장된 그룹이 없습니다.</p>';
    return;
  }

  elements.memberGroups.innerHTML = groups
    .map((group) => {
      return `<button type="button" class="chip" data-group-id="${group.id}">${escapeHtml(group.name)}</button>`;
    })
    .join("");
}

function renderSelectedMembers() {
  const selectedMembers = getSelectedMembers();
  elements.selectedCount.textContent = `${selectedMembers.length}명`;

  if (!selectedMembers.length) {
    elements.selectedMembers.innerHTML = '<li class="empty-text">선택된 출입자가 없습니다.</li>';
    return;
  }

  elements.selectedMembers.innerHTML = selectedMembers
    .map((member) => {
      return `
        <li>
          <span>${escapeHtml(member.name)}</span>
          <button type="button" class="text-button danger" data-member-id="${member.id}">제외</button>
        </li>
      `;
    })
    .join("");
}

function renderPreview() {
  const application = getApplicationFormData();
  const selectedMembers = getSelectedMembers();
  const template = getCurrentTemplate();
  const dateText =
    application.startDate === application.endDate
      ? application.startDate || "-"
      : `${application.startDate || "-"} ~ ${application.endDate || "-"}`;

  elements.previewBox.innerHTML = `
    <dl>
      <div><dt>사이트</dt><dd>${escapeHtml(application.site || "-")}</dd></div>
      <div><dt>Excel 양식</dt><dd>${escapeHtml(template.name)}</dd></div>
      <div><dt>출입일</dt><dd>${escapeHtml(dateText)}</dd></div>
      <div><dt>출입목적</dt><dd>${escapeHtml(application.purpose || "-")}</dd></div>
      <div><dt>출입인원</dt><dd>${selectedMembers.length}명</dd></div>
    </dl>
    <ol>
      ${
        selectedMembers.length
          ? selectedMembers.map((member) => `<li>${escapeHtml(member.name)}</li>`).join("")
          : '<li class="empty-text">출입자를 선택해주세요.</li>'
      }
    </ol>
  `;
}

function renderHistory() {
  const applications = getApplications();

  if (!applications.length) {
    elements.history.innerHTML = '<p class="empty-text">최근 신청 기록이 없습니다.</p>';
    return;
  }

  elements.history.innerHTML = applications
    .map((application) => {
      const visitors = application.visitorIds
        .map((id) => state.members.find((member) => member.id === id))
        .filter(Boolean);
      const visitorSummary =
        visitors.length > 1 ? `${visitors[0].name} 외 ${visitors.length - 1}명` : visitors[0]?.name || "-";

      return `
        <article class="history-item">
          <strong>${escapeHtml(application.site)}</strong>
          <span>${escapeHtml(application.startDate)} · ${escapeHtml(visitorSummary)}</span>
          <small>${escapeHtml(application.purpose)}</small>
          <button type="button" class="secondary-button compact" data-application-id="${application.id}">복사</button>
        </article>
      `;
    })
    .join("");
}

function renderAll() {
  state.members = getMembers();
  renderTemplateState();
  renderMemberList();
  renderRecentMembers();
  renderGroups();
  renderSelectedMembers();
  renderPreview();
  renderHistory();
}

async function loadCurrentTemplate() {
  const template = getCurrentTemplate();

  if (state.templateArrayBuffer && state.loadedTemplateId === template.id) {
    renderTemplateState();
    return;
  }

  try {
    const response = await fetch(template.file);
    if (!response.ok) {
      throw new Error("템플릿 파일이 없습니다.");
    }

    state.templateArrayBuffer = await response.arrayBuffer();
    state.loadedTemplateId = template.id;
  } catch (error) {
    state.templateArrayBuffer = null;
    state.loadedTemplateId = "";
  } finally {
    renderTemplateState();
  }
}

function resetMemberForm() {
  state.editingMemberId = null;
  elements.memberDialogTitle.textContent = "신규 출입자";
  elements.memberIdInput.value = "";
  elements.memberCompanyInput.value = "";
  elements.memberNameInput.value = "";
  elements.memberPhoneInput.value = "";
  elements.memberVehicleInput.value = "";
  elements.memberCameraInput.value = "X";
  elements.memberAddNowInput.checked = true;
}

function openMemberDialog(member) {
  if (member) {
    state.editingMemberId = member.id;
    elements.memberDialogTitle.textContent = "출입자 수정";
    elements.memberIdInput.value = member.id;
    elements.memberCompanyInput.value = member.company || "";
    elements.memberNameInput.value = member.name || "";
    elements.memberPhoneInput.value = member.phone || "";
    elements.memberVehicleInput.value = member.vehicle || "";
    elements.memberCameraInput.value = member.camera || "X";
    elements.memberAddNowInput.checked = state.selectedMemberIds.includes(member.id);
  } else {
    resetMemberForm();
  }

  elements.memberDialog.showModal();
}

function closeMemberDialog() {
  elements.memberDialog.close();
}

function saveMemberFromForm() {
  const memberData = {
    company: elements.memberCompanyInput.value.trim(),
    name: elements.memberNameInput.value.trim(),
    phone: normalizePhone(elements.memberPhoneInput.value.trim()),
    vehicle: elements.memberVehicleInput.value.trim(),
    camera: elements.memberCameraInput.value
  };

  if (!memberData.name) {
    throw new Error("출입자 이름을 입력해주세요.");
  }

  let savedMember;
  if (state.editingMemberId) {
    savedMember = updateMember(state.editingMemberId, memberData);
  } else {
    savedMember = addMember(memberData);
  }

  if (elements.memberAddNowInput.checked && savedMember) {
    addMemberToSelection(savedMember.id);
  }

  closeMemberDialog();
  renderAll();
}

async function generateExcel() {
  clearMessage();
  elements.generateExcelButton.disabled = true;
  elements.generateExcelButton.textContent = "생성 중입니다";

  const application = getApplicationFormData();
  const template = getCurrentTemplate();
  await loadCurrentTemplate();
  const selectedMembers = getSelectedMembers();
  const errors = validateApplication(application, selectedMembers);

  if (errors.length) {
    showMessage(errors[0], "error");
    elements.generateExcelButton.disabled = false;
    elements.generateExcelButton.textContent = "출입신청서 생성";
    return;
  }

  if (!state.templateArrayBuffer) {
    showMessage(`${template.name} Excel 템플릿을 찾지 못했습니다. template 폴더의 파일을 확인해주세요.`, "error");
    elements.generateExcelButton.disabled = false;
    elements.generateExcelButton.textContent = "출입신청서 생성";
    return;
  }

  try {
    const blob = await createExcelFromTemplate(
      state.templateArrayBuffer.slice(0),
      template,
      { ...application, excelCompanyName: template.fixedCompanyName },
      selectedMembers
    );
    const fileName = buildExcelFileName(application.site, application.startDate, template);

    downloadBlob(blob, fileName);
    touchMembers(selectedMembers.map((member) => member.id), application.startDate);
    addApplication({
      ...application,
      templateId: template.id,
      templateName: template.name,
      visitorIds: selectedMembers.map((member) => member.id)
    });

    showMessage(`${fileName} 파일을 생성했습니다.`, "success");
    renderAll();
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Excel 생성에 실패했습니다.", "error");
  } finally {
    elements.generateExcelButton.disabled = false;
    elements.generateExcelButton.textContent = "출입신청서 생성";
  }
}

function copyApplication(applicationId) {
  const application = getApplications().find((item) => item.id === applicationId);
  if (!application) {
    return;
  }

  elements.siteSelect.value = application.site;
  elements.receivedDateInput.value = todayText();
  elements.startDateInput.value = application.startDate;
  elements.endDateInput.value = application.endDate;
  elements.purposeInput.value = application.purpose;
  elements.departmentInput.value = application.department || "";
  elements.managerInput.value = application.manager || "";
  elements.noteInput.value = application.note || "";
  state.selectedMemberIds = application.visitorIds.filter((id) => state.members.some((member) => member.id === id));
  showMessage("최근 신청 정보를 불러왔습니다. 날짜를 확인한 뒤 생성하세요.", "success");
  renderAll();
}

function bindEvents() {
  elements.startDateInput.addEventListener("change", async () => {
    syncEndDate();
    await loadCurrentTemplate();
    renderAll();
  });

  [
    elements.siteSelect,
    elements.receivedDateInput,
    elements.purposeInput,
    elements.departmentInput,
    elements.managerInput,
    elements.noteInput
  ].forEach((input) => input.addEventListener("input", renderPreview));

  elements.endDateInput.addEventListener("input", async () => {
    await loadCurrentTemplate();
    renderAll();
  });

  elements.memberSearchInput.addEventListener("input", renderMemberList);

  elements.memberList.addEventListener("click", (event) => {
    const card = event.target.closest(".member-card");
    if (!card) return;

    const memberId = card.dataset.memberId;
    const member = state.members.find((item) => item.id === memberId);
    const action = event.target.dataset.action;

    if (action === "edit") {
      openMemberDialog(member);
      return;
    }

    if (action === "delete") {
      if (window.confirm(`${member.name}님의 정보를 삭제하시겠습니까?`)) {
        deleteMember(memberId);
        state.selectedMemberIds = state.selectedMemberIds.filter((id) => id !== memberId);
        renderAll();
      }
      return;
    }

    if (action === "favorite") {
      toggleFavorite(memberId, member.favorite);
      renderAll();
      return;
    }

    toggleSelectedMember(memberId);
  });

  elements.recentMembers.addEventListener("click", (event) => {
    const button = event.target.closest("[data-member-id]");
    if (!button) return;
    addMemberToSelection(button.dataset.memberId);
    renderAll();
  });

  elements.memberGroups.addEventListener("click", (event) => {
    const button = event.target.closest("[data-group-id]");
    if (!button) return;

    const group = getGroups().find((item) => item.id === button.dataset.groupId);
    if (!group) return;

    group.memberIds.forEach(addMemberToSelection);
    renderAll();
  });

  elements.selectedMembers.addEventListener("click", (event) => {
    const button = event.target.closest("[data-member-id]");
    if (!button) return;
    state.selectedMemberIds = state.selectedMemberIds.filter((id) => id !== button.dataset.memberId);
    renderAll();
  });

  elements.openMemberModalButton.addEventListener("click", () => openMemberDialog());
  elements.closeMemberModalButton.addEventListener("click", closeMemberDialog);
  elements.cancelMemberButton.addEventListener("click", closeMemberDialog);

  elements.memberForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      saveMemberFromForm();
      showMessage("출입자 정보를 저장했습니다.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  elements.saveGroupButton.addEventListener("click", () => {
    if (!state.selectedMemberIds.length) {
      showMessage("그룹으로 저장할 출입자를 먼저 선택해주세요.", "error");
      return;
    }

    const groupName = window.prompt("그룹 이름을 입력하세요. 예: GOY1 UPS 정기점검팀");
    if (!groupName) {
      return;
    }

    addGroup(groupName.trim(), state.selectedMemberIds);
    showMessage("출입자 그룹을 저장했습니다.", "success");
    renderAll();
  });

  elements.generateExcelButton.addEventListener("click", generateExcel);

  elements.history.addEventListener("click", (event) => {
    const button = event.target.closest("[data-application-id]");
    if (!button) return;
    copyApplication(button.dataset.applicationId);
  });

}

async function init() {
  renderSiteOptions();
  renderPurposeOptions();
  setInitialDates();
  bindEvents();
  await loadCurrentTemplate();
  if (!isStorageAvailable()) {
    showMessage("이 브라우저에서는 출입자 정보 저장이 제한될 수 있습니다.", "error");
  }
  renderAll();
}

init();
