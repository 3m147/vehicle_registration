const MEMBER_HEADERS = ["소속/회사명", "이름", "연락처", "차량번호"];

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

function getCellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text || "").trim();
  if (typeof value === "object" && "result" in value) return String(value.result || "").trim();
  return String(value).trim();
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"|"$/g, "").replaceAll('""', '"'));
}

function normalizeMemberRow(row, headerMap) {
  return {
    company: getCellText(row[headerMap.company] || ""),
    name: getCellText(row[headerMap.name] || ""),
    phone: getCellText(row[headerMap.phone] || ""),
    vehicle: getCellText(row[headerMap.vehicle] || "")
  };
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

export function createMemberTextTemplate() {
  return createMemberTextData([]);
}

function cleanTextCell(value) {
  return String(value || "").replace(/[\t\r\n]+/g, " ").trim();
}

export function createMemberTextData(members = []) {
  const rows = members.map((member) => {
    return [
      cleanTextCell(member.company),
      cleanTextCell(member.name),
      cleanTextCell(member.phone),
      cleanTextCell(member.vehicle)
    ].join("\t");
  });

  return `${MEMBER_HEADERS.join("\t")}\n${rows.join("\n")}${rows.length ? "\n" : ""}`;
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
  const members = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = row.values.slice(1);
    const member = normalizeMemberRow(values, headerMap);
    if (Object.values(member).some(Boolean)) {
      members.push(member);
    }
  });

  return members;
}

async function parseTextMembers(file) {
  const text = (await file.text()).replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headerRow = parseDelimitedLine(lines[0], delimiter);
  const headerMap = createHeaderMap(headerRow);

  return lines
    .slice(1)
    .map((line) => normalizeMemberRow(parseDelimitedLine(line, delimiter), headerMap))
    .filter((member) => Object.values(member).some(Boolean));
}

export async function parseMemberDataFile(file) {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".xlsx")) {
    return parseExcelMembers(file);
  }

  if (fileName.endsWith(".txt") || fileName.endsWith(".csv") || fileName.endsWith(".tsv")) {
    return parseTextMembers(file);
  }

  throw new Error("xlsx, txt, csv, tsv 파일만 가져올 수 있습니다.");
}
