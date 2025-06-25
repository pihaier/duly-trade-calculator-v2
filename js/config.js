/**
 * 🚢 통합 무역 비용 계산기 - 설정 관리 모듈
 * 
 * 컨테이너 규격, 환율 기본값, API 엔드포인트 등
 * 애플리케이션의 고정 설정값들을 관리합니다.
 */

// 컨테이너 규격 정보 (단위: cm)
const CONTAINER_SPECS = {
    '20ft': {
        name: '20ft 컨테이너',
        length: 589,
        width: 235,
        height: 239,
        maxWeight: 28080, // kg
        color: '#3b82f6'
    },
    '40ft': {
        name: '40ft 컨테이너',
        length: 1203,
        width: 235,
        height: 239,
        maxWeight: 26480, // kg
        color: '#10b981'
    },
    '40hc': {
        name: '40ft HC 컨테이너',
        length: 1203,
        width: 235,
        height: 269,
        maxWeight: 26480, // kg
        color: '#f59e0b'
    }
};

// 팔레트 기본 규격 (단위: cm)
const DEFAULT_PALLET = {
    length: 110,
    width: 110,
    height: 15,
    maxWeight: 1000 // kg
};

// 관세율 및 세율 정보
const TAX_RATES = {
    DEFAULT_TARIFF: 0.08, // 기본 관세율 8%
    VAT_RATE: 0.10, // 부가가치세 10%
    CO_COST: {
        // C/O 발급 비용 (원)
        USD: 50000,
        CNY: 30000
    }
};

// 통화 정보
const CURRENCIES = {
    USD: {
        name: '미국 달러',
        symbol: '$',
        defaultRate: 1350 // 기본 환율 (참고용)
    },
    CNY: {
        name: '중국 위안',
        symbol: '¥',
        defaultRate: 190 // 기본 환율 (참고용)
    },
    KRW: {
        name: '한국 원',
        symbol: '₩',
        defaultRate: 1
    }
};

// 관세청 API 엔드포인트
const API_ENDPOINTS = {
    BASE_URL: 'https://unipass.customs.go.kr:38010/ext/rest',
    
    // 관세율 기본 조회 (API030)
    TARIFF_RATE: '/trrtQry/retrieveTrrt',
    
    // 세관장확인대상 물품 조회 (API029)
    CUSTOMS_REQUIREMENT: '/ccctLworCdQry/retrieveCcctLworCd',
    
    // 관세환율 정보 (API012)
    EXCHANGE_RATE: '/trifFxrtInfoQry/retrieveTrifFxrtInfo'
};

// API 요청 기본 설정
const API_CONFIG = {
    // 실제 운영 시에는 환경변수나 별도 설정에서 관리
    API_KEY: 'YOUR_API_KEY_HERE', // 실제 발급받은 키로 교체 필요
    
    TIMEOUT: 10000, // 10초
    
    RETRY_COUNT: 3,
    
    CACHE_DURATION: 300000 // 5분 (환율 정보 캐시)
};

// 3D 시뮬레이션 설정
const THREEJS_CONFIG = {
    CAMERA: {
        fov: 75,
        near: 0.1,
        far: 10000,
        position: { x: 800, y: 600, z: 800 }
    },
    
    COLORS: {
        CONTAINER: 0x404040,     // 회색 (컨테이너)
        PALLET: 0x8B4513,        // 갈색 (팔레트)
        BOX: 0x3B82F6,           // 파란색 (박스)
        EDGE: 0x000000,          // 검은색 (테두리)
        BACKGROUND: 0x1F2937     // 다크 배경
    },
    
    LIGHTING: {
        AMBIENT_INTENSITY: 0.6,
        DIRECTIONAL_INTENSITY: 0.8,
        DIRECTIONAL_POSITION: { x: 1, y: 1, z: 1 }
    },
    
    CONTROLS: {
        enableDamping: true,
        dampingFactor: 0.05,
        enableZoom: true,
        enableRotate: true,
        enablePan: true
    }
};

// LCL vs FCL 판단 기준
const SHIPPING_CRITERIA = {
    LCL_TO_FCL_CBM_THRESHOLD: 15,           // CBM 15 이상이면 FCL 고려
    LCL_TO_FCL_CAPACITY_THRESHOLD: 0.70,   // 컨테이너 용량의 70% 이상이면 FCL 고려
    
    CONTAINER_CBM: {
        '20ft': 33.2,
        '40ft': 67.7,
        '40hc': 76.4
    }
};

