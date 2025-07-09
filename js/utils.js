/**
 * 🛠️ 공통 유틸리티 모듈
 * 
 * 중복된 함수들을 통합하여 코드 재사용성을 높이고
 * 성능을 최적화합니다.
 */

class Utils {
    constructor() {
        // 통화 정보 (config.js와 통합)
        this.CURRENCIES = {
            USD: { name: '미국 달러', symbol: '$', defaultRate: 1350 },
            CNY: { name: '중국 위안', symbol: '¥', defaultRate: 190 },
            KRW: { name: '한국 원', symbol: '₩', defaultRate: 1 }
        };

        // 국가 코드 매핑
        this.COUNTRY_MAPPING = {
            'CN': '중국', 'US': '미국', 'JP': '일본', 'DE': '독일',
            'VN': '베트남', 'TH': '태국', 'IN': '인도', 'MY': '말레이시아',
            'SG': '싱가포르', 'OTHER': '기타'
        };

        // 캐시 저장소
        this.cache = new Map();
    }

    /**
     * 숫자 포맷팅 - 천 단위 콤마
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
     * 천 단위 콤마 추가 (간단 버전)
     */
    addCommas(num) {
        if (typeof num === 'string') {
            num = parseFloat(num.replace(/,/g, '')) || 0;
        }
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    /**
     * 콤마 제거
     */
    removeCommas(str) {
        return str.toString().replace(/,/g, '');
    }

    /**
     * 통화 포맷팅
     */
    formatCurrency(amount, currency = 'KRW') {
        const symbol = this.CURRENCIES[currency]?.symbol || '₩';
        const decimals = currency === 'KRW' ? 0 : 2;
        const formatted = this.formatNumber(amount, decimals);
        
        return `${symbol} ${formatted}`;
    }

    /**
     * CBM 포맷팅 (소수점 3자리)
     */
    formatCBM(cbm) {
        return Math.round(cbm * 1000) / 1000;
    }

    /**
     * 소수점 둘째 자리까지
     */
    toFixed2(num) {
        return Math.round(num * 100) / 100;
    }

    /**
     * 날짜 포맷팅 (YYYYMMDD -> YYYY년 MM월 DD일)
     */
    formatDate(dateString) {
        if (typeof dateString === 'string' && dateString.length === 8) {
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            return `${year}년 ${month}월 ${day}일`;
        }
        return dateString;
    }

    /**
     * 국가명 반환
     */
    getCountryName(countryCode) {
        return this.COUNTRY_MAPPING[countryCode] || countryCode;
    }

    /**
     * 파일 크기 포맷팅
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 디바운스 함수
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 스로틀 함수
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 입력값 검증 - 숫자
     */
    validateNumber(value, min = 0, max = Infinity) {
        const num = parseFloat(this.removeCommas(value));
        if (isNaN(num)) return { valid: false, message: '숫자를 입력해주세요.' };
        if (num < min) return { valid: false, message: `${min} 이상의 값을 입력해주세요.` };
        if (num > max) return { valid: false, message: `${max} 이하의 값을 입력해주세요.` };
        return { valid: true, value: num };
    }

    /**
     * 입력값 검증 - HS Code
     */
    validateHSCode(hsCode) {
        if (!hsCode) return { valid: false, message: 'HS Code를 입력해주세요.' };
        if (!/^\d{10}$/.test(hsCode)) {
            return { valid: false, message: 'HS Code는 10자리 숫자여야 합니다.' };
        }
        return { valid: true, value: hsCode };
    }

    /**
     * 로컬 스토리지 안전 저장
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('로컬 스토리지 저장 실패:', error);
            return false;
        }
    }

    /**
     * 로컬 스토리지 안전 로드
     */
    loadFromStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.warn('로컬 스토리지 로드 실패:', error);
            return defaultValue;
        }
    }

    /**
     * 메인 스레드 양보 (INP 최적화)
     */
    async yieldToMain() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * 배열 청크 처리 (성능 최적화)
     */
    async processArrayInChunks(array, processor, chunkSize = 100) {
        const results = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            const chunk = array.slice(i, i + chunkSize);
            const chunkResults = await processor(chunk);
            results.push(...chunkResults);
            
            // 메인 스레드 양보
            await this.yieldToMain();
        }
        return results;
    }

    /**
     * 캐시 관리
     */
    setCache(key, value, ttl = 300000) { // 기본 5분
        this.cache.set(key, {
            value,
            expires: Date.now() + ttl
        });
    }

    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() > cached.expires) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.value;
    }

    clearCache(pattern = null) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    /**
     * 에러 로깅 (개발용)
     */
    logError(error, context = '') {
        if (window.CONFIG?.DEBUG?.ENABLED) {
            console.error(`[${context}] 에러:`, error);
        }
    }

    /**
     * 성능 측정
     */
    startPerformanceMeasure(name) {
        if (window.CONFIG?.DEBUG?.ENABLED) {
            performance.mark(`${name}-start`);
        }
    }

    endPerformanceMeasure(name) {
        if (window.CONFIG?.DEBUG?.ENABLED) {
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
            const measure = performance.getEntriesByName(name)[0];
            console.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
        }
    }
}

// 전역 유틸리티 인스턴스 생성
window.utils = new Utils();

// 자주 사용되는 함수들을 전역에 노출 (하위 호환성)
window.formatNumber = (num, decimals) => window.utils.formatNumber(num, decimals);
window.formatCurrency = (amount, currency) => window.utils.formatCurrency(amount, currency);
window.addCommas = (num) => window.utils.addCommas(num);
window.removeCommas = (str) => window.utils.removeCommas(str);
window.debounce = (func, wait) => window.utils.debounce(func, wait);

console.log('🛠️ 공통 유틸리티 모듈 로드 완료');
