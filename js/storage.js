const STORAGE_KEYS = {
  members: "access_auto_members",
  applications: "access_auto_applications",
  groups: "access_auto_groups"
};

const LEGACY_STORAGE_KEYS = {
  members: "hansung_access_members",
  applications: "hansung_access_applications",
  groups: "hansung_access_groups"
};

function migrateLegacyData() {
  Object.entries(STORAGE_KEYS).forEach(([keyName, storageKey]) => {
    const legacyKey = LEGACY_STORAGE_KEYS[keyName];

    if (!localStorage.getItem(storageKey) && localStorage.getItem(legacyKey)) {
      localStorage.setItem(storageKey, localStorage.getItem(legacyKey));
    }

    localStorage.removeItem(legacyKey);
  });
}

function readJson(key, fallback) {
  try {
    migrateLegacyData();
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    console.error("저장 데이터를 읽는 중 오류가 발생했습니다.", error);
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function createId(prefix = "id") {
  if (window.crypto && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getMembers() {
  return readJson(STORAGE_KEYS.members, []);
}

export function saveMembers(members) {
  writeJson(STORAGE_KEYS.members, members);
}

export function addMember(member) {
  const members = getMembers();
  const duplicated = members.some((savedMember) => {
    return savedMember.name === member.name && savedMember.phone === member.phone;
  });

  if (duplicated) {
    throw new Error("이미 같은 이름과 연락처의 출입자가 등록되어 있습니다.");
  }

  const newMember = {
    id: createId("member"),
    company: "",
    name: "",
    phone: "",
    vehicle: "",
    camera: "X",
    favorite: false,
    lastUsedAt: "",
    ...member
  };

  saveMembers([newMember, ...members]);
  return newMember;
}

export function updateMember(memberId, patch) {
  const members = getMembers();
  const nextMembers = members.map((member) => {
    return member.id === memberId ? { ...member, ...patch } : member;
  });

  saveMembers(nextMembers);
  return nextMembers.find((member) => member.id === memberId);
}

export function deleteMember(memberId) {
  saveMembers(getMembers().filter((member) => member.id !== memberId));
}

export function touchMembers(memberIds, usedDate) {
  const today = usedDate || new Date().toISOString().slice(0, 10);

  saveMembers(
    getMembers().map((member) => {
      return memberIds.includes(member.id) ? { ...member, lastUsedAt: today } : member;
    })
  );
}

export function getRecentMembers(limit = 8) {
  return getMembers()
    .filter((member) => member.lastUsedAt)
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
    .slice(0, limit);
}

export function getApplications() {
  return readJson(STORAGE_KEYS.applications, []);
}

export function saveApplications(applications) {
  writeJson(STORAGE_KEYS.applications, applications.slice(0, 30));
}

export function addApplication(application) {
  const newApplication = {
    id: createId("application"),
    createdAt: new Date().toISOString(),
    ...application
  };

  saveApplications([newApplication, ...getApplications()]);
  return newApplication;
}

export function getGroups() {
  return readJson(STORAGE_KEYS.groups, []).filter((group) => group && group.name);
}

export function addGroup(groupName, memberIds = []) {
  const normalizedName = groupName.trim();
  const groups = getGroups();
  const duplicated = groups.some((group) => group.name === normalizedName);

  if (!normalizedName) {
    throw new Error("그룹 이름을 입력해주세요.");
  }

  if (duplicated) {
    throw new Error("이미 등록된 그룹입니다.");
  }

  const group = {
    id: createId("group"),
    name: normalizedName,
    memberIds
  };

  writeJson(STORAGE_KEYS.groups, [group, ...groups]);
  return group;
}

export function exportAllData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    members: getMembers(),
    applications: getApplications(),
    groups: getGroups()
  };
}

export function importAllData(data) {
  if (!data || !Array.isArray(data.members) || !Array.isArray(data.applications)) {
    throw new Error("잘못된 백업파일입니다.");
  }

  saveMembers(data.members);
  saveApplications(data.applications);
  writeJson(STORAGE_KEYS.groups, Array.isArray(data.groups) ? data.groups : []);
}

export function isStorageAvailable() {
  try {
    const testKey = "access_auto_storage_test";
    localStorage.setItem(testKey, "ok");
    const isSaved = localStorage.getItem(testKey) === "ok";
    localStorage.removeItem(testKey);
    return isSaved;
  } catch (error) {
    return false;
  }
}
