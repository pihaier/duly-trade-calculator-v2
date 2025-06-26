/**
 * 🎮 메인 UI 컨트롤러
 * 
 * 탭 전환, 공통 UI 상태 관리, 시간 표시,
 * 로딩 상태, 알림 메시지 등을 담당합니다.
 */

class MainController {
    constructor() {
        this.currentTab = 'cbm';
        this.loadingTimeout = null;
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        this.initEventListeners();
        this.initClock();
        this.initTooltips();
        this.loadUserPreferences();
        
        }

    /**
     * 이벤트 리스너 초기화
     */
    initEventListeners() {
        // 탭 전환 이벤트
        this.initTabEvents();
        
        // 팔레트 사용 체크박스 이벤트
        this.initPalletToggle();
        
        // 키보드 이벤트
        this.initKeyboardEvents();
        
        // 윈도우 이벤트
        this.initWindowEvents();
    }

    /**
     * 탭 전환 이벤트 초기화
     */
    initTabEvents() {
        const cbmTab = document.getElementById('cbmTab');
        const costTab = document.getElementById('costTab');

        cbmTab.addEventListener('click', () => this.switchTab('cbm'));
        costTab.addEventListener('click', () => this.switchTab('cost'));
    }

    /**
     * 탭 전환
     */
    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // 기존 탭 비활성화
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.classList.add('hidden');
        });

        // 새 탭 활성화
        const tabButton = document.getElementById(`${tabName}Tab`);
        const tabContent = document.getElementById(`${tabName}Section`);

        if (tabButton && tabContent) {
            tabButton.classList.add('active');
            tabContent.classList.remove('hidden');
            tabContent.classList.add('active');
            
            this.currentTab = tabName;
            
            // 탭 전환 애니메이션
            this.animateTabTransition(tabContent);
            
            // 광고 표시/숨김 처리
            this.handleAdVisibility(tabName);
            
            // 사용자 설정 저장
            this.saveUserPreference('lastTab', tabName);
            
            }
    }

    /**
     * 탭별 광고 표시/숨김 처리
     */
    handleAdVisibility(tabName) {
        const middleAd = document.getElementById('middleAdBanner');
        const bottomAd = document.getElementById('bottomAdBanner');
        
        if (tabName === 'cbm') {
            // CBM 탭: 중간 광고만 표시 (계산 완료 후에만)
            if (bottomAd) bottomAd.classList.add('hidden');
            // middleAd는 계산 완료 후에만 표시되므로 여기서는 건드리지 않음
        } else if (tabName === 'cost') {
            // 총 비용 탭: 하단 광고만 표시 (계산 완료 후에만)
            if (middleAd) middleAd.classList.add('hidden');
            // bottomAd는 계산 완료 후에만 표시되므로 여기서는 건드리지 않음
        }
    }

    /**
     * 탭 전환 애니메이션 - 깜박임 제거
     */
    animateTabTransition(element) {
        // 간단한 페이드인 효과만 적용
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.style.transition = 'opacity 0.2s ease';
    }

    /**
     * 팔레트 사용 토글 초기화
     */
    initPalletToggle() {
        const usePalletCheckbox = document.getElementById('usePallet');
        const palletSettings = document.getElementById('palletSettings');

        if (usePalletCheckbox && palletSettings) {
            usePalletCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    palletSettings.classList.remove('hidden');
                    palletSettings.classList.add('slide-down', 'show');
                } else {
                    palletSettings.classList.add('hidden');
                    palletSettings.classList.remove('show');
                }
            });
        }
    }

    /**
     * 키보드 이벤트 초기화
     */
    initKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Ctrl + 1: CBM 계산기 탭
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                this.switchTab('cbm');
            }
            
            // Ctrl + 2: 총 비용 계산기 탭
            if (e.ctrlKey && e.key === '2') {
                e.preventDefault();
                this.switchTab('cost');
            }
            
            // ESC: 로딩 오버레이 닫기
            if (e.key === 'Escape') {
                this.hideLoading();
            }
        });
    }

    /**
     * 윈도우 이벤트 초기화
     */
    initWindowEvents() {
        // 페이지 언로드 시 설정 저장
        window.addEventListener('beforeunload', () => {
            this.saveAllUserPreferences();
        });

        // 리사이즈 이벤트
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * 실시간 시계 초기화
     */
    initClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const clockElement = document.getElementById('currentTime');
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    /**
     * 툴팁 초기화
     */
    initTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        
        tooltipElements.forEach(element => {
            element.classList.add('tooltip');
        });
    }

    /**
     * 로딩 상태 표시 - 깜박임 제거
     */
    showLoading(message = '⏳ 처리 중입니다...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            const messageElement = overlay.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            
            overlay.classList.remove('hidden');
            overlay.style.opacity = '1';
            overlay.style.transition = 'opacity 0.2s ease';
        }

        // 30초 후 자동으로 숨기기 (타임아웃 방지)
        this.loadingTimeout = setTimeout(() => {
            this.hideLoading();
            this.showAlert('요청 처리 시간이 초과되었습니다.', 'warning');
        }, 30000);
    }

    /**
     * 로딩 상태 숨기기
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 300);
        }

        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
    }

    /**
     * 알림 메시지 표시 - 다중 라인 지원 ✅
     */
    showAlert(message, type = 'info', duration = 5000) {
        const alertContainer = this.getOrCreateAlertContainer();
        
        // 메시지에서 \n을 <br>로 변환
        const formattedMessage = message.replace(/\n/g, '<br>');
        
        // 긴 메시지인지 확인 (3줄 이상 또는 100자 이상)
        const isLongMessage = message.includes('\n\n') || message.length > 100;
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} ${isLongMessage ? 'alert-large' : ''}`;
        alertElement.innerHTML = `
            <div class="flex ${isLongMessage ? 'flex-col' : 'items-center justify-between'}">
                <div class="${isLongMessage ? 'mb-3' : ''}" style="line-height: 1.5; ${isLongMessage ? 'max-width: 400px;' : ''}">${formattedMessage}</div>
                <button class="${isLongMessage ? 'self-end' : 'ml-4'} text-xl hover:opacity-70 flex-shrink-0" onclick="this.closest('.alert').remove()" title="닫기">×</button>
            </div>
        `;
        
        alertContainer.appendChild(alertElement);
        
        // 즉시 표시 - 깜박임 제거
        alertElement.style.opacity = '1';
        alertElement.style.transform = 'translateX(0)';
        alertElement.style.transition = 'all 0.2s ease';
        
        // 긴 메시지는 더 오래 표시 (10초), 짧은 메시지는 기본 시간
        const displayDuration = isLongMessage ? 10000 : duration;
        
        // 자동으로 제거
        if (displayDuration > 0) {
            setTimeout(() => {
                this.removeAlert(alertElement);
            }, displayDuration);
        }
    }

    /**
     * 알림 컨테이너 가져오기 또는 생성 - 화면 가운데 위치
     */
    getOrCreateAlertContainer() {
        let container = document.getElementById('alertContainer');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'alertContainer';
            // 모바일과 데스크톱 모두 화면 가운데에 표시
            container.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 space-y-2 w-11/12 max-w-md';
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * 알림 메시지 제거
     */
    removeAlert(alertElement) {
        if (alertElement && alertElement.parentElement) {
            alertElement.style.transition = 'all 0.3s ease';
            alertElement.style.opacity = '0';
            alertElement.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (alertElement.parentElement) {
                    alertElement.parentElement.removeChild(alertElement);
                }
            }, 300);
        }
    }

    /**
     * 입력값 검증
     */
    validateInput(value, type, options = {}) {
        const { min = 0, max = Infinity, required = false } = options;
        
        if (required && (!value || value.toString().trim() === '')) {
            return { valid: false, message: '필수 입력 항목입니다.' };
        }
        
        if (!value) {
            return { valid: true };
        }
        
        switch (type) {
            case 'number':
                const numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    return { valid: false, message: '숫자를 입력해주세요.' };
                }
                if (numValue < min) {
                    return { valid: false, message: `${min} 이상의 값을 입력해주세요.` };
                }
                if (numValue > max) {
                    return { valid: false, message: `${max} 이하의 값을 입력해주세요.` };
                }
                break;
                
            case 'hsCode':
                if (value.length !== 10 || !/^\d{10}$/.test(value)) {
                    return { valid: false, message: 'HS Code는 10자리 숫자여야 합니다.' };
                }
                break;
        }
        
        return { valid: true };
    }

    /**
     * 숫자 포맷팅
     */
    formatNumber(num, decimals = 0) {
        if (typeof num !== 'number') {
            num = parseFloat(num) || 0;
        }
        
        return num.toLocaleString('ko-KR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * 통화 포맷팅
     */
    formatCurrency(amount, currency = 'KRW') {
        const symbols = {
            KRW: '₩',
            USD: '$',
            CNY: '¥'
        };
        
        const symbol = symbols[currency] || '₩';
        const formatted = this.formatNumber(amount, currency === 'KRW' ? 0 : 2);
        
        return `${symbol} ${formatted}`;
    }

    /**
     * 사용자 설정 로드
     */
    loadUserPreferences() {
        try {
            const preferences = localStorage.getItem('userPreferences');
            if (preferences) {
                const prefs = JSON.parse(preferences);
                
                // 마지막 탭 복원
                if (prefs.lastTab) {
                    this.switchTab(prefs.lastTab);
                }
            }
        } catch (error) {
            }
    }

    /**
     * 사용자 설정 저장
     */
    saveUserPreference(key, value) {
        try {
            const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
            preferences[key] = value;
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
        } catch (error) {
            }
    }

    /**
     * 모든 사용자 설정 저장
     */
    saveAllUserPreferences() {
        this.saveUserPreference('lastTab', this.currentTab);
        this.saveUserPreference('timestamp', Date.now());
    }

    /**
     * 리사이즈 핸들러
     */
    handleResize() {
        // 3D 뷰어 리사이즈는 각 계산기에서 처리
        }

    /**
     * 디버그 정보 출력
     */
    debugInfo() {
        // 디버그 관련 코드를 여기에 추가
        }
}

// 메인 컨트롤러 인스턴스 생성
const mainController = new MainController();

// 전역에서 사용할 수 있도록 설정
window.mainController = mainController;

// 자주 사용되는 함수들을 전역에 노출
window.showLoading = (message) => mainController.showLoading(message);
window.hideLoading = () => mainController.hideLoading();
window.showAlert = (message, type, duration) => mainController.showAlert(message, type, duration);
window.formatNumber = (num, decimals) => mainController.formatNumber(num, decimals);
window.formatCurrency = (amount, currency) => mainController.formatCurrency(amount, currency);

