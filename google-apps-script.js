// GPT API 설정 (안전하게 스크립트 속성에서 로드)
function getGptApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GPT_API_KEY');
  if (!apiKey) {
    throw new Error('GPT API 키가 설정되지 않았습니다. 프로젝트 설정 > 스크립트 속성에서 GPT_API_KEY를 추가해주세요.');
  }
  return apiKey;
}

const GPT_API_URL = 'https://api.openai.com/v1/chat/completions';

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${getGptApiKey()}`, // 안전하게 키 로드
    'Content-Type': 'application/json'
  },
}; 