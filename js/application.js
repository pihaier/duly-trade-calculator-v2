// 중국 출장검품 서비스 신청서 JavaScript

// Google Apps Script URL (배포 후 실제 URL로 교체 필요)
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQIkak1ZssnHU3FuC9vWnBAgVXzGiEkV3kZNQ_5-gfmMceRFZ6YAOzIk-wjfySmLiy6A/exec';

// 전역 변수
let selectedFiles = [];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

// 예약번호 생성 함수 (중복 방지 버전)
function generateReservationNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // 시간 정보 추가 (시분초)
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    // 추가 랜덤 번호 (2자리)
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    
    // 형식: DL + 연월일 + 시분초 + 랜덤2자리
    return `DL${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    setupEventListeners();
    loadSavedData();
    if (window.lucide) {
        lucide.createIcons();
    }
});

// 폼 초기화
function initializeForm() {
    // 날짜 입력 최소값 설정 (오늘로부터 3일 후)
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 3);
    const minDateStr = minDate.toISOString().split('T')[0];
    
    const startDateInput = document.querySelector('input[name="startDate"]');
    const endDateInput = document.querySelector('input[name="endDate"]');
    
    if (startDateInput) {
        startDateInput.min = minDateStr;
        startDateInput.addEventListener('change', function() {
            endDateInput.min = this.value;
        });
    }
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 서비스 유형 선택
    const serviceTypeInputs = document.querySelectorAll('input[name="serviceType"]');
    serviceTypeInputs.forEach(input => {
        input.addEventListener('change', handleServiceTypeChange);
    });
    
    // 일정 협의 상태 선택
    const scheduleStatusInputs = document.querySelectorAll('input[name="scheduleStatus"]');
    scheduleStatusInputs.forEach(input => {
        input.addEventListener('change', handleScheduleStatusChange);
    });
    
    // 파일 업로드
    setupFileUpload();
    
    // 폼 제출
    const form = document.getElementById('applicationForm');
    form.addEventListener('submit', handleFormSubmit);
    
    // 자동 저장 (입력 시마다)
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', saveFormData);
        input.addEventListener('change', saveFormData);
    });
}

// 서비스 유형 변경 처리
function handleServiceTypeChange(e) {
    const serviceType = e.target.value;
    const inspectionDetails = document.getElementById('inspectionDetails');
    const factoryStepNumber = document.getElementById('factoryStepNumber');
    const scheduleStepNumber = document.getElementById('scheduleStepNumber');
    const additionalStepNumber = document.getElementById('additionalStepNumber');
    
    if (serviceType === 'inspection') {
        // 검품 선택 시 검품 상세 정보 표시
        inspectionDetails.classList.remove('hidden');
        factoryStepNumber.textContent = '4';
        scheduleStepNumber.textContent = '5';
        additionalStepNumber.textContent = '6';
        
        // 검품 관련 필드 필수로 설정
        document.querySelector('input[name="productName"]').required = true;
        document.querySelector('input[name="quantity"]').required = true;
        document.querySelector('input[name="inspectionType"]:first-of-type').required = true;
    } else {
        // 다른 서비스 선택 시 검품 상세 정보 숨김
        inspectionDetails.classList.add('hidden');
        factoryStepNumber.textContent = '3';
        scheduleStepNumber.textContent = '4';
        additionalStepNumber.textContent = '5';
        
        // 검품 관련 필드 필수 해제
        document.querySelector('input[name="productName"]').required = false;
        document.querySelector('input[name="quantity"]').required = false;
        const inspectionTypeInputs = document.querySelectorAll('input[name="inspectionType"]');
        inspectionTypeInputs.forEach(input => input.required = false);
    }
}

// 일정 협의 상태 변경 처리
function handleScheduleStatusChange(e) {
    const scheduleStatus = e.target.value;
    const scheduleDetails = document.getElementById('scheduleDetails');
    
    if (scheduleStatus === 'agreed') {
        // 협의 완료 시 일정 입력 표시
        scheduleDetails.classList.remove('hidden');
        document.querySelector('input[name="startDate"]').required = true;
        document.querySelector('input[name="endDate"]').required = true;
    } else {
        // 협의 필요 시 일정 입력 숨김
        scheduleDetails.classList.add('hidden');
        document.querySelector('input[name="startDate"]').required = false;
        document.querySelector('input[name="endDate"]').required = false;
    }
}

// 파일 업로드 설정
function setupFileUpload() {
    const dropZone = document.getElementById('fileDropZone');
    const fileInput = document.getElementById('fileInput');
    
    // 클릭으로 파일 선택
    dropZone.addEventListener('click', () => fileInput.click());
    
    // 파일 선택 시
    fileInput.addEventListener('change', handleFileSelect);
    
    // 드래그 앤 드롭
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });
}

// 파일 선택 처리
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

// 파일 처리
function handleFiles(files) {
    const fileList = document.getElementById('fileList');
    
    files.forEach(file => {
        // 파일 개수 제한
        if (selectedFiles.length >= MAX_FILES) {
            alert(`최대 ${MAX_FILES}개까지만 업로드 가능합니다.`);
            return;
        }
        
        // 파일 크기 제한
        if (file.size > MAX_FILE_SIZE) {
            alert(`${file.name}: 파일 크기는 1GB를 초과할 수 없습니다.`);
            return;
        }
        
        // 중복 파일 체크
        if (selectedFiles.some(f => f.name === file.name)) {
            alert(`${file.name}: 이미 추가된 파일입니다.`);
            return;
        }
        
        selectedFiles.push(file);
        
        // 파일 목록에 추가
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-lg';
        fileItem.innerHTML = `
            <div class="flex items-center">
                <i data-lucide="file" class="w-5 h-5 text-gray-500 mr-2"></i>
                <span class="text-sm text-gray-700">${file.name}</span>
                <span class="text-xs text-gray-500 ml-2">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" onclick="removeFile('${file.name}')" class="text-red-500 hover:text-red-700">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        `;
        fileList.appendChild(fileItem);
        if (window.lucide) {
            lucide.createIcons();
        }
    });
}

