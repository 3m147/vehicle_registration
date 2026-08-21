function setCellValue(worksheet, cellAddress, value) {
  if (cellAddress) {
    worksheet.getCell(cellAddress).value = value || "";
  }
}

function formatDateForExcel(dateText) {
  if (!dateText) {
    return "";
  }

  return dateText.replaceAll("-", ".");
}

function buildVisitPeriod(application) {
  const startDate = formatDateForExcel(application.startDate);
  const endDate = formatDateForExcel(application.endDate);

  if (!startDate || !endDate) {
    return "";
  }

  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
}

function formatDateForFileName(dateText, useLongYear = false) {
  if (!dateText) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return useLongYear ? `${year}${month}${day}` : `${String(year).slice(2)}${month}${day}`;
  }

  const compact = dateText.replaceAll("-", "");
  return useLongYear ? compact : compact.slice(2);
}

export function buildExcelFileName(site, startDate, template, useLongYear = false) {
  const safeSite = site.replace(/[\\/:*?"<>|]/g, "_");
  const dateText = formatDateForFileName(startDate, useLongYear);

  if (template?.includeTemplateNameInFile && template.shortName) {
    return `${safeSite}_${template.shortName}_${dateText}.xlsx`;
  }

  return `${safeSite}_출입신청서_${dateText}.xlsx`;
}

/**
 * 선택된 출입자 정보를 기존 Excel 양식에 입력합니다.
 *
 * 원본 Excel 파일의 디자인이나 스타일은 수정하지 않고
 * 실제 데이터가 들어가는 셀의 값만 변경합니다.
 */
function fillVisitorsToExcel(worksheet, visitors, application, mapping) {
  const visitorMapping = mapping.visitors;

  visitors.forEach((visitor, index) => {
    const row = visitorMapping.startRow + index;

    if (visitorMapping.receptionDateColumn) {
      worksheet.getCell(`${visitorMapping.receptionDateColumn}${row}`).value = formatDateForExcel(application.receivedDate);
    }

    if (visitorMapping.visitDateColumn) {
      worksheet.getCell(`${visitorMapping.visitDateColumn}${row}`).value = formatDateForExcel(application.startDate);
    }

    if (visitorMapping.companyColumn) {
      worksheet.getCell(`${visitorMapping.companyColumn}${row}`).value =
        application.excelCompanyName || visitor.company || "";
    }

    if (visitorMapping.nameColumn) {
      worksheet.getCell(`${visitorMapping.nameColumn}${row}`).value = visitor.name || "";
    }

    if (visitorMapping.phoneColumn) {
      worksheet.getCell(`${visitorMapping.phoneColumn}${row}`).value = visitor.phone || "";
    }

    if (visitorMapping.vehicleColumn) {
      worksheet.getCell(`${visitorMapping.vehicleColumn}${row}`).value = visitor.vehicle || "";
    }

    if (visitorMapping.cameraColumn) {
      worksheet.getCell(`${visitorMapping.cameraColumn}${row}`).value = visitor.camera || "X";
    }

    if (visitorMapping.purposeColumn) {
      worksheet.getCell(`${visitorMapping.purposeColumn}${row}`).value =
        visitor.defaultPurpose || application.purpose || "";
    }
  });
}

/**
 * 선택된 Excel 양식을 기준으로 출입신청서를 생성합니다.
 *
 * template 객체에 저장된 셀 Mapping을 사용하기 때문에
 * Excel 양식이 변경되어도 이 함수 자체를 수정할 필요가 없습니다.
 */
export async function createExcelFromTemplate(templateArrayBuffer, template, application, visitors) {
  if (!window.ExcelJS) {
    throw new Error("ExcelJS 라이브러리를 불러오지 못했습니다.");
  }

  const maxVisitors = template.maxVisitors || template.mapping?.visitors?.maxRows || 15;
  if (visitors.length > maxVisitors) {
    throw new Error(`${template.name}에는 최대 ${maxVisitors}명까지 입력할 수 있습니다.`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateArrayBuffer);

  const worksheet = template.sheetName ? workbook.getWorksheet(template.sheetName) || workbook.worksheets[0] : workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel 템플릿에서 워크시트를 찾지 못했습니다.");
  }

  const mapping = template.mapping;

  setCellValue(worksheet, mapping.site, application.site);
  setCellValue(worksheet, mapping.receivedDate, formatDateForExcel(application.receivedDate));
  setCellValue(worksheet, mapping.startDate, formatDateForExcel(application.startDate));
  setCellValue(worksheet, mapping.endDate, formatDateForExcel(application.endDate));
  setCellValue(worksheet, mapping.visitPeriod, buildVisitPeriod(application));
  setCellValue(worksheet, mapping.purpose, application.purpose);
  setCellValue(worksheet, mapping.department, application.department);
  setCellValue(worksheet, mapping.manager, application.manager);
  setCellValue(worksheet, mapping.note, application.note);
  fillVisitorsToExcel(worksheet, visitors, application, mapping);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}
