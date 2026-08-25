/**
 * CFS 출입신청 Excel 양식 정보입니다.
 *
 * 사용자는 양식을 직접 고르지 않습니다.
 * 출입 시작일과 종료일이 같으면 1일 방문 양식,
 * 다르면 2일 이상 방문 양식을 자동으로 사용합니다.
 */
export const EXCEL_TEMPLATES = {
  oneDay: {
    id: "oneDay",
    name: "1일 방문",
    shortName: "1일방문",
    file: "./template/cfs_one_day.xlsx",
    sheetName: "단체 출입 신청서",
    maxVisitors: 15,
    fixedCompanyName: "한성엔지니어링",
    includeTemplateNameInFile: true,
    mapping: {
      site: "D4",
      receivedDate: "D5",
      startDate: "",
      endDate: "",
      visitPeriod: "",
      purpose: "",
      department: "D6",
      manager: "",
      note: "B29",
      cameraReason: "F29",
      visitors: {
        startRow: 13,
        maxRows: 15,
        visitDateColumn: "C",
        receptionDateColumn: "",
        companyColumn: "D",
        nameColumn: "E",
        phoneColumn: "F",
        vehicleColumn: "G",
        cameraColumn: "H",
        purposeColumn: "I"
      }
    }
  },
  multiDay: {
    id: "multiDay",
    name: "2일 이상 방문",
    shortName: "장기방문",
    file: "./template/cfs_multi_day.xlsx",
    sheetName: "장기 출입 신청서",
    maxVisitors: 15,
    fixedCompanyName: "한성엔지니어링",
    includeTemplateNameInFile: true,
    mapping: {
      site: "D4",
      receivedDate: "",
      startDate: "",
      endDate: "",
      visitPeriod: "D5",
      purpose: "",
      department: "D6",
      manager: "",
      note: "B30",
      cameraReason: "F30",
      visitors: {
        startRow: 14,
        maxRows: 15,
        visitDateColumn: "",
        receptionDateColumn: "C",
        companyColumn: "D",
        nameColumn: "E",
        phoneColumn: "F",
        vehicleColumn: "G",
        cameraColumn: "H",
        purposeColumn: "I"
      }
    }
  }
};

export function getTemplateByVisitDates(startDate, endDate) {
  if (startDate && endDate && startDate !== endDate) {
    return EXCEL_TEMPLATES.multiDay;
  }

  return EXCEL_TEMPLATES.oneDay;
}
