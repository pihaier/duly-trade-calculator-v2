/**
 * 🌐 API 서비스 모듈 v3.0 - Vercel 서버리스 함수 연동
 * 
 * 관세청 Open API와의 통신을 담당하며,
 * 관세율, 환율, 수입요건 정보를 조회합니다.
 * 
 * @version 3.0.0
 * @updated 2025-06-22
 */

/**
 * API 서비스 클래스
 */
class ApiService {
    constructor() {
        this.cache = new Map();
        
        // Vercel 서버리스 함수 설정 (우선순위)
        this.BACKEND_CONFIG = {
            BASE_URL: '/api',  // Vercel 서버리스 함수 경로
            TIMEOUT: 10000,
            RETRY_COUNT: 2
        };
        
        // 직접 관세청 API 호출 설정 (fallback)
        this.API_CONFIG = {
            API_KEY: 'o260t225i086q161g060c050i0',
            TIMEOUT: 10000,
            RETRY_COUNT: 3,
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
     * 서버리스 함수 연결 확인
     */
    async checkBackendConnection() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch('/api/health', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                this.useBackend = true;
                return true;
            } else {
                throw new Error('Serverless function health check failed');
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
     * HTTP 요청 함수
     */
    async makeRequest(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.API_CONFIG.TIMEOUT);

        try {
            // 디버그 모드에서만 로그 출력
            if (window.DEBUG_MODE) {
                }

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (window.DEBUG_MODE) {
                }
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
     * 재시도 로직이 포함된 API 호출
     */
    async makeRequestWithRetry(url, options = {}, retryCount = 0) {
        try {
            return await this.makeRequest(url, options);
        } catch (error) {
            // CORS 에러는 재시도하지 않음 (조용히 처리)
            if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                throw error;
            }
            
            if (retryCount < this.API_CONFIG.RETRY_COUNT) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                
                return this.makeRequestWithRetry(url, options, retryCount + 1);
            }
            
            throw error;
        }
    }

    /**
     * 서버리스 함수 API 호출
     */
    async callBackendAPI(endpoint, params = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.BACKEND_CONFIG.TIMEOUT);

        try {
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
     * 관세환율 정보 조회 (서버리스 함수 우선, fallback으로 직접 호출) - 중복 호출 방지 최적화 ✅
     */
    async getExchangeRate(currency = 'USD') {
        try {
            // 캐시에서 먼저 확인
            const cached = this.cache.get('exchangeRates');
            if (cached && cached[currency]) {
                return cached[currency];
            }

            const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

            // 서버리스 함수 API 우선 시도
            if (this.useBackend) {
                try {
                    // 🔧 최적화: 모든 환율을 한 번에 가져오기 (currency 파라미터 제거)
                    const data = await this.callBackendAPI('exchange-rate', {
                        date: currentDate
                        // currency 파라미터 제거하여 모든 환율 조회
                    });

                    if (data && data.rates && data.rates.length > 0) {
                        const rates = {};
                        
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
                    
                    // 서버리스 함수 실패 시 바로 기본값 반환 (CORS 에러 방지)
                    return this.CURRENCIES[currency]?.defaultRate || 1350;
                }
            }

            // 직접 관세청 API 호출은 CORS 문제로 브라우저에서 제한됨
            // 로컬 파일 실행 시 기본값 사용
            if (location.protocol === 'file:') {
                return this.CURRENCIES[currency]?.defaultRate || 1350;
            }

            // 기본값 반환 (CORS 에러 방지)
            return this.CURRENCIES[currency]?.defaultRate || 1350;

        } catch (error) {
            return this.CURRENCIES[currency]?.defaultRate || 1350;
        }
    }

    /**
     * 관세율 기본 조회 (서버리스 함수 우선, fallback으로 직접 호출)
     */
    async getTariffRate(hsCode, importCountry = null) {
        try {
            if (!hsCode || hsCode.length !== 10) {
                throw new Error('올바른 HS Code를 입력해주세요 (10자리)');
            }

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
                        // API 응답을 그대로 전달 (변형하지 않음)
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
                    this.useBackend = false;
                    
                    // 서버리스 함수 실패 시 에러 throw (가짜 데이터 반환하지 않음)
                    throw new Error('관세청 API 연동 실패: ' + serverlessError.message);
                }
            }

            // 백엔드를 사용하지 않는 경우에도 에러 throw
            throw new Error('관세율 조회 서비스를 사용할 수 없습니다.');

        } catch (error) {
            // CORS 에러는 조용히 넘김 (콘솔 출력만 안함)
            throw error;
        }
    }

    /**
     * 최적 관세율 선택
     */
    selectBestTariffRate(tariffRates) {
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
     * 세관장확인대상 물품 조회 (서버리스 함수 우선, fallback으로 직접 호출)
     */
    async getCustomsRequirements(hsCode) {
        try {
            if (!hsCode || hsCode.length !== 10) {
                throw new Error('올바른 HS Code를 입력해주세요 (10자리)');
            }

            // 서버리스 함수 API 우선 시도
            if (this.useBackend) {
                try {
                    const data = await this.callBackendAPI('requirements', {
                        hsCode: hsCode
                    });

                    if (data && data.requirements) {
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
                    
                    // 서버리스 함수 실패 시 기본값 반환
                    return [{
                        lawName: '일반 수입 요건',
                        requirementDoc: '세관에서 요구하는 일반적인 수입 서류를 준비해주세요.',
                        description: '정확한 수입요건은 세관에 문의하시기 바랍니다.',
                        agency: '관세청',
                        isRequired: true
                    }];
                }
            }

            // 기본값 반환 (CORS 에러 방지)
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
     * 전체 세관 정보 조회
     */
    async getFullCustomsInfo(hsCode) {
        try {
            const [tariffInfo, requirements] = await Promise.all([
                this.getTariffRate(hsCode),
                this.getCustomsRequirements(hsCode)
            ]);

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