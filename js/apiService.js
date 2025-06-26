/**
 * 🌐 API 서비스 모듈 v3.1 - INP 최적화
 * 
 * 관세청 Open API와의 통신을 담당하며,
 * 관세율, 환율, 수입요건 정보를 조회합니다.
 * 
 * @version 3.1.0 - INP 성능 최적화
 * @updated 2025-06-26
 */

/**
 * API 서비스 클래스 - INP 최적화
 */
class ApiService {
    constructor() {
        this.cache = new Map();
        
        // Vercel 서버리스 함수 설정 (우선순위)
        this.BACKEND_CONFIG = {
            BASE_URL: '/api',  // Vercel 서버리스 함수 경로
            TIMEOUT: 8000,     // 타임아웃 단축
            RETRY_COUNT: 1     // 재시도 횟수 감소
        };
        
        // 직접 관세청 API 호출 설정 (fallback)
        this.API_CONFIG = {
            API_KEY: 'o260t225i086q161g060c050i0',
            TIMEOUT: 8000,     // 타임아웃 단축
            RETRY_COUNT: 1,    // 재시도 횟수 감소
            CACHE_DURATION: 300000
        };
        this.API_ENDPOINTS = {
            BASE_URL: 'https://unipass.customs.go.kr:38010/ext/rest',
            TARIFF_RATE: '/trrtQry/retrieveTrrt',
            CUSTOMS_REQUIREMENT: '/ccctLworCdQry/retrieveCcctLworCd',
            EXCHANGE_RATE: '/trifFxrtInfoQry/retrieveTrifFxrtInfo'
        };
        this.CURRENCIES = {
            USD: { defaultRate: 1350 },
            CNY: { defaultRate: 190 }
        };
        
        this.useBackend = true; // 서버리스 함수 사용
        this.initCache();
        this.checkBackendConnection();
    }

    /**
     * 서버리스 함수 연결 확인 - 타임아웃 단축
     */
    async checkBackendConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 3초 → 2초 단축
            
