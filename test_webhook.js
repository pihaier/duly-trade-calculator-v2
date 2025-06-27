// webhook 테스트용 랜덤 데이터 생성 및 전송
const https = require('https');

// Google Apps Script 웹앱 URL
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzWYFhU5rklJsuNTrfZ6g9tKlrTX_3EuOh4IQUHSn2R1_bGcwePPeNaSNCiXKnKlEDDHA/exec';

// 랜덤 데이터 생성 함수들
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomData() {
  const companies = ['삼성전자', 'LG전자', '현대자동차', 'SK하이닉스', '포스코', '네이버', '카카오'];
  const products = ['스마트폰', '노트북', '자동차 부품', '반도체', '화학제품', '의료기기', '전자부품'];
  const purposes = ['품질검증', '안전성 테스트', '성능 평가', '규격 확인', '내구성 검사'];
  const names = ['김철수', '이영희', '박민수', '정수연', '최동현', '한지민', '임태준'];
  const positions = ['품질관리팀장', '구매담당자', '개발팀장', '품질보증담당', '제품기획자'];

  const timestamp = new Date().toISOString();
  const randomCompany = getRandomElement(companies);
  
  return {
    timestamp: timestamp,
    companyName: randomCompany,
    contactPerson: getRandomElement(names),
    position: getRandomElement(positions),
    contactEmail: `${getRandomElement(['test', 'quality', 'manager', 'buyer'])}@${randomCompany.toLowerCase().replace(/[^a-z]/g, '')}.com`,
    contactPhone: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
    productName: getRandomElement(products),
    productDetails: `${getRandomElement(products)} 상세 사양 및 기술 문서`,
    inspectionPurpose: getRandomElement(purposes),
    quantity: Math.floor(Math.random() * 1000) + 1,
    inspectionLocation: getRandomElement(['선전', '상하이', '베이징', '광저우', '항저우']),
    preferredDate: new Date(Date.now() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    urgency: getRandomElement(['일반', '긴급', '매우긴급']),
    additionalRequests: `추가 요청사항: ${getRandomElement(['신속처리 요청', '상세 보고서 필요', '현장 입회 필요', '인증서 발급 요청'])}`,
    files: [] // 파일은 테스트에서 제외
  };
}

// webhook으로 POST 요청 보내기
function sendWebhookRequest(data) {
  const postData = JSON.stringify(data);
  
  const url = new URL(WEBHOOK_URL);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🚀 Webhook 테스트 시작...');
  console.log('📤 전송할 데이터:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n📡 요청 URL:', WEBHOOK_URL);

  const req = https.request(options, (res) => {
    let responseData = '';
    
    console.log(`\n📊 응답 상태: ${res.statusCode}`);
    console.log(`📋 응답 헤더:`, res.headers);

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      console.log('\n✅ 응답 받음:');
      try {
        const parsedResponse = JSON.parse(responseData);
        console.log(JSON.stringify(parsedResponse, null, 2));
        
        if (parsedResponse.success) {
          console.log(`\n🎉 성공! 예약번호: ${parsedResponse.reservationCode}`);
        } else {
          console.log(`\n❌ 실패: ${parsedResponse.message}`);
        }
      } catch (e) {
        console.log('Raw Response:', responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ 요청 오류:', error);
  });

  req.write(postData);
  req.end();
}

// 테스트 실행
console.log('🧪 랜덤 데이터 Webhook 테스트 시작\n');

const testData = generateRandomData();
sendWebhookRequest(testData); 