/**
 * 중국 출장검품 서비스 신청서 - Google Apps Script
 * 기존 시트에 데이터 추가 + 예약번호 생성 + 자동 번역 트리거
 */

// 스프레드시트 ID (이미 확인된 ID)
const SPREADSHEET_ID = '1e1klgcfhaFCeSTxukcZTi41a8BoklbH7MlB0fKse53w';

// 기존 시트 이름 사용 - 자동 번역 시스템과 연동
const SHEET_NAME = '설문지 응답 시트1'; // 기존 Google Forms 시트 사용

// 예약번호 생성 열 (기존 시스템과 동일하게)
const RESERVATION_CODE_COL = 22; // V열 (22번째 열)

// 파일 저장용 Google Drive 폴더 ID (선택사항)
const DRIVE_FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // 파일을 저장할 폴더 ID

// 이메일 알림 설정
const NOTIFICATION_EMAIL = 'duly@duly.co.kr'; // 알림을 받을 이메일
const SEND_EMAIL_NOTIFICATION = true; // 이메일 알림 사용 여부
const EMAIL_SENDER_NAME = "두리무역"; // 이메일 발신자 이름
const CONTACT_INFO = "문의: 031-699-8781 / duly@duly.co.kr"; // 문의 정보

/**
 * GET 요청 처리 - CORS 문제 해결 및 테스트
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'Google Apps Script가 정상적으로 작동 중입니다.'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST 요청 처리 - 웹 신청서 데이터 처리
 */
function doPost(e) {
  try {
    console.log('POST 요청 받음:', e.postData.contents);
    
    // 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);
    console.log('파싱된 데이터:', data);
    
    // 스프레드시트 열기
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 기존 시트 가져오기
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('시트를 찾을 수 없습니다: ' + SHEET_NAME);
    }
    
    // 1. 예약번호 생성
    const reservationCode = generateReservationCode(sheet);
    console.log('생성된 예약번호:', reservationCode);
    
    // 2. 파일 처리 (있는 경우)
    let fileUrls = [];
    if (data.files && data.files.length > 0) {
      fileUrls = saveFiles(data.files, data.companyName);
    }
    
    // 3. 데이터 행 추가 (기존 시트 구조에 맞춰서)
    const row = createDataRowForExistingSheet(data, fileUrls, reservationCode);
    const newRowIndex = sheet.getLastRow() + 1;
    sheet.appendRow(row);
    console.log('데이터 행 추가 완료, 행 번호:', newRowIndex);
    
    // 4. 이메일 알림 발송
    if (SEND_EMAIL_NOTIFICATION && data.contactEmail) {
      sendEmailNotification(data, reservationCode);
    }
    
    // 5. 자동 번역 트리거 (기존 시스템 호출)
    try {
      if (typeof translateSingleRowForNewInput === 'function') {
        console.log('자동 번역 시작:', newRowIndex);
        translateSingleRowForNewInput(sheet, newRowIndex);
        console.log('자동 번역 완료');
      } else {
        console.log('번역 함수를 찾을 수 없음 - 수동으로 번역해야 함');
      }
    } catch (translationError) {
      console.error('번역 중 오류:', translationError);
      // 번역 실패해도 데이터 저장은 성공으로 처리
    }
    
    // 성공 응답
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '신청서가 성공적으로 제출되었습니다.',
        reservationCode: reservationCode
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // 오류 응답
    console.error('오류 발생:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: '오류가 발생했습니다: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 예약번호 생성 (기존 시스템과 동일한 로직)
 */
function generateReservationCode(sheet) {
  const timestamp = new Date();
  const ymd = Utilities.formatDate(timestamp, "GMT+9", "yyyyMMdd");
  
  // 기존 예약번호들 확인
  const allReservationCodes = sheet.getRange(1, RESERVATION_CODE_COL, sheet.getLastRow()).getValues();
  const todayCount = allReservationCodes.filter(id => id[0] && String(id[0]).startsWith(`DULY-${ymd}`)).length + 1;
  
  // 랜덤 부분 생성
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  // 예약번호 조합
  const reservationCode = `DULY-${ymd}-${randomPart}-${todayCount}`;
  
  return reservationCode;
}

/**
 * 기존 시트 구조에 맞춘 데이터 행 생성 (예약번호 포함)
 */
function createDataRowForExistingSheet(data, fileUrls, reservationCode) {
  const kstTime = new Date(data.timestamp || new Date());
  
  // 기존 Google Forms 구조에 맞춰 데이터 배열 생성
  // 실제 시트의 열 순서에 맞게 조정 필요
  const row = [];
  
  // A열부터 순서대로 데이터 입력
  row[0] = Utilities.formatDate(kstTime, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'); // A열: 타임스탬프
  row[1] = data.companyName || '';                    // B열: 기업명
  row[2] = data.companyNameCn || '';                  // C열: 중국거래시 사용기업명
  row[3] = data.contactName || '';                    // D열: 담당자 성명
  row[4] = data.contactPhone || '';                   // E열: 담당자 연락처
  row[5] = data.contactEmail || '';                   // F열: 담당자 이메일
  row[6] = data.serviceTypeKr || '';                  // G열: 서비스 유형
  row[7] = data.productName || '';                    // H열: 제품명
  row[8] = data.quantity || '';                       // I열: 생산 수량
  row[9] = data.inspectionTypeKr || '';               // J열: 검품 방식
  row[10] = data.factoryName || '';                   // K열: 공장명
  row[11] = data.factoryContact || '';                // L열: 공장 담당자명
  row[12] = data.factoryPhone || '';                  // M열: 공장 담당자 연락처
  row[13] = data.factoryAddress || '';                // N열: 공장 주소
  row[14] = data.scheduleStatusKr || '';              // O열: 검품 일정 협의 상태
  row[15] = data.startDate || '';                     // P열: 검품 시작일
  row[16] = data.endDate || '';                       // Q열: 검품 종료일
  row[17] = data.requirements || '';                  // R열: 특별 요청사항
  
  // 빈 열들 (S, T, U열)
  row[18] = '';
  row[19] = '';
  row[20] = '';
  
  // V열: 예약번호 (22번째 열, 인덱스 21)
  row[21] = reservationCode;
  
  // 나머지 열들은 빈 값으로 초기화 (번역 결과가 들어갈 열들)
  for (let i = 22; i < 40; i++) {
    row[i] = '';
  }
  
  // 파일 URL이 있으면 적절한 열에 추가
  if (fileUrls.length > 0) {
    row[35] = fileUrls.join(', '); // 파일 로그 열에 추가
  }
  
  return row;
}

/**
 * 파일 저장 처리 (Google Drive)
 */
function saveFiles(files, companyName) {
  const fileUrls = [];
  
  try {
    // 폴더가 지정되어 있으면 해당 폴더에, 아니면 루트에 저장
    const folder = DRIVE_FOLDER_ID !== 'YOUR_FOLDER_ID_HERE' 
      ? DriveApp.getFolderById(DRIVE_FOLDER_ID)
      : DriveApp.getRootFolder();
    
    files.forEach((file, index) => {
      if (file.data && file.name) {
        const blob = Utilities.newBlob(
          Utilities.base64Decode(file.data.split(',')[1]), 
          file.type, 
          `${companyName}_${Date.now()}_${index}_${file.name}`
        );
        const driveFile = folder.createFile(blob);
        fileUrls.push(driveFile.getUrl());
      }
    });
  } catch (error) {
    console.error('파일 저장 중 오류:', error);
  }
  
  return fileUrls;
}

/**
 * 이메일 알림 발송
 */
function sendEmailNotification(data, reservationCode) {
  try {
    const subject = `[${EMAIL_SENDER_NAME}] ${data.companyName}님 검품 예약 접수 완료`;
    const body = `안녕하세요, ${data.companyName}님.

검품 예약이 정상 접수되었습니다.

📌 예약번호: ${reservationCode}
📦 신청 서비스: ${data.serviceTypeKr}
🏭 공장명: ${data.factoryName}
📅 협의 상태: ${data.scheduleStatusKr}

검품 일정 확정 후 다시 안내드리겠습니다.

${CONTACT_INFO}

감사합니다.
- ${EMAIL_SENDER_NAME}`;

    GmailApp.sendEmail(data.contactEmail, subject, body);
    console.log('이메일 발송 완료:', data.contactEmail);
    
    // 관리자에게도 알림
    const adminSubject = `[${EMAIL_SENDER_NAME}] 새 검품 신청 접수 - ${data.companyName}`;
    const adminBody = `새로운 검품 신청이 접수되었습니다.

예약번호: ${reservationCode}
기업명: ${data.companyName}
담당자: ${data.contactName}
연락처: ${data.contactPhone}
이메일: ${data.contactEmail}
서비스: ${data.serviceTypeKr}
제품명: ${data.productName}
공장명: ${data.factoryName}

자세한 내용은 Google Sheets에서 확인하세요.`;

    GmailApp.sendEmail(NOTIFICATION_EMAIL, adminSubject, adminBody);
    console.log('관리자 알림 발송 완료');
    
  } catch (error) {
    console.error('이메일 발송 중 오류:', error);
  }
}

/**
 * 랜덤 테스트 데이터 생성 및 삽입
 */
function insertRandomTestData() {
  try {
    const companies = ['삼성전자', 'LG전자', '현대자동차', 'SK하이닉스', '네이버'];
    const companiesCn = ['三星电子', 'LG电子', '现代汽车', 'SK海力士', '网络'];
    const names = ['김철수', '이영희', '박민수', '최지영', '정현우'];
    const products = ['스마트폰', '노트북', '자동차부품', '반도체', '가전제품'];
    const factories = ['深圳ABC电子有限公司', '广州XYZ制造', '东莞DEF工厂', '苏州GHI科技', '上海JKL实业'];
    const addresses = ['深圳市南山区科技园', '广州市天河区工业园', '东莞市长安镇', '苏州工业园区', '上海浦东新区'];
    
    const randomIndex = Math.floor(Math.random() * companies.length);
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    
    const testData = {
      timestamp: new Date().toISOString(),
      companyName: companies[randomIndex],
      companyNameCn: companiesCn[randomIndex],
      contactName: names[randomIndex],
      contactPhone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      contactEmail: `test${randomNum}@company.com`,
      serviceTypeKr: '품질 검품',
      productName: products[randomIndex],
      quantity: `${randomNum}개`,
      inspectionTypeKr: '표준 검품 (AQL 4.0)',
      factoryName: factories[randomIndex],
      factoryContact: '王经理',
      factoryPhone: `+86-138-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
      factoryAddress: addresses[randomIndex],
      scheduleStatusKr: '두리무역에서 협의 진행',
      startDate: '',
      endDate: '',
      requirements: `테스트 요청사항 ${randomNum}`
    };
    
    // doPost 함수 호출하여 테스트
    const result = doPost({
      postData: {
        contents: JSON.stringify(testData)
      }
    });
    
    console.log('랜덤 테스트 데이터 삽입 결과:', result.getContent());
    return result.getContent();
    
  } catch (error) {
    console.error('오류 발생:', error);
    return '오류: ' + error.toString();
  }
}

/**
 * 기존 테스트 함수
 */
function testWebApplication() {
  const testData = {
    timestamp: new Date().toISOString(),
    companyName: '테스트 기업',
    companyNameCn: '测试公司',
    contactName: '홍길동',
    contactPhone: '010-1234-5678',
    contactEmail: 'test@test.com',
    serviceTypeKr: '품질 검품',
    productName: '전자제품',
    quantity: '1000개',
    inspectionTypeKr: '표준 검품 (AQL 4.0)',
    factoryName: 'Test Factory',
    factoryContact: '王经理',
    factoryPhone: '+86-138-1234-5678',
    factoryAddress: '深圳市龙岗区...',
    scheduleStatusKr: '공장과 일정 협의 완료',
    startDate: '2024-01-15',
    endDate: '2024-01-16',
    requirements: '특별한 요청사항 없음'
  };
  
  const result = doPost({
    postData: {
      contents: JSON.stringify(testData)
    }
  });
  
  console.log(result.getContent());
} 