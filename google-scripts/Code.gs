/**
 * @file Code.gs
 * @description 두리무역 웹 신청서 및 자동 번역을 위한 통합 Google Apps Script
 */

// ================== 설정 ==================
const SPREADSHEET_ID = '1e1klgcfhaFCeSTxukcZTi41a8BoklbH7MlB0fKse53w';
const SHEET_NAME = '설문지 응답 시트1';
const DRIVE_FOLDER_ID = '1gaCcg-Fuio_QCt7cCOrPophlZ1ghrN4Z';
const NOTIFICATION_EMAIL = 'duly@duly.co.kr';
const TARGET_LANGUAGE = 'Chinese';
const GPT_API_URL = 'https://api.openai.com/v1/chat/completions';
// ==========================================

// ==========================================
// 1. WebApp & Data Handling
// ==========================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 예약번호가 없으면 서버에서 생성
    if (!data.reservationNumber) {
      data.reservationNumber = generateSequentialReservationNumber_();
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) throw new Error(`시트를 찾을 수 없습니다: ${SHEET_NAME}`);

    const fileUrls = saveFilesToDrive_(data.files, data.companyName);
    const newRow = formatDataForSheet_(data, fileUrls);
    
    sheet.appendRow(newRow);
    sendNewApplicationEmail_(data, fileUrls);

    return createJsonResponse_({ 
      success: true, 
      message: '신청서가 성공적으로 제출되었습니다.',
      reservationNumber: data.reservationNumber 
    });
  } catch (error) {
    Logger.log(`[doPost Error] ${error.toString()}`);
    return createJsonResponse_({ success: false, message: `오류: ${error.toString()}` });
  }
}

function formatDataForSheet_(data, fileUrls) {
  const now = new Date();
  const koreanTime = Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  
  const rowData = new Array(36).fill(''); // AJ열(36번째)까지 빈 배열 생성
  
  rowData[0] = koreanTime;                                // A: 타임스탬프
  rowData[1] = data.companyName || '';                    // B: 회사명
  // rowData[2] = '';                                     // C: 중국거래시 사용 회사명 (비워둠)
  rowData[3] = data.contactName || '';                    // D: 담당자명
  rowData[4] = data.contactPhone || '';                   // E: 담당자 연락처
  rowData[5] = data.contactEmail || '';                   // F: 담당자 이메일
  rowData[6] = data.serviceTypeKr || '';                  // G: 신청서비스
  rowData[7] = data.serviceType === 'inspection' ? data.productName : ''; // H: 제품명
  rowData[8] = data.serviceType === 'inspection' ? data.quantity : '';    // I: 생산수량
  rowData[9] = data.serviceType === 'inspection' ? data.inspectionTypeKr : ''; // J: 검품 옵션
  rowData[10] = data.factoryName || '';                   // K: 공장명
  rowData[11] = data.factoryContact || '';                // L: 공장 담당자명
  rowData[12] = data.factoryPhone || '';                  // M: 공장 담당자 연락처
  rowData[13] = data.factoryAddress || '';                // N: 공장 주소
  rowData[14] = data.scheduleStatusKr || '';              // O: 공장 협의 여부
  rowData[15] = data.scheduleStatus === 'agreed' ? data.startDate : '';  // P: 시작일
  rowData[16] = data.scheduleStatus === 'agreed' ? data.endDate : '';    // Q: 종료일
  rowData[17] = data.requirements || '';                  // R: 요청사항
  rowData[18] = fileUrls.join('\n');                      // S: 관련 자료 업로드
  // rowData[19] = '';                                    // T: 연락 방식 (비워둠)
  rowData[20] = data.reservationNumber || '';             // U: 예약번호
  // rowData[21] = '';                                    // V: 검품 확정일자
  // rowData[22] = '';                                    // W: 보고서 링크
  // rowData[23] = '';                                    // X: 견적 금액
  // rowData[24] = '';                                    // Y: 결제 상태
  // rowData[25] = '';                                    // Z: 결제일자
  // rowData[26] = '';                                    // AA: 내부 메모
  rowData[27] = data.requirements || '';                  // AB: 고객 추가 사항
  // rowData[28] = '';                                    // AC: 추가 첨부파일
  // rowData[29] = '';                                    // AD: 客户要求 (번역 대상)
  // rowData[30] = '';                                    // AE: 客户附加内容 (번역 대상)
  // rowData[31] = '';                                    // AF: 产品名称 (번역 대상)
  // rowData[32] = '';                                    // AG: 日志
  // rowData[33] = '';                                    // AH: 附件上传
  // rowData[34] = '';                                    // AI: 중국피드백
  rowData[35] = '접수';                                   // AJ: 진행상태

  return rowData;
}