// UI 메시지 상수
const MESSAGES = {
    SUCCESS: {
        CBM_CALCULATED: '✅ CBM 계산이 완료되었습니다!',
        COST_CALCULATED: '✅ 총 비용 계산이 완료되었습니다!',
        API_SUCCESS: '✅ API 조회가 성공적으로 완료되었습니다.'
    },
    
    ERROR: {
        INVALID_INPUT: '❌ 입력값을 확인해주세요.',
        API_ERROR: '❌ API 조회 중 오류가 발생했습니다.',
        NETWORK_ERROR: '❌ 네트워크 연결을 확인해주세요.',
        CALCULATION_ERROR: '❌ 계산 중 오류가 발생했습니다.'
    },
    
    WARNING: {
        WEIGHT_LIMIT: '⚠️ 무게 제한으로 인해 적재 단수가 조정되었습니다.',
        NO_HS_CODE: '⚠️ HS Code가 입력되지 않아 기본 관세율 8%가 적용됩니다.',
        HIGH_CBM: '💡 CBM이 높아 FCL 운송을 권장합니다.'
    },
    
    INFO: {
        LOADING: '⏳ 계산 중입니다...',
        API_LOADING: '⏳ API 조회 중입니다...',
        RENDERING: '⏳ 3D 모델을 렌더링 중입니다...'
    }
};

// 입력 검증 규칙
const VALIDATION_RULES = {
    BOX: {
        MIN_DIMENSION: 1,    // cm
        MAX_DIMENSION: 500,  // cm
        MIN_WEIGHT: 0.1,     // kg
        MAX_WEIGHT: 1000     // kg
    },
    
    QUANTITY: {
        MIN: 1,
        MAX: 100000
    },
    
    PRICE: {
        MIN: 0.01,
        MAX: 1000000
    },
    
    HS_CODE: {
        LENGTH: 10,
        PATTERN: /^\d{10}$/
    }
};

// 기본 예시 데이터
const SAMPLE_DATA = {
    BOX: {
        length: 30,
        width: 20,
        height: 15,
        weight: 2.5
    },
    
    COST_CALCULATION: {
        unitPrice: 50.00,
        quantity: 1000,
        currency: 'USD',
        shippingCost: 2000.00,
        hsCode: '8471300000'
    }
};

// 로컬 스토리지 키
const STORAGE_KEYS = {
    LAST_CBM_INPUT: 'lastCbmInput',
    LAST_COST_INPUT: 'lastCostInput',
    EXCHANGE_RATE_CACHE: 'exchangeRateCache',
    USER_PREFERENCES: 'userPreferences'
};

// 날짜 관련 유틸리티
const DATE_UTILS = {
    getCurrentDate: () => {
        const now = new Date();
        return now.toISOString().split('T')[0].replace(/-/g, '');
    },
    
    getCurrentDateTime: () => {
        const now = new Date();
        return now.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
};

// 숫자 포맷 유틸리티
const FORMAT_UTILS = {
    // 숫자를 천 단위 콤마 형식으로 변환
    numberWithCommas: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    // 소수점 둘째 자리까지 표시
    toFixed2: (num) => {
        return Math.round(num * 100) / 100;
    },
    
    // CBM을 소수점 셋째 자리까지 표시
    formatCBM: (cbm) => {
        return Math.round(cbm * 1000) / 1000;
    },
    
    // 원화 형식으로 표시
    formatKRW: (amount) => {
        return `₩ ${FORMAT_UTILS.numberWithCommas(Math.round(amount))}`;
    },
    
    // 달러 형식으로 표시
    formatUSD: (amount) => {
        return `$ ${FORMAT_UTILS.numberWithCommas(FORMAT_UTILS.toFixed2(amount))}`;
    }
};

// 디버그 모드 설정
const DEBUG = {
    ENABLED: true, // 개발 시에만 true
    LOG_API_REQUESTS: true,
    LOG_CALCULATIONS: true,
    SHOW_3D_HELPERS: true
};

// 전역 객체로 설정 노출
window.CONFIG = {
    CONTAINER_SPECS,
    DEFAULT_PALLET,
    TAX_RATES,
    CURRENCIES,
    API_ENDPOINTS,
    API_CONFIG,
    THREEJS_CONFIG,
    SHIPPING_CRITERIA,
    MESSAGES,
    VALIDATION_RULES,
    SAMPLE_DATA,
    STORAGE_KEYS,
    DATE_UTILS,
    FORMAT_UTILS,
    DEBUG
}; 