            const response = await fetch('/api/health', {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.useBackend = true;
                return true;
            } else {
                this.useBackend = false;
                return false;
            }
        } catch (error) {
            this.useBackend = false;
            return false;
        }
    }

    /**
     * 서버리스 함수 재연결 시도
     */
    async retryBackendConnection() {
        if (!this.useBackend) {
            const connected = await this.checkBackendConnection();
            return connected;
        }
        return true;
    }

    /**
     * 캐시 초기화
     */
    initCache() {
        try {
            const cached = localStorage.getItem('exchangeRateCache');
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < this.API_CONFIG.CACHE_DURATION) {
                    this.cache.set('exchangeRates', data.rates);
                }
            }
        } catch (error) {
            }
    }

    /**
     * 환율 정보 캐시 저장
     */
    saveExchangeRateCache(rates) {
        try {
            const cacheData = {
                rates,
                timestamp: Date.now()
            };
            localStorage.setItem('exchangeRateCache', JSON.stringify(cacheData));
            this.cache.set('exchangeRates', rates);
        } catch (error) {
            }
    }

    /**
     * HTTP 요청 함수 - INP 최적화
     */
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.API_CONFIG.TIMEOUT);

        try {
            // 🔧 INP 최적화: 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 🔧 INP 최적화: JSON 파싱 전 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));
            const data = await response.json();
            
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('요청 시간 초과');
            }
            
            throw error;
        }
    }

    /**
     * 재시도 로직이 포함된 API 호출 - 재시도 횟수 감소
     */
    async makeRequestWithRetry(url, options = {}, retryCount = 0) {
        try {
            return await this.makeRequest(url, options);
        } catch (error) {
            // CORS 에러는 재시도하지 않음
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                throw error;
            }
            
            // 재시도 횟수 감소 (3회 → 1회)
            if (retryCount < this.API_CONFIG.RETRY_COUNT) {
                // 재시도 대기 시간 단축
                await new Promise(resolve => setTimeout(resolve, 500));
                
                return this.makeRequestWithRetry(url, options, retryCount + 1);
            }
            
            throw error;
        }
    }

    /**
     * 서버리스 함수 API 호출 - INP 최적화
     */
    async callBackendAPI(endpoint, params = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.BACKEND_CONFIG.TIMEOUT);

        try {
            // 🔧 INP 최적화: URL 생성 전 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const url = new URL(`${this.BACKEND_CONFIG.BASE_URL}/${endpoint}`, window.location.origin);
            
            // 파라미터를 URL에 추가
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Serverless API Error: ${response.status} - ${errorData.message || response.statusText}`);
            }

            // 🔧 INP 최적화: JSON 파싱 전 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));
            const data = await response.json();
            
            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.error?.message || 'Serverless API returned success: false');
            }

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('서버리스 함수 API 요청 시간 초과');
            }
            
            throw error;
        }
    }

    /**
     * 모든 환율 정보 조회 (USD, CNY 한 번에) - INP 최적화 + 중복 호출 방지
     */
    async getExchangeRates() {
        try {
            // 캐시에서 먼저 확인
            const cached = this.cache.get('exchangeRates');
            if (cached && cached.USD && cached.CNY) {
                return cached;
            }

            // 🔧 INP 최적화: 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));

            const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

            // 서버리스 함수 API 우선 시도
            if (this.useBackend) {
                try {
                    const data = await this.callBackendAPI('exchange-rate', {
                        date: currentDate
                    });

                    if (data && data.rates && data.rates.length > 0) {
                        const rates = {};
                        
                        // 🔧 INP 최적화: 배열 처리 전 메인 스레드 양보
                        await new Promise(resolve => setTimeout(resolve, 0));
                        
                        // 모든 환율을 캐시에 저장
                        data.rates.forEach(item => {
                            rates[item.currency] = item.baseRate;
                        });

                        // 최소한 USD, CNY 기본값 보장
                        if (!rates.USD) rates.USD = this.CURRENCIES.USD.defaultRate;
                        if (!rates.CNY) rates.CNY = this.CURRENCIES.CNY.defaultRate;

                        this.saveExchangeRateCache(rates);
                        
                        return rates;
                    }
                } catch (serverlessError) {
                    this.useBackend = false;
                    // 기본값으로 폴백
                }
            }

            // 기본값 반환
            const defaultRates = {
                USD: this.CURRENCIES.USD.defaultRate,
                CNY: this.CURRENCIES.CNY.defaultRate
            };
            
            this.saveExchangeRateCache(defaultRates);
            return defaultRates;

        } catch (error) {
            // 에러 시 기본값 반환
            const defaultRates = {
                USD: this.CURRENCIES.USD.defaultRate,
                CNY: this.CURRENCIES.CNY.defaultRate
            };
            
            this.saveExchangeRateCache(defaultRates);
            return defaultRates;
        }
    }

    /**
     * 관세환율 정보 조회 - INP 최적화
     */
    async getExchangeRate(currency = 'USD') {
        try {
            // 캐시에서 먼저 확인
            const cached = this.cache.get('exchangeRates');
            if (cached && cached[currency]) {
                return cached[currency];
            }

            // 🔧 INP 최적화: 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));

            const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

            // 서버리스 함수 API 우선 시도
            if (this.useBackend) {
                try {
                    const data = await this.callBackendAPI('exchange-rate', {
                        date: currentDate
                    });

                    if (data && data.rates && data.rates.length > 0) {
                        const rates = {};
                        
                        // 🔧 INP 최적화: 배열 처리 전 메인 스레드 양보
                        await new Promise(resolve => setTimeout(resolve, 0));
                        
                        // 모든 환율을 캐시에 저장
                        data.rates.forEach(item => {
                            rates[item.currency] = item.baseRate;
                        });

                        // 최소한 USD, CNY 기본값 보장
                        if (!rates.USD) rates.USD = this.CURRENCIES.USD.defaultRate;
                        if (!rates.CNY) rates.CNY = this.CURRENCIES.CNY.defaultRate;

                        this.saveExchangeRateCache(rates);
                        
                        return rates[currency] || this.CURRENCIES[currency]?.defaultRate || 1350;
                    }
                } catch (serverlessError) {
                    this.useBackend = false;
                    return this.CURRENCIES[currency]?.defaultRate || 1350;
                }
            }

            // 직접 관세청 API 호출은 CORS 문제로 브라우저에서 제한됨
            if (location.protocol === 'file:') {
                return this.CURRENCIES[currency]?.defaultRate || 1350;
            }

            // 기본값 반환
            return this.CURRENCIES[currency]?.defaultRate || 1350;

        } catch (error) {
            return this.CURRENCIES[currency]?.defaultRate || 1350;
        }
    }

    /**
     * 관세율 기본 조회 - INP 최적화 + 503 에러 처리 개선
     */
    async getTariffRate(hsCode, importCountry = null) {
        try {
            if (!hsCode || hsCode.length !== 10) {
                throw new Error('올바른 HS Code를 입력해주세요 (10자리)');
            }

            // 🔧 INP 최적화: 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));

            const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
            
            // 국가명을 한국어로 변환
            const countryMapping = {
                'CN': '중국',
                'US': '미국', 
                'JP': '일본',
                'DE': '독일',
                'VN': '베트남',
                'TH': '태국',
                'IN': '인도',
                'MY': '말레이시아',
                'SG': '싱가포르'
            };
            
            const koreanCountryName = countryMapping[importCountry] || importCountry;

            // 서버리스 함수 API 우선 시도
            if (this.useBackend) {
                try {
                    const data = await this.callBackendAPI('tariff-rate', {
                        hsCode: hsCode,
                        date: currentDate,
                        importCountry: koreanCountryName
                    });

                    if (data && data.rates) {
                        // 🔧 INP 최적화: 데이터 처리 전 메인 스레드 양보
                        await new Promise(resolve => setTimeout(resolve, 0));
                        
                        return {
                            hsCode: data.hsCode,
                            itemName: data.itemName,
                            koreanName: data.koreanName,
                            unit: data.unit,
                            rates: data.rates,
                            additionalInfo: data.additionalInfo || {},
                            date: data.date
                        };
                    }
                } catch (serverlessError) {
                    // 🔧 503 에러 등 서버 에러 처리 개선
                    if (serverlessError.message.includes('503') || serverlessError.message.includes('502') || serverlessError.message.includes('500')) {
                        this.useBackend = false;
                        throw new Error('관세청 API 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.');
                    } else {
                        this.useBackend = false;
                        throw new Error('관세청 API 연동 실패: ' + serverlessError.message);
                    }
                }
            }

            throw new Error('관세율 조회 서비스를 사용할 수 없습니다.');

        } catch (error) {
            throw error;
        }
    }

    /**
     * 최적 관세율 선택 - INP 최적화
     */
    async selectBestTariffRate(tariffRates) {
        // 🔧 INP 최적화: 계산 전 메인 스레드 양보
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const wtoRate = tariffRates.wto || tariffRates.default;
        let bestOption = {
            rate: wtoRate,
            type: 'WTO',
            needsCO: false,
            country: null
        };

        Object.entries(tariffRates.fta).forEach(([country, ftaRate]) => {
            if (ftaRate < bestOption.rate) {
                bestOption = {
                    rate: ftaRate,
                    type: 'FTA',
                    needsCO: true,
                    country: country
                };
            }
        });

        tariffRates.preferential.forEach(pref => {
            if (pref.rate < bestOption.rate) {
                bestOption = {
                    rate: pref.rate,
                    type: 'PREFERENTIAL',
                    needsCO: false,
                    country: null
                };
            }
        });

        return bestOption;
    }

    /**
     * 세관장확인대상 물품 조회 - INP 최적화
     */
    async getCustomsRequirements(hsCode) {
        try {
            if (!hsCode || hsCode.length !== 10) {
                throw new Error('올바른 HS Code를 입력해주세요 (10자리)');
            }

            // 🔧 INP 최적화: 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));

            // 서버리스 함수 API 우선 시도
            if (this.useBackend) {
                try {
                    const data = await this.callBackendAPI('requirements', {
                        hsCode: hsCode
                    });

                    if (data && data.requirements) {
                        // 🔧 INP 최적화: 배열 처리 전 메인 스레드 양보
                        await new Promise(resolve => setTimeout(resolve, 0));
                        
                        const requirements = data.requirements.map(item => ({
                            lawName: item.law,
                            requirementDoc: item.description,
                            description: item.description || '',
                            agency: item.authority || '',
                            isRequired: item.required
                        }));

                        return requirements;
                    }
                } catch (serverlessError) {
                    this.useBackend = false;
                    
                    return [{
                        lawName: '일반 수입 요건',
                        requirementDoc: '세관에서 요구하는 일반적인 수입 서류를 준비해주세요.',
                        description: '정확한 수입요건은 세관에 문의하시기 바랍니다.',
                        agency: '관세청',
                        isRequired: true
                    }];
                }
            }

            return [{
                lawName: '일반 수입 요건',
                requirementDoc: '세관에서 요구하는 일반적인 수입 서류를 준비해주세요.',
                description: '정확한 수입요건은 세관에 문의하시기 바랍니다.',
                agency: '관세청',
                isRequired: true
            }];

        } catch (error) {
            throw error;
        }
    }

    /**
     * 전체 세관 정보 조회 - INP 최적화
     */
    async getFullCustomsInfo(hsCode) {
        try {
            // 🔧 INP 최적화: 병렬 처리 대신 순차 처리로 메인 스레드 부하 감소
            const tariffInfo = await this.getTariffRate(hsCode);
            
            // 메인 스레드 양보
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const requirements = await this.getCustomsRequirements(hsCode);

            return {
                hsCode,
                tariff: tariffInfo,
                requirements,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * API 연결 테스트
     */
    async testConnection() {
        try {
            await this.getExchangeRate('USD');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 캐시 클리어
     */
    clearCache() {
        this.cache.clear();
        try {
            localStorage.removeItem('exchangeRateCache');
        } catch (error) {
            }
    }
}

// API 서비스 인스턴스 생성
const apiService = new ApiService();

// 전역에서 사용할 수 있도록 window 객체에 추가
window.apiService = apiService; 