# 출입신청 자동화

기존 Excel 출입신청서 양식을 템플릿으로 읽어, 지정된 셀의 값만 채운 뒤 새 `.xlsx` 파일을 생성하는 서버 없는 웹 프로그램입니다. 원본 Excel 파일은 수정하거나 덮어쓰지 않습니다.

## 현재 사용 양식

양식은 두 개만 사용합니다.

```text
template/cfs_one_day.xlsx
template/cfs_multi_day.xlsx
```

출입 시작일과 종료일이 같으면 `1일 방문` 양식이 자동 선택됩니다. 날짜가 다르면 `2일 이상 방문` 양식이 자동 선택됩니다.

## 폴더 구조

```text
index.html
css/style.css
js/app.js
js/members.js
js/sites.js
js/storage.js
js/templates.js
js/excel.js
template/cfs_one_day.xlsx
template/cfs_multi_day.xlsx
README.md
```

## 실행 방법

등록된 Excel 템플릿 자동 로드는 로컬 서버에서 실행하는 것이 가장 안정적입니다.

```bash
python3 -m http.server 8081
```

그 다음 브라우저에서 `http://localhost:8081` 또는 `http://[::1]:8081`로 접속하세요.

## Excel 입력 규칙

화면에서는 회사 브랜딩을 표시하지 않습니다. 사용자가 입력한 출입자 소속/회사명은 개인 브라우저의 localStorage에 저장되어 검색과 재사용에만 쓰입니다.

Excel 파일의 출입자 `소속` 칸에는 양식 요구에 맞춰 항상 `한성엔지니어링`이 입력됩니다.

## Excel 셀 Mapping 수정 방법

실제 양식의 입력 셀 위치는 [js/templates.js](/Users/kkmm99jj/Desktop/coding/car/js/templates.js)의 `EXCEL_TEMPLATES`에서 관리합니다.

## 출입자 데이터 저장 위치

출입자, 최근 신청, 출입자 그룹은 서버로 전송되지 않고 현재 브라우저의 `localStorage`에 저장됩니다.

저장 키:

```text
access_auto_members
access_auto_applications
access_auto_groups
```

프로그램 시작 시 localStorage 저장 가능 여부를 간단히 확인합니다. 브라우저 설정이나 시크릿 모드 때문에 저장이 제한되면 화면에 안내 메시지가 표시됩니다.

## 주의사항

전화번호와 차량번호는 개인정보입니다. 목록에서는 일부 마스킹하지만 Excel 생성에는 원본 전체 값이 사용됩니다. 공용 PC에서는 사용 후 브라우저 데이터 관리에 주의하세요.

ExcelJS는 CDN으로 불러옵니다. 인터넷이 차단된 내부망에서 사용해야 한다면 `exceljs.min.js` 파일을 내부에 내려받아 로컬 경로로 연결하세요.