// 파일 제거
function removeFile(fileName) {
    selectedFiles = selectedFiles.filter(f => f.name !== fileName);
    updateFileList();
}

// 파일 목록 업데이트
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    selectedFiles.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'flex items-center justify-between bg-gray-50 p-3 rounded-lg';
        fileItem.innerHTML = `
            <div class="flex items-center">
                <i data-lucide="file" class="w-5 h-5 text-gray-500 mr-2"></i>
                <span class="text-sm text-gray-700">${file.name}</span>
                <span class="text-xs text-gray-500 ml-2">(${formatFileSize(file.size)})</span>
            </div>
            <button type="button" onclick="removeFile('${file.name}')" class="text-red-500 hover:text-red-700">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        `;
        fileList.appendChild(fileItem);
        if (window.lucide) {
            lucide.createIcons();
        }
    });
}

// 파일 크기 포맷
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 폼 데이터 저장 (localStorage)
function saveFormData() {
    const form = document.getElementById('applicationForm');
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    localStorage.setItem('applicationFormData', JSON.stringify(data));
}

// 저장된 데이터 불러오기
function loadSavedData() {
    const savedData = localStorage.getItem('applicationFormData');
    if (!savedData) return;
    
    try {
        const data = JSON.parse(savedData);
        const form = document.getElementById('applicationForm');
        
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'radio' || input.type === 'checkbox') {
                    const specificInput = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (specificInput) {
                        specificInput.checked = true;
                        specificInput.dispatchEvent(new Event('change'));
                    }
                } else {
                    input.value = data[key];
                }
            }
        });
    } catch (e) {
        console.error('저장된 데이터 로드 실패:', e);
    }
}