function saveFilesToDrive_(files, companyName) {
  if (!files || files.length === 0) return [];
  const urls = [];
  
  try {
    let folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const date = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
    const subFolderName = `${companyName}_${date}`;
    const subFolder = folder.createFolder(subFolderName);
    
    files.forEach(file => {
      const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
      const driveFile = subFolder.createFile(blob);
      urls.push(driveFile.getUrl());
    });
    
  } catch (error) {
    Logger.log(`[saveFilesToDrive Error] ${error.toString()}`);
  }
  
  return urls;
}

function sendNewApplicationEmail_(data, fileUrls) {
  if (!NOTIFICATION_EMAIL) return;

  const subject = `[웹신청] ${data.companyName} - ${data.serviceTypeKr} (예약번호: ${data.reservationNumber})`;
  const htmlBody = `
    <html><body>
      <h2>새로운 검품 서비스 신청 (웹)</h2>
      <p><b>예약번호:</b> ${data.reservationNumber}</p>
      <p><b>신청 기업:</b> ${data.companyName}</p>
      <p><b>서비스 유형:</b> ${data.serviceTypeKr}</p>
      <p><b>담당자:</b> ${data.contactName} (${data.contactPhone})</p>
      <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}">시트에서 확인하기</a>
    </body></html>
  `;
  GmailApp.sendEmail(NOTIFICATION_EMAIL, subject, '', { htmlBody, name: '두리무역 신청 시스템' });
}

function createJsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return HtmlService.createHtmlOutput(`
    <h1>두리무역 신청서 API</h1>
    <p>✅ 정상 작동 중입니다.</p>
    <p>배포 버전: 2025-01-10</p>
    <p>시트 ID: ${SPREADSHEET_ID}</p>
    <p>현재 시간 (KST): ${Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')}</p>
  `);
}


// ==========================================
// 2. Translation Handler
// ==========================================
function getGptApiKey_() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GPT_API_KEY');
  if (!apiKey) {
    throw new Error('GPT API 키가 설정되지 않았습니다.');
  }
  return apiKey;
}

function translateTextWithGPT_(text, targetLanguage = TARGET_LANGUAGE) {
  if (!text || typeof text !== 'string' || text.trim() === '') return '';
  try {
    const apiKey = getGptApiKey_();
    const payload = {
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: `You are a professional translator. Translate the given Korean text to ${targetLanguage}.` },
        { role: "user", content: text }
      ],
      max_tokens: 1000,
      temperature: 0.2
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      payload: JSON.stringify(payload)
    };
    const response = UrlFetchApp.fetch(GPT_API_URL, options);
    const responseData = JSON.parse(response.getContentText());
    return responseData.choices[0].message.content.trim();
  } catch (error) {
    Logger.log(`[translateTextWithGPT Error] ${error.toString()}`);
    return `번역 오류`;
  }
}

// ==========================================
// 3. Trigger and Menu Handler
// ==========================================
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('⚙️ 맞춤 설정')
      .addItem('GPT API 키 설정', 'setGptApiKey_')
      .addToUi();
}

function setGptApiKey_() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
      'GPT API 키 설정',
      'OpenAI API 키를 입력하세요:',
      ui.ButtonSet.OK_CANCEL);

  const button = result.getSelectedButton();
  const apiKey = result.getResponseText();
  
  if (button == ui.Button.OK && apiKey) {
    PropertiesService.getScriptProperties().setProperty('GPT_API_KEY', apiKey);
    ui.alert('API 키가 성공적으로 저장되었습니다.');
  }
}

