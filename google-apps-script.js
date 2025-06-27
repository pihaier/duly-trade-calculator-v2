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

function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('맞춤 메뉴')
      .addItem('GPT API 키 설정', 'setGptApiKey')
      .addToUi();
}

function setGptApiKey() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt(
      'GPT API 키 설정',
      'OpenAI API 키를 입력하세요:',
      ui.ButtonSet.OK_CANCEL);

  const button = result.getSelectedButton();
  const text = result.getResponseText();
  
  if (button == ui.Button.OK) {
    PropertiesService.getScriptProperties().setProperty('GPT_API_KEY', text);
    ui.alert('API 키가 성공적으로 저장되었습니다.');
  }
} 