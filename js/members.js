import { updateMember } from "./storage.js";

export function normalizePhone(phone) {
  return phone.replace(/[^\d]/g, "").replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
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
      member.vehicle,
      member.defaultPurpose
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedKeyword);
  });
}

export function toggleFavorite(memberId, currentValue) {
  return updateMember(memberId, { favorite: !currentValue });
}

