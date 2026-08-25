import { updateMember } from "./storage.js";

export function normalizePhone(phone) {
  let digits = phone.replace(/[^\d]/g, "");

  if (digits.length === 8) {
    digits = `010${digits}`;
  }

  if (digits.length === 10 && digits.startsWith("10")) {
    digits = `0${digits}`;
  }

  return formatPhoneForDisplay(digits);
}

export function formatPhoneForDisplay(phone) {
  const digits = phone.replace(/[^\d]/g, "").slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function maskPhone(phone) {
  if (!phone) {
    return "";
  }

  const parts = phone.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }

  return phone.replace(/(\d{3})\d+(\d{4})/, "$1****$2");
}

export function maskVehicle(vehicle) {
  if (!vehicle) {
    return "";
  }

  return vehicle.length > 4 ? `${vehicle.slice(0, 3)}****` : vehicle;
}

export function searchMembers(members, keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const sortedMembers = [...members].sort((a, b) => {
    if (a.favorite !== b.favorite) {
      return a.favorite ? -1 : 1;
    }

    return (b.lastUsedAt || "").localeCompare(a.lastUsedAt || "");
  });

  if (!normalizedKeyword) {
    return sortedMembers;
  }

  return sortedMembers.filter((member) => {
    const searchableText = [
      member.company,
      member.name,
      member.phone,
      member.vehicle
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedKeyword);
  });
}

export function toggleFavorite(memberId, currentValue) {
  return updateMember(memberId, { favorite: !currentValue });
}