function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    
    if (sheet.getName() !== SHEET_NAME || range.getRow() === 1) return;
    if (range.getColumn() === 1 && range.getValue() !== '') {
      translateNewRow_(sheet, range.getRow());
    }
  } catch (error) {
    Logger.log(`[onEdit Error] ${error.toString()}`);
  }
}

function translateNewRow_(sheet, rowIndex) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const translationMap = [
    { sourceHeader: '제품명', targetHeader: '产品名称' },           // H열 → AF열
    { sourceHeader: '요청사항', targetHeader: '客户要求' },          // R열 → AD열
    { sourceHeader: '고객 추가 사항', targetHeader: '客户附加内容' }  // AB열 → AE열
  ];

  translationMap.forEach(map => {
    const sourceCol = headers.indexOf(map.sourceHeader) + 1;
    const targetCol = headers.indexOf(map.targetHeader) + 1;

    if (sourceCol > 0 && targetCol > 0) {
      const sourceText = sheet.getRange(rowIndex, sourceCol).getValue();
      if (sourceText) {
        const translatedText = translateTextWithGPT_(sourceText.toString());
        if (translatedText) {
          sheet.getRange(rowIndex, targetCol).setValue(translatedText);
          Utilities.sleep(500);
        }
      }
    }
  });
}

// ==========================================
// 4. 테스트 함수
// ==========================================
function testWebhook() {
  // 테스트 데이터 생성
  const testData = {
    companyName: '테스트 회사',
    contactName: '김철수',
    contactPhone: '010-1234-5678',
    contactEmail: 'test@example.com',
    serviceType: 'inspection',
    serviceTypeKr: '품질 검품',
    productName: '테스트 제품',
    quantity: '1000개',
    inspectionType: 'standard',
    inspectionTypeKr: '표준 검품 (AQL 4.0)',
    factoryName: '테스트 공장',
    factoryAddress: '중국 광둥성 선전시',
    factoryContact: '왕메이',
    factoryPhone: '+86-123-4567-8900',
    scheduleStatus: 'agreed',
    scheduleStatusKr: '공장과 일정 협의 완료',
    startDate: '2025-01-15',
    endDate: '2025-01-17',
    requirements: '특별 요구사항 테스트',
    files: [
      {
        name: 'test.pdf',
        type: 'application/pdf',
        size: 1024,
        data: 'JVBERi0xLjQKJeLjz9MKNCAwIG9iago=' // 샘플 Base64
      }
    ],
    timestamp: new Date().toISOString()
  };

  // 가짜 이벤트 객체 생성
  const fakeEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  // doPost 함수 호출
  const result = doPost(fakeEvent);
  const response = JSON.parse(result.getContent());
  
  Logger.log('테스트 결과:', response);
  
  // 시트 확인
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const lastRowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  Logger.log('추가된 행 데이터:', lastRowData);
  
  return response;
}

// 웹 앱 URL 확인 함수
function getWebAppUrl() {
  // 이 함수를 실행하면 현재 배포된 웹 앱 URL을 확인할 수 있습니다
  Logger.log('웹 앱 URL을 Google Apps Script 에디터에서 확인하세요:');
  Logger.log('배포 > 배포 관리에서 현재 URL을 확인할 수 있습니다.');
  return '배포 관리에서 URL을 확인하세요';
}

// 예약번호 생성 함수 (순번 기반)
function generateSequentialReservationNumber_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const todayPrefix = `DL${year}${month}${day}`;
  
  // 오늘 날짜로 시작하는 예약번호 찾기
  const lastRow = sheet.getLastRow();
  let maxSequence = 0;
  
  if (lastRow > 1) {
    const reservationNumbers = sheet.getRange(2, 21, lastRow - 1, 1).getValues(); // U열 (21번째)
    
    reservationNumbers.forEach(row => {
      const resNum = row[0];
      if (resNum && resNum.toString().startsWith(todayPrefix)) {
        const sequence = parseInt(resNum.toString().slice(-4));
        if (!isNaN(sequence) && sequence > maxSequence) {
          maxSequence = sequence;
        }
      }
    });
  }
  
  // 다음 순번
  const nextSequence = (maxSequence + 1).toString().padStart(4, '0');
  return `${todayPrefix}${nextSequence}`;
} 