// 폼 제출 처리
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    const loadingModal = document.getElementById('loadingModal');
    
    // 유효성 검사
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // 버튼 비활성화 및 로딩 표시
    submitBtn.disabled = true;
    loadingModal.classList.remove('hidden');
    loadingModal.classList.add('flex');
    
    try {
        // 폼 데이터 수집
        const formData = collectFormData(form);
        
        // 파일을 Base64로 변환
        const filesBase64 = await convertFilesToBase64();
        
        // 데이터 전송
        const response = await submitToGoogleSheets({
            ...formData,
            files: filesBase64,
            timestamp: new Date().toISOString()
        });
        
        if (response.success) {
            // 성공 처리
            localStorage.removeItem('applicationFormData');
            showSuccessModal(formData.reservationNumber);
        } else {
            throw new Error(response.message || '제출 실패');
        }
    } catch (error) {
        console.error('제출 오류:', error);
        alert('신청서 제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
        submitBtn.disabled = false;
        loadingModal.classList.add('hidden');
        loadingModal.classList.remove('flex');
    }
}

// 폼 데이터 수집
function collectFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    // 기본 데이터 수집
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // 예약번호 생성
    data.reservationNumber = generateReservationNumber();
    
    // 서비스 유형에 따른 한글 변환
    const serviceTypeMap = {
        'inspection': '품질 검품',
        'factory': '공장 실사',
        'loading': '적재 검사'
    };
    data.serviceTypeKr = serviceTypeMap[data.serviceType] || data.serviceType;
    
    // 검품 방식 한글 변환
    const inspectionTypeMap = {
        'standard': '표준 검품 (AQL 4.0)',
        'full': '전수 검품'
    };
    data.inspectionTypeKr = inspectionTypeMap[data.inspectionType] || data.inspectionType;
    
    // 일정 협의 상태 한글 변환
    const scheduleStatusMap = {
        'agreed': '공장과 일정 협의 완료',
        'pending': '두리무역에서 협의 진행'
    };
    data.scheduleStatusKr = scheduleStatusMap[data.scheduleStatus] || data.scheduleStatus;
    
    return data;
}

// 파일을 Base64로 변환
async function convertFilesToBase64() {
    const promises = selectedFiles.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: reader.result.split(',')[1] // Base64 부분만
                });
            };
            reader.readAsDataURL(file);
        });
    });
    
    return Promise.all(promises);
}

// Google Sheets로 데이터 전송
async function submitToGoogleSheets(data) {
    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // CORS 정책 우회
            headers: {
                'Content-Type': 'text/plain', // no-cors 모드에서는 text/plain만 허용
            },
            body: JSON.stringify(data)
        });
        
        // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
        return { success: true };
    } catch (error) {
        console.error('전송 오류:', error);
        throw error;
    }
}

// 성공 모달 표시
function showSuccessModal(reservationNumber) {
    // 기존 모달이 있다면 제거
    const existingModal = document.getElementById('successModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 새로운 모달 생성
    const modalHTML = `
        <div id="successModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <i data-lucide="check" class="h-8 w-8 text-green-600"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">신청이 완료되었습니다!</h3>
                    <div class="bg-blue-50 rounded-lg p-4 mb-4">
                        <p class="text-sm text-gray-600 mb-2">예약번호</p>
                        <p class="text-2xl font-bold text-blue-600">${reservationNumber}</p>
                    </div>
                    <p class="text-gray-600 mb-6">
                        신청서가 성공적으로 제출되었습니다.<br>
                        예약번호를 메모해 두시면 진행 상황 확인에 유용합니다.<br>
                        빠른 시일 내에 담당자가 연락드리겠습니다.
                    </p>
                    <div class="flex gap-3 justify-center">
                        <button onclick="window.location.href='index.html'" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            메인으로 돌아가기
                        </button>
                        <button onclick="window.location.reload()" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                            새 신청서 작성
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

// 전역 함수로 파일 제거 (인라인 onclick용)
window.removeFile = removeFile; 