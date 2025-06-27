/**
 * 중국 출장검품 서비스 신청서 - Google Apps Script
 * 
 * 설치 방법:
 * 1. Google Sheets에서 확장 프로그램 > Apps Script 선택
 * 2. 이 코드를 복사하여 붙여넣기
 * 3. 배포 > 새 배포 > 웹앱으로 배포
 * 4. 실행 사용자: 나 / 액세스 권한: 모든 사용자
 * 5. 배포 후 생성된 URL을 application.js의 GOOGLE_APPS_SCRIPT_URL에 입력
 */

// 스프레드시트 ID (실제 스프레드시트 ID로 변경 필요)
const SPREADSHEET_ID = '1e1klgcfhaFCeSTxukcZTi41a8BoklbH7MlB0fKse53w';

// 시트 이름
const SHEET_NAME = '신청내역';

// 파일 저장용 Google Drive 폴더 ID (선택사항)
const DRIVE_FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // 파일을 저장할 폴더 ID

// 이메일 알림 설정
const NOTIFICATION_EMAIL = 'duly@duly.co.kr'; // 알림을 받을 이메일
const SEND_EMAIL_NOTIFICATION = true; // 이메일 알림 사용 여부

/**
 * POST 요청 처리
 */
function doPost(e) {
  try {
    // 요청 데이터 파싱
    const data = JSON.parse(e.postData.contents);
    
    // 스프레드시트 열기
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    
    // 헤더가 없으면 생성
    if (sheet.getLastRow() === 0) {
      createHeaders(sheet);
    }
    
    // 파일 처리 (있는 경우)
    let fileUrls = [];
    if (data.files && data.files.length > 0) {
      fileUrls = saveFiles(data.files, data.companyName);
    }
    
    // 데이터 행 추가
    const row = createDataRow(data, fileUrls);
    sheet.appendRow(row);
    
    // 이메일 알림 발송
    if (SEND_EMAIL_NOTIFICATION) {
      sendEmailNotification(data);
    }
    
    // 성공 응답
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '신청서가 성공적으로 제출되었습니다.'
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
 * GET 요청 처리 (테스트용)
 */
function doGet(e) {
  return ContentService
    .createTextOutput('중국 출장검품 서비스 신청서 API가 정상 작동 중입니다.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * 헤더 생성
 */
function createHeaders(sheet) {
  const headers = [
    '제출일시',
    '기업명',
    '중국거래시 사용기업명',
    '담당자 성명',
    '담당자 연락처',
    '담당자 이메일',
    '서비스 유형',
    '제품명',
    '생산 수량',
    '검품 방식',
    '공장명',
    '공장 담당자명',
    '공장 담당자 연락처',
    '공장 주소',
    '검품 일정 협의 상태',
    '검품 시작일',
    '검품 종료일',
    '특별 요청사항',
    '첨부파일',
    '처리상태',
    '담당자',
    '비고'
  ];
  
  sheet.appendRow(headers);
  
  // 헤더 스타일 설정
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4a5568');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  
  // 열 너비 자동 조정
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 데이터 행 생성
 */
function createDataRow(data, fileUrls) {
  const kstTime = new Date(data.timestamp);
  kstTime.setHours(kstTime.getHours() + 9); // KST 변환
  
  return [
    Utilities.formatDate(kstTime, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
    data.companyName || '',
    data.companyNameCn || '',
    data.contactName || '',
    data.contactPhone || '',
    data.contactEmail || '',
    data.serviceTypeKr || '',
    data.productName || '',
    data.quantity || '',
    data.inspectionTypeKr || '',
    data.factoryName || '',
    data.factoryContact || '',
    data.factoryPhone || '',
    data.factoryAddress || '',
    data.scheduleStatusKr || '',
    data.startDate || '',
    data.endDate || '',
    data.requirements || '',
    fileUrls.join('\n'),
    '접수', // 초기 상태
    '', // 담당자 (추후 지정)
    '' // 비고
  ];
}

/**
 * 파일 저장
 */
function saveFiles(files, companyName) {
  const urls = [];
  
  try {
    // 폴더 확인/생성
    let folder;
    if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== 'YOUR_FOLDER_ID_HERE') {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    } else {
      // 루트에 '검품신청_첨부파일' 폴더 생성
      const folders = DriveApp.getFoldersByName('검품신청_첨부파일');
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder('검품신청_첨부파일');
      }
    }
    
    // 회사별 하위 폴더 생성
    const date = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd');
    const subFolderName = `${companyName}_${date}`;
    const subFolder = folder.createFolder(subFolderName);
    
    // 파일 저장
    files.forEach((file, index) => {
      const blob = Utilities.newBlob(
        Utilities.base64Decode(file.data),
        file.type,
        file.name
      );
      
      const driveFile = subFolder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urls.push(driveFile.getUrl());
    });
    
  } catch (error) {
    console.error('파일 저장 오류:', error);
  }
  
  return urls;
}

/**
 * 이메일 알림 발송
 */
function sendEmailNotification(data) {
  const subject = `[검품신청] ${data.companyName} - ${data.serviceTypeKr}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a5568; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
        새로운 검품 서비스 신청
      </h2>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2d3748; margin-top: 0;">신청 기업 정보</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #718096; width: 150px;">기업명:</td>
            <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${data.companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">담당자:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">연락처:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.contactPhone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">이메일:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.contactEmail}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2d3748; margin-top: 0;">서비스 정보</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #718096; width: 150px;">서비스 유형:</td>
            <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${data.serviceTypeKr}</td>
          </tr>
          ${data.productName ? `
          <tr>
            <td style="padding: 8px 0; color: #718096;">제품명:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.productName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">수량:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.quantity}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #718096;">공장명:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.factoryName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">일정 협의:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.scheduleStatusKr}</td>
          </tr>
          ${data.startDate ? `
          <tr>
            <td style="padding: 8px 0; color: #718096;">검품 일정:</td>
            <td style="padding: 8px 0; color: #2d3748;">${data.startDate} ~ ${data.endDate}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${data.requirements ? `
      <div style="background-color: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fc8181;">
        <h3 style="color: #2d3748; margin-top: 0;">특별 요청사항</h3>
        <p style="color: #2d3748; white-space: pre-wrap;">${data.requirements}</p>
      </div>
      ` : ''}
      
      <div style="margin-top: 30px; padding: 20px; background-color: #e6fffa; border-radius: 8px; text-align: center;">
        <p style="color: #234e52; margin: 0;">
          <a href="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}" 
             style="background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            스프레드시트에서 확인하기
          </a>
        </p>
      </div>
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px;">
        <p>이 이메일은 자동으로 발송되었습니다.</p>
        <p>제출 시간: ${Utilities.formatDate(new Date(data.timestamp), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss')}</p>
      </div>
    </div>
  `;
  
  GmailApp.sendEmail(
    NOTIFICATION_EMAIL,
    subject,
    '새로운 검품 서비스 신청이 접수되었습니다. HTML을 지원하는 이메일 클라이언트에서 확인해주세요.',
    {
      htmlBody: htmlBody,
      name: '두리무역 검품신청 시스템'
    }
  );
}

/**
 * 테스트 함수
 */
function test() {
  const testData = {
    timestamp: new Date().toISOString(),
    companyName: '테스트 기업',
    companyNameCn: '测试公司',
    contactName: '홍길동',
    contactPhone: '010-1234-5678',
    contactEmail: 'test@test.com',
    serviceType: 'inspection',
    serviceTypeKr: '품질 검품',
    productName: '전자제품',
    quantity: '1000개',
    inspectionType: 'standard',
    inspectionTypeKr: '표준 검품 (AQL 4.0)',
    factoryName: 'Test Factory',
    factoryContact: '王经理',
    factoryPhone: '+86-138-1234-5678',
    factoryAddress: '深圳市龙岗区...',
    scheduleStatus: 'agreed',
    scheduleStatusKr: '공장과 일정 협의 완료',
    startDate: '2024-01-15',
    endDate: '2024-01-16',
    requirements: '특별한 요청사항 없음',
    files: []
  };
  
  const result = doPost({
    postData: {
      contents: JSON.stringify(testData)
    }
  });
  
  console.log(result.getContent());
} 