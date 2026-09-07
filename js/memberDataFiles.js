const MEMBER_HEADERS = ["소속/회사명", "이름", "연락처", "차량번호"];
const REQUIRED_FIELDS = ["company", "name", "phone", "vehicle"];

const HEADER_ALIASES = {
  company: ["소속/회사명", "소속", "회사명", "회사", "company"],
  name: ["이름", "성명", "name"],
  phone: ["연락처", "전화번호", "휴대폰", "핸드폰", "phone"],
  vehicle: ["차량번호", "차량", "vehicle"]
};

function normalizeHeader(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function createHeaderMap(headers) {
  const normalizedHeaders = headers.map(normalizeHeader);

  return Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([fieldName, aliases]) => {
      const index = aliases.findIndex((alias) => normalizedHeaders.includes(normalizeHeader(alias)));
      const headerIndex = index >= 0 ? normalizedHeaders.indexOf(normalizeHeader(aliases[index])) : -1;
      return [fieldName, headerIndex];
    })
  );
}

function getMissingRequiredHeaders(headerMap) {
  return REQUIRED_FIELDS.filter((fieldName) => headerMap[fieldName] < 0);
}

function getCellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text || "").trim();
  if (typeof value === "object" && "result" in value) return String(value.result || "").trim();
  return String(value).trim();
}

function normalizeMemberRow(row, headerMap) {
  return {
    company: getCellText(row[headerMap.company] || ""),
    name: getCellText(row[headerMap.name] || ""),
    phone: getCellText(row[headerMap.phone] || ""),
    vehicle: getCellText(row[headerMap.vehicle] || "")
  };
}

function validateMember(member) {
  const errors = [];

  if (!member.company) {
    errors.push("소속/회사명 없음");
  }

  if (!member.name) {
    errors.push("이름 없음");
  }

  if (member.phone && !/^010-?\d{4}-?\d{4}$/.test(member.phone)) {
    errors.push("연락처 형식 오류");
  }

  return errors;
}

export async function createMemberExcelTemplateBlob() {
  return createMemberExcelDataBlob([]);
}

export async function createMemberExcelDataBlob(members = []) {
  if (!window.ExcelJS) {
    throw new Error("ExcelJS 라이브러리를 불러오지 못했습니다.");
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("출입자 등록");

  worksheet.addRow(MEMBER_HEADERS);
  members.forEach((member) => {
    worksheet.addRow([member.company || "", member.name || "", member.phone || "", member.vehicle || ""]);
  });

  worksheet.columns = [
    { key: "company", width: 24 },
    { key: "name", width: 18 },
    { key: "phone", width: 18 },
    { key: "vehicle", width: 18 }
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = "A1:D1";

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

async function parseExcelMembers(file) {
  if (!window.ExcelJS) {
    throw new Error("ExcelJS 라이브러리를 불러오지 못했습니다.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("엑셀 파일에서 출입자 시트를 찾지 못했습니다.");
  }

  const headerRow = worksheet.getRow(1).values.slice(1).map(getCellText);
  const headerMap = createHeaderMap(headerRow);
  const missingHeaders = getMissingRequiredHeaders(headerMap);

  if (missingHeaders.length) {
    throw new Error("출입자 Excel 양식의 필수 헤더가 없습니다. Excel 양식을 다시 내려받아 사용해주세요.");
  }

  const members = [];
  const errors = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = row.values.slice(1);
    const member = normalizeMemberRow(values, headerMap);
    if (!Object.values(member).some(Boolean)) return;

    const rowErrors = validateMember(member);
    if (rowErrors.length) {
      errors.push({
        rowNumber,
        message: rowErrors.join(", ")
      });
    } else {
      members.push({
        ...member,
        rowNumber
      });
    }
  });

  return { members, errors };
}

export async function parseMemberDataFile(file) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".xlsx")) {
    return parseExcelMembers(file);
  }

  throw new Error("Excel xlsx 파일만 가져올 수 있습니다.");
}
