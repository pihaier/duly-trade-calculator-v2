/**
 * 💰 총 비용 계산기 모듈
 * 
 * 수입 정보 입력, HS Code 조회, 관세율 계산,
 * 관세청 API 연동을 통한 정밀한 비용 산출을 담당합니다.
 */

class TotalCostCalculator {
    constructor() {
        // 기본 설정값
        this.taxRates = {
            DEFAULT_TARIFF: 0.08,
            VAT_RATE: 0.10
        };

        // C/O 발급비 (원산지 증명서 발급 비용, KRW 기준)
        this.coCosts = {
            USD: 50000,   // 5만원 (USD 기준 제품의 C/O 발급비)
            CNY: 50000,   // 5만원 (CNY 기준 제품의 C/O 발급비)
            KRW: 50000    // 5만원 (KRW 기준 제품의 C/O 발급비)
        };

        this.defaultExchangeRates = {
            USD: 1350,
            CNY: 190
        };

        this.lastCalculationResult = null;
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        this.initEventListeners();
        this.loadLastInput();
        
        }

    /**
     * 이벤트 리스너 초기화
     */
    initEventListeners() {
        // 계산 버튼
        const calculateBtn = document.getElementById('calculateCost');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateTotalCost());
        }

        // 환율 조회 버튼 (통합)
        const fetchAllRatesBtn = document.getElementById('fetchAllRates');
        if (fetchAllRatesBtn) {
            fetchAllRatesBtn.addEventListener('click', () => this.fetchAllExchangeRates());
        }

        // 관세율 조회 버튼
        const fetchTariffBtn = document.getElementById('fetchTariffRate');
        if (fetchTariffBtn) {
            fetchTariffBtn.addEventListener('click', () => this.fetchTariffRate());
        }

        // 입력값 변경 시 자동 저장
        this.initAutoSave();

        // HS Code 입력 시 포맷팅
        this.initHsCodeFormatting();

        // 숫자 입력 필드에 천 단위 콤마 추가
        this.initNumberFormatting();
    }

    /**
     * 자동 저장 초기화
     */
    initAutoSave() {
        const inputs = [
            'unitPrice', 'quantity', 'productCurrency', 'shippingCost', 'shippingCurrency',
            'importCountry', 'hsCode', 'otherCosts'
        ];

        inputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => this.saveCurrentInput());
            }
        });
    }

    /**
     * HS Code 포맷팅 초기화
     */
    initHsCodeFormatting() {
        const hsCodeInput = document.getElementById('hsCode');
        if (hsCodeInput) {
            hsCodeInput.addEventListener('input', (e) => {
                // 숫자만 허용하고 10자리로 제한
                let value = e.target.value.replace(/\D/g, '').slice(0, 10);
                e.target.value = value;
            });
        }
    }

    /**
     * 숫자 입력 필드 포맷팅 초기화 (천 단위 콤마)
     */
    initNumberFormatting() {
        // 모든 숫자 입력 필드에 대해 포맷팅 설정
        const numberInputIds = ['unitPrice', 'quantity', 'shippingCost', 'otherCosts', 'usdRate', 'cnyRate', 'appliedTariffRate'];

        numberInputIds.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                // IME 모드 비활성화 (한글 입력 방지)
                input.style.imeMode = 'disabled';
                input.setAttribute('inputmode', 'numeric');
                
                // 한글 입력 방지 이벤트
                input.addEventListener('compositionstart', (e) => {
                    e.preventDefault();
                    return false;
                });
                
                // 입력 중 실시간 포맷팅
                input.addEventListener('input', (e) => {
                    const cursorPosition = input.selectionStart;
                    const oldValue = input.value;
                    const oldLength = oldValue.length;
                    
                    // 숫자가 아닌 문자 제거 (소수점 제외)
                    let value = input.value.replace(/[^\d.]/g, '');
                    
                    // 소수점이 여러 개인 경우 첫 번째만 유지
                    const parts = value.split('.');
                    if (parts.length > 2) {
                        value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    
                    // 콤마 추가
                    const formattedValue = this.addCommas(value);
                    input.value = formattedValue;
                    
                    // 커서 위치 조정
                    const newLength = formattedValue.length;
                    const lengthDiff = newLength - oldLength;
                    
                    // 입력한 위치 앞의 콤마 개수 계산
                    const beforeCommas = (oldValue.substring(0, cursorPosition).match(/,/g) || []).length;
                    const afterCommas = (formattedValue.substring(0, cursorPosition + lengthDiff).match(/,/g) || []).length;
                    const commaDiff = afterCommas - beforeCommas;
                    
                    // 새로운 커서 위치 계산
                    let newCursorPosition = cursorPosition + lengthDiff;
                    
                    // 커서가 콤마 위치에 있으면 조정
                    if (formattedValue[newCursorPosition - 1] === ',' && lengthDiff > 0) {
                        newCursorPosition++;
                    }
                    
                    // 커서 위치 설정
                    input.setSelectionRange(newCursorPosition, newCursorPosition);
                });
                
                // 포커스 아웃 시 빈 값 처리
                input.addEventListener('blur', (e) => {
                    if (e.target.value === '' || e.target.value === '0') {
                        e.target.value = '0';
                    }
                });
                
                // 기존 값에 콤마 적용
                if (input.value && input.value !== '0') {
                    input.value = this.addCommas(input.value.replace(/,/g, ''));
                }
            }
        });
    }

    /**
     * 숫자에 천 단위 콤마 추가
     */
    addCommas(num) {
        if (num === '' || num === undefined || num === null) return '';
        
        const str = num.toString();
        const parts = str.split('.');
        
        // 정수 부분에 콤마 추가
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        
        // 소수점이 있으면 합치고, 없으면 정수 부분만 반환
        return parts.length > 1 ? parts.join('.') : parts[0];
    }

    /**
     * 날짜 포맷팅 (YYYYMMDD -> YYYY년 MM월 DD일)
     */
    formatDate(dateString) {
        if (dateString.length === 8) {
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            return `${year}년 ${month}월 ${day}일`;
        }
        return dateString;
    }

    /**
     * 모든 환율 조회 (통합) - 중복 호출 방지 최적화 ✅
     */
    async fetchAllExchangeRates() {
        const button = document.getElementById('fetchAllRates');
        const usdInput = document.getElementById('usdRate');
        const cnyInput = document.getElementById('cnyRate');
        
        if (!button || !usdInput || !cnyInput) return;
        
        try {
            button.disabled = true;
            button.textContent = '🔄 조회중...';
            
            // 🔧 최적화: 한 번의 API 호출로 모든 환율 가져오기
            if (window.apiService) {
                try {
                    // 캐시된 환율이 있는지 먼저 확인
                    const cachedRates = window.apiService.cache.get('exchangeRates');
                    
                    if (cachedRates && cachedRates.USD && cachedRates.CNY) {
                        // 캐시에서 환율 사용
                        usdInput.value = this.addCommas(cachedRates.USD);
                        cnyInput.value = this.addCommas(cachedRates.CNY);
                        showAlert(`✅ 환율 조회 완료! (캐시) USD: ${this.addCommas(cachedRates.USD)}원, CNY: ${this.addCommas(cachedRates.CNY)}원`, 'success');
                        return;
                    }
                    
                    // USD 환율 한 번만 호출 (API에서 모든 환율 반환)
                    const usdRate = await this.getExchangeRate('USD');
                    
                    // 캐시에서 CNY 환율 확인 (USD 호출 시 함께 캐시됨)
                    const updatedCache = window.apiService.cache.get('exchangeRates');
                    const cnyRate = updatedCache?.CNY || await this.getExchangeRate('CNY');
                    
                    usdInput.value = this.addCommas(usdRate);
                    cnyInput.value = this.addCommas(cnyRate);
                    
                    showAlert(`✅ 환율 조회 완료! USD: ${this.addCommas(usdRate)}원, CNY: ${this.addCommas(cnyRate)}원`, 'success');
                    
                } catch (apiError) {
                    // API 실패 시 기본값 사용
                    const defaultUSD = 1350;
                    const defaultCNY = 190;
                    
                    usdInput.value = this.addCommas(defaultUSD);
                    cnyInput.value = this.addCommas(defaultCNY);
                    
                    showAlert(`⚠️ 환율 API 조회 실패. 기본값 사용: USD ${this.addCommas(defaultUSD)}원, CNY ${this.addCommas(defaultCNY)}원`, 'warning');
                }
            } else {
                // apiService가 없는 경우 기본값 사용
                const defaultUSD = 1350;
                const defaultCNY = 190;
                
                usdInput.value = this.addCommas(defaultUSD);
                cnyInput.value = this.addCommas(defaultCNY);
                
                showAlert(`⚠️ API 서비스 미사용. 기본값 적용: USD ${this.addCommas(defaultUSD)}원, CNY ${this.addCommas(defaultCNY)}원`, 'info');
            }
            
        } catch (error) {
            showAlert('❌ 환율 조회 실패. 기본값을 사용합니다.', 'warning');
        } finally {
            button.disabled = false;
            button.textContent = '🔄 환율 조회';
        }
    }

    /**
     * 관세율 조회 - 단순 버전 ✅
     */
    async fetchTariffRate() {
        const hsCode = document.getElementById('hsCode').value.trim();
        const importCountry = document.getElementById('importCountry').value;
        const tariffResult = document.getElementById('tariffResult');
        
        if (!tariffResult) return;

        // HS코드가 없으면 기본 관세율 8% 표시
        if (!hsCode) {
            tariffResult.innerHTML = `
                <div class="alert alert-warning">
                    <h4 class="font-bold mb-2">⚠️ HS Code 미입력</h4>
                    <p>HS Code를 입력하지 않으면 <strong>기본 관세율 8%</strong>가 적용됩니다.</p>
                    <p class="text-sm mt-2">정확한 관세율 조회를 위해 10자리 HS Code를 입력해주세요.</p>
                </div>
            `;
            
            // 관세율 입력 필드 업데이트
            const appliedRateInput = document.getElementById('appliedTariffRate');
            if (appliedRateInput) {
                appliedRateInput.value = '8';
            }
            
            return;
        }

        // HS코드 형식 검증
        if (hsCode.length !== 10) {
            tariffResult.innerHTML = `
                <div class="alert alert-error">
                    <h4 class="font-bold mb-2">❌ 잘못된 HS Code</h4>
                    <p>HS Code는 10자리 숫자여야 합니다. (현재: ${hsCode.length}자리)</p>
                </div>
            `;
            return;
        }

        // 로딩 표시
        tariffResult.innerHTML = `
            <div class="text-center py-4">
                <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p class="text-sm text-gray-400">관세율 조회 중...</p>
            </div>
        `;

        try {
            // 간단한 API 호출
            const tariffInfo = await this.getTariffInfo(hsCode, importCountry);
            
            if (tariffInfo) {
                // 관세율 정보 표시
                this.displayTariffInfo(tariffInfo, importCountry);
            } else {
                throw new Error('관세율 정보를 찾을 수 없습니다.');
            }
        } catch (error) {
            // 오류 발생 시 기본 관세율 표시
            tariffResult.innerHTML = `
                <div class="alert alert-error">
                    <h4 class="font-bold mb-2">❌ 관세율 조회 실패</h4>
                    <p>기본 관세율 8%가 적용됩니다.</p>
                </div>
            `;
            
            // 기본 관세율로 설정
            const appliedRateInput = document.getElementById('appliedTariffRate');
            if (appliedRateInput) {
                appliedRateInput.value = '8';
            }
        }
    }

    /**
     * 관세율 정보 표시 (단순화)
     */
    displayTariffInfo(tariffInfo, importCountry) {
        const tariffResult = document.getElementById('tariffResult');
        if (!tariffResult) return;

        // 🔍 DEBUG: API 응답 데이터 로깅
    

        // API 응답에서 관세율 정보 추출
        const data = tariffInfo.data || tariffInfo;
        const rates = data.rates || {};
        
    
        
        // 기본 관세율들 추출 (0값 안전 처리)
        const basicRate = rates.basic?.rate !== undefined ? rates.basic.rate : (rates.기본세율 !== undefined ? rates.기본세율 : 8);
        const wtoRate = rates.wto?.rate !== undefined ? rates.wto.rate : (rates.WTO협정세율 !== undefined ? rates.WTO협정세율 : basicRate);
        const ftaRate = rates.preferential?.rate !== undefined ? rates.preferential.rate : (rates.특혜세율 !== undefined ? rates.특혜세율 : null);
        

        
        // 가장 낮은 세율 찾기
        const availableRates = [basicRate, wtoRate];
        if (ftaRate !== null && ftaRate !== undefined) {
            availableRates.push(ftaRate);
            } else {
            
        }
        
        const bestRate = Math.min(...availableRates);
        // 적용 관세율 자동 입력
        const appliedRateInput = document.getElementById('appliedTariffRate');
        const tariffTypeInput = document.getElementById('tariffType');
        if (appliedRateInput) {
            appliedRateInput.value = bestRate.toFixed(2);
        }
        if (tariffTypeInput) {
            if (bestRate === ftaRate) {
                tariffTypeInput.value = 'FTA 특혜세율';
            } else if (bestRate === wtoRate) {
                tariffTypeInput.value = 'WTO 협정세율';
            } else {
                tariffTypeInput.value = '기본세율';
            }
        }
        
        // 결과 표시
        let html = `
            <div class="bg-gray-800/50 rounded-lg p-4 space-y-3">
                <h4 class="text-lg font-bold text-blue-400">📋 관세율 조회 결과</h4>
                <div class="space-y-2">
                    <div class="bg-gray-700/30 border rounded p-2">
                        <span class="text-gray-300">• 기본세율: ${basicRate.toFixed(2)}%</span>
                    </div>
                    <div class="bg-gray-700/30 border rounded p-2">
                        <span class="text-gray-300">• WTO 협정세율: ${wtoRate.toFixed(2)}%</span>
                    </div>
        `;
        
        // 🔧 FTA/우대세율 표시 조건 수정 (0값 포함)
        if (ftaRate !== null && ftaRate !== undefined) {
            html += `
                    <div class="bg-gray-700/30 border rounded p-2">
                        <span class="text-gray-300">• FTA 특혜세율: ${ftaRate.toFixed(2)}%</span>
                        <span class="text-yellow-400 text-xs ml-2">(원산지 증명서 필요)</span>
                    </div>
            `;
            } else {
            }
        
        html += `
                </div>
                <div class="border-t border-gray-600 pt-3">
                    <div class="text-green-400 font-bold">
                        🎯 적용세율: ${bestRate.toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
        
        tariffResult.innerHTML = html;
    }

    /**
     * 총 비용 계산 실행
     */
    async calculateTotalCost() {
        try {
            // 5초 로딩 시작
            this.showCalculationLoading();

            // 입력값 수집
            const input = this.collectInput();
            
            // 입력값 검증
            const validation = this.validateInput(input);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // 5초 대기 (광고 시간)
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 환율 정보 수집 (UI에서 입력된 값 사용)
            const productExchangeRate = this.getInputExchangeRate(input.productCurrency);
            const shippingExchangeRate = this.getInputExchangeRate(input.shippingCurrency);
            
            // 관세율 정보 수집 (UI에서 입력된 값 사용)
            const appliedTariffRate = parseFloat(document.getElementById('appliedTariffRate')?.value || '8') / 100;
            const tariffType = document.getElementById('tariffType')?.value || '기본 관세율';
            
            // 수입요건 조회 (타임아웃 늘림)
            let requirementsInfo = [];
            if (input.hsCode && input.hsCode.length === 10) {
                try {
                    // 5초 타임아웃으로 충분한 시간 제공
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('timeout')), 5000)
                    );
                    requirementsInfo = await Promise.race([
                        this.getRequirementsInfo(input.hsCode),
                        timeoutPromise
                    ]);
                    } catch (apiError) {
                    // API 실패 시 빈 배열로 유지 (가짜 데이터 표시하지 않음)
                    requirementsInfo = [];
                }
            }
            
            // 관세율 정보 객체 생성 (UI에서 입력된 값만 사용)
            let tariffInfo = {
                bestRate: appliedTariffRate,
                bestRateType: tariffType.includes('FTA') ? 'FTA' : 
                             tariffType.includes('특혜') ? 'PREFERENTIAL' : 'DEFAULT',
                needsCO: tariffType.includes('FTA'),
                coCountry: tariffType.includes('FTA') ? input.importCountry : null
            };
            
            // 관세율 API 호출 제거 - UI에 입력된 값만 사용
            // 계산 수행
            const result = this.performCalculation(input, productExchangeRate, shippingExchangeRate, tariffInfo);
            
            // 결과 표시
            this.displayResults(result);
            
            // 수입 요건 표시 (HS Code가 있고, API 응답이 있을 때만 표시)
            if (input.hsCode && input.hsCode.length === 10) {
                if (requirementsInfo.length > 0 || (requirementsInfo.data && requirementsInfo.data.requirements && requirementsInfo.data.requirements.length > 0)) {
                    this.displayRequirements(requirementsInfo);
                } else {
                    // HS코드는 있지만 수입요건이 없는 경우 섹션 숨김
                    const requirementSection = document.getElementById('requirementSection');
                    if (requirementSection) {
                        requirementSection.classList.add('hidden');
                    }
                }
            } else {
                // HS코드가 없는 경우 수입요건 섹션 숨김
                const requirementSection = document.getElementById('requirementSection');
                if (requirementSection) {
                    requirementSection.classList.add('hidden');
                }
            }
            
            // 계산 결과 저장
            this.lastCalculationResult = result;
            
            // 총 비용 계산 완료 후 하단 광고 표시
            this.showBottomAd();
            
            showAlert('✅ 총 비용 계산이 완료되었습니다!', 'success');

        } catch (error) {
            // CORS 에러는 조용히 처리
            if (!error.message.includes('CORS') && !error.message.includes('Failed to fetch')) {
                showAlert(`❌ 계산 오류: ${error.message}`, 'error');
            } else {
                showAlert('❌ 계산 중 오류가 발생했습니다. 기본값으로 계산합니다.', 'warning');
            }
        } finally {
            this.hideCalculationLoading();
        }
    }

    /**
     * 계산 로딩 표시
     */
    showCalculationLoading() {
        const loadingHtml = `
            <div id="costCalculationLoading" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-8 text-center max-w-md mx-4 shadow-2xl" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                    <div class="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">총 비용 계산 중...</h3>
                    <p class="text-gray-600 mb-4">정확한 관세율과 환율을 적용하여 계산합니다</p>
                    
                    <!-- 광고 컨텐츠 -->
                    <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                        <h4 class="text-sm font-bold text-purple-800 mb-1">💡 수입 비용 절약 팁!</h4>
                        <p class="text-xs text-gray-700 mb-2">
                            정확한 비용 계산 후에는 <strong>품질 검수</strong>가 필수입니다!
                        </p>
                        <p class="text-xs text-purple-600 font-semibold">
                            <a href="https://www.duly.co.kr/" target="_blank" rel="noopener noreferrer" class="hover:underline">
                                두리무역의 현지 검품으로 불량품 리스크 차단 → 자세히 보기
                            </a>
                        </p>
                    </div>
                    
                    <div class="mt-4">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div id="costLoadingProgress" class="bg-purple-600 h-2 rounded-full transition-all duration-1000" style="width: 0%"></div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">계산 진행률: <span id="costProgressText">0%</span></p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
        
        // 스크롤에 따라 광고 위치 업데이트
        const loadingContainer = document.getElementById('costCalculationLoading');
        if (loadingContainer) {
            const updatePosition = () => {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                loadingContainer.style.top = `${scrollTop}px`;
            };
            
            // 초기 위치 설정
            updatePosition();
            
            // 스크롤 이벤트 리스너 추가
            window.addEventListener('scroll', updatePosition);
            
            // 5초 후 이벤트 리스너 제거
            setTimeout(() => {
                window.removeEventListener('scroll', updatePosition);
            }, 5000);
        }
        
        // 진행률 애니메이션 (성능 최적화)
        const progressBar = document.getElementById('costLoadingProgress');
        const progressText = document.getElementById('costProgressText');
        
        if (progressBar && progressText) {
            // CSS transition 사용으로 성능 최적화
            progressBar.style.transition = 'width 5s linear';
            progressBar.style.width = '100%';
            
            // 텍스트는 더 적은 빈도로 업데이트
            let progress = 0;
            const textInterval = setInterval(() => {
                progress += 20;
                progressText.textContent = `${Math.min(progress, 100)}%`;
                
                if (progress >= 100) {
                    clearInterval(textInterval);
                }
            }, 1000); // 1초마다 업데이트
        }
    }

    /**
     * 계산 로딩 숨기기
     */
    hideCalculationLoading() {
        const loading = document.getElementById('costCalculationLoading');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * 하단 광고 표시 (총 비용 계산 완료 후)
     */
    showBottomAd() {
        const bottomAd = document.getElementById('bottomAdBanner');
        if (bottomAd) {
            bottomAd.classList.remove('hidden');
            // 광고를 현재 보는 지점의 중앙에 표시
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const viewportHeight = window.innerHeight;
            const adHeight = bottomAd.offsetHeight;
            
            // 현재 보는 지점의 중앙에 광고 위치
            bottomAd.style.position = 'fixed';
            bottomAd.style.top = '50%';
            bottomAd.style.left = '50%';
            bottomAd.style.transform = 'translate(-50%, -50%)';
            bottomAd.style.zIndex = '9999';
            
            // 닫기 버튼 추가
            const existingCloseBtn = bottomAd.querySelector('.ad-close-btn');
            if (!existingCloseBtn) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'ad-close-btn absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold';
                closeBtn.innerHTML = '&times;';
                closeBtn.onclick = () => {
                    bottomAd.classList.add('hidden');
                    bottomAd.style.position = '';
                    bottomAd.style.top = '';
                    bottomAd.style.left = '';
                    bottomAd.style.transform = '';
                    bottomAd.style.zIndex = '';
                };
                bottomAd.appendChild(closeBtn);
            }
        }
    }

    /**
     * UI에서 환율 입력값 가져오기
     */
    getInputExchangeRate(currency) {
        if (currency === 'KRW') return 1;
        
        const rateInput = document.getElementById(`${currency.toLowerCase()}Rate`);
        if (rateInput && rateInput.value) {
            const rate = parseFloat(rateInput.value.replace(/,/g, ''));
            return isNaN(rate) ? (currency === 'USD' ? 1350 : 190) : rate;
        }
        
        return currency === 'USD' ? 1350 : 190; // 기본값
    }

    /**
     * 입력값 수집
     */
    collectInput() {
        return {
            unitPrice: parseFloat(document.getElementById('unitPrice').value.replace(/,/g, '')) || 0,
            quantity: parseInt(document.getElementById('quantity').value.replace(/,/g, '')) || 0,
            productCurrency: document.getElementById('productCurrency').value || 'USD',
            shippingCost: parseFloat(document.getElementById('shippingCost').value.replace(/,/g, '')) || 0,
            shippingCurrency: document.getElementById('shippingCurrency').value || 'USD',
            importCountry: document.getElementById('importCountry').value || '',
            hsCode: document.getElementById('hsCode').value.trim() || '',
            otherCosts: parseFloat(document.getElementById('otherCosts').value.replace(/,/g, '')) || 0
        };
    }

    /**
     * 입력값 검증 - 친절한 안내 메시지 포함 ✅
     */
    validateInput(input) {
        const { unitPrice, quantity, shippingCost, productCurrency, shippingCurrency } = input;

        // 🔍 제품 단가 검증
        if (!unitPrice || unitPrice <= 0) {
            return { 
                valid: false, 
                message: '💰 제품 단가를 입력해주세요!\n\n📝 예시:\n• 스마트폰: $150\n• 의류: $25\n• 전자제품: $80\n\n💡 팁: 공장에서 제공한 FOB 가격을 입력하세요.' 
            };
        }

        // 🔍 수량 검증
        if (!quantity || quantity <= 0) {
            return { 
                valid: false, 
                message: '📦 주문 수량을 입력해주세요!\n\n📝 예시:\n• 소량 주문: 100개\n• 일반 주문: 1,000개\n• 대량 주문: 10,000개\n\n💡 팁: MOQ(최소 주문량)를 확인하세요.' 
            };
        }

        // 🔍 운송비 검증
        if (shippingCost < 0) {
            return { 
                valid: false, 
                message: '🚢 운송비는 0원 이상이어야 합니다!\n\n📝 참고:\n• 무료 배송인 경우: 0 입력\n• 해상 운송: $1,500~$3,000\n• 항공 운송: $5~$15/kg\n\n💡 팁: 포워더에게 견적을 받아보세요.' 
            };
        }

        // 🔍 운송비가 0이고 제품 가격이 높은 경우 안내
        if (shippingCost === 0 && unitPrice * quantity > 10000) {
            return { 
                valid: false, 
                message: '🚢 고가 제품의 운송비가 0원인지 확인해주세요!\n\n📝 일반적인 운송비:\n• 중국→한국 해상: $1,500~$2,500\n• 중국→한국 항공: $5~$10/kg\n• 유럽→한국: $3,000~$5,000\n\n💡 FOB 조건인지 EXW 조건인지 확인하세요.' 
            };
        }

        // 🔍 HS Code 검증 (선택사항이지만 입력했다면 정확해야 함)
        if (input.hsCode && input.hsCode.length > 0 && input.hsCode.length !== 10) {
            return { 
                valid: false, 
                message: '📋 HS Code는 10자리 숫자여야 합니다!\n\n📝 예시:\n• 스마트폰: 8517120000\n• 노트북: 8471300000\n• 의류: 6109100000\n\n💡 팁: 관세청 HS Code 검색 사이트에서 확인하세요.\n🔗 https://unipass.customs.go.kr' 
            };
        }

        // 🔍 환율 입력 확인 (USD, CNY가 아닌 경우)
        const usdRate = parseFloat(document.getElementById('usdRate')?.value?.replace(/,/g, '') || '0');
        const cnyRate = parseFloat(document.getElementById('cnyRate')?.value?.replace(/,/g, '') || '0');
        
        if ((productCurrency === 'USD' || shippingCurrency === 'USD') && usdRate <= 0) {
            return { 
                valid: false, 
                message: '💱 USD 환율을 입력해주세요!\n\n📝 현재 환율 (참고):\n• USD: 약 1,350원\n• 최근 범위: 1,300~1,400원\n\n💡 팁: "환율 조회" 버튼을 눌러 실시간 환율을 가져오세요!' 
            };
        }

        if ((productCurrency === 'CNY' || shippingCurrency === 'CNY') && cnyRate <= 0) {
            return { 
                valid: false, 
                message: '💱 CNY 환율을 입력해주세요!\n\n📝 현재 환율 (참고):\n• CNY: 약 190원\n• 최근 범위: 180~200원\n\n💡 팁: "환율 조회" 버튼을 눌러 실시간 환율을 가져오세요!' 
            };
        }

        // 🔍 관세율 확인 (HS Code가 있는데 관세율이 기본값인 경우)
        const appliedTariffRate = parseFloat(document.getElementById('appliedTariffRate')?.value || '8');
        if (input.hsCode && input.hsCode.length === 10 && appliedTariffRate === 8) {
            return { 
                valid: false, 
                message: '📋 HS Code를 입력했는데 관세율이 기본값(8%)입니다!\n\n💡 다음 중 하나를 선택하세요:\n\n1️⃣ "관세율 조회" 버튼을 눌러 정확한 관세율 확인\n2️⃣ HS Code를 지우고 기본 관세율로 계산\n3️⃣ 알고 있는 관세율을 직접 입력\n\n📝 일반적인 관세율:\n• 전자제품: 0~8%\n• 의류: 8~13%\n• 기계류: 0~8%' 
            };
        }

        return { valid: true };
    }

    /**
     * 환율 조회 - 단순 버전 ✅
     */
    async getExchangeRate(currency) {
        try {
            if (window.apiService) {
                return await window.apiService.getExchangeRate(currency);
            }
        } catch (error) {
            // API 실패 시 기본값 사용
        }
        
        // 기본값 반환
        return currency === 'USD' ? 1350 : 190;
    }

    /**
     * 관세율 정보 조회 - 단순 버전 ✅
     */
    async getTariffInfo(hsCode, importCountry) {
        try {
            if (window.apiService) {
                return await window.apiService.getTariffRate(hsCode, importCountry);
            }
        } catch (error) {
            // API 실패 시 null 반환
        }
        
        return null;
    }

    /**
     * 수입 요건 정보 조회 - 단순 버전 ✅
     */
    async getRequirementsInfo(hsCode) {
        try {
            if (window.apiService) {
                const result = await window.apiService.getCustomsRequirements(hsCode);
                if (result && result.requirements) {
                    return result.requirements;
                }
                if (Array.isArray(result)) {
                    return result;
                }
            }
        } catch (error) {
            // API 실패 시 빈 배열 반환
        }
        
        return [];
    }

    /**
     * 계산 수행
     */
    performCalculation(input, productExchangeRate, shippingExchangeRate, tariffInfo) {
        const { unitPrice, quantity, productCurrency, shippingCost, shippingCurrency, otherCosts } = input;

        // 1. CIF 계산 (원화 환산)
        const productValue = unitPrice * quantity; // 외화
        const productValueKRW = productCurrency === 'KRW' ? productValue : productValue * productExchangeRate; // 원화
        const shippingCostKRW = shippingCurrency === 'KRW' ? shippingCost : shippingCost * shippingExchangeRate; // 원화
        const cifKRW = productValueKRW + shippingCostKRW;

        // 2. 관세율 결정
        let appliedTariffRate = this.taxRates.DEFAULT_TARIFF;
        let tariffType = 'DEFAULT';
        let needsCO = false;
        let coCountry = null;
        let coCost = 0;

        if (tariffInfo && tariffInfo.bestRate !== undefined) {
            appliedTariffRate = tariffInfo.bestRate;
            tariffType = tariffInfo.bestRateType;
            needsCO = tariffInfo.needsCO;
            coCountry = tariffInfo.coCountry;
            
            if (needsCO) {
                // C/O 발급비는 항상 한국원화 기준 5만원 고정
                coCost = 50000; // 5만원 고정
            }
        }

        // 3. 관세액 계산
        const tariffAmount = cifKRW * appliedTariffRate;

        // 4. 부가세 계산 - 모든 금액의 합의 10%로 수정 ✅
        const vatBase = cifKRW + tariffAmount + coCost + otherCosts;
        const vatAmount = vatBase * this.taxRates.VAT_RATE;

        // 5. 총 비용 계산
        const totalCost = cifKRW + tariffAmount + coCost + vatAmount + otherCosts;
        const costPerUnit = totalCost / quantity;

        return {
            input,
            productExchangeRate,
            shippingExchangeRate,
            calculation: {
                productValue,
                productValueKRW,
                shippingCostKRW,
                cifKRW,
                appliedTariffRate,
                tariffType,
                tariffAmount,
                needsCO,
                coCountry,
                coCost,
                vatBase,
                vatAmount,
                otherCosts,
                totalCost,
                costPerUnit
            },
            breakdown: {
                productCost: productValueKRW,
                shippingCost: shippingCostKRW,
                tariffCost: tariffAmount,
                coCost: coCost,
                vatCost: vatAmount,
                otherCosts: otherCosts
            },
            tariffInfo,
            requirementsInfo: this.getRequirementsInfo(input.hsCode),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 결과 표시
     */
    displayResults(result) {
        const resultsContainer = document.getElementById('costResults');
        if (!resultsContainer) return;

        const { input, calculation, breakdown, requirementsInfo } = result;

        resultsContainer.innerHTML = `
            <div class="space-y-6">
                <!-- 요약 정보 -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="stat-card">
                        <span class="stat-value">${formatCurrency(calculation.totalCost)}</span>
                        <div class="stat-label">총 수입 비용</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${formatCurrency(calculation.costPerUnit)}</span>
                        <div class="stat-label">개당 원가</div>
                    </div>
                </div>

                <!-- 관세율 정보 (FTA 추천 포함) -->
                ${this.generateResultTariffHTML(result)}

                <!-- 상세 계산 내역 -->
                <div class="space-y-4">
                    <h4 class="text-lg font-bold">📊 상세 계산 내역</h4>
                    
                    <!-- CIF 계산 -->
                    <div class="bg-gray-800/50 rounded-lg p-4">
                        <h5 class="font-semibold mb-3">1️⃣ CIF 계산 (과세가격)</h5>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>제품 가격 (${input.productCurrency}): ${this.formatForeignCurrency(calculation.productValue, input.productCurrency)}</div>
                            <div>제품 가격 (원): ${formatCurrency(calculation.productValueKRW)}</div>
                            <div>물류비 (${input.shippingCurrency}): ${this.formatForeignCurrency(input.shippingCost, input.shippingCurrency)}</div>
                            <div>물류비 (원): ${formatCurrency(calculation.shippingCostKRW)}</div>
                        </div>
                        <div class="border-t border-gray-600 mt-3 pt-3">
                            <div class="font-semibold">CIF 총액: ${formatCurrency(calculation.cifKRW)}</div>
                            <div class="text-xs text-gray-400 space-y-1">
                                ${input.productCurrency !== 'KRW' ? `<div>제품 환율: 1 ${input.productCurrency} = ${this.addCommas(result.productExchangeRate)}원</div>` : ''}
                                ${input.shippingCurrency !== 'KRW' ? `<div>물류 환율: 1 ${input.shippingCurrency} = ${this.addCommas(result.shippingExchangeRate)}원</div>` : ''}
                                <div class="text-amber-300 font-medium">📅 적용 환율 기준일: ${new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' })} (서울 시간)</div>
                            </div>
                        </div>
                    </div>

                    <!-- 세금 계산 -->
                    <div class="bg-gray-800/50 rounded-lg p-4">
                        <h5 class="font-semibold mb-3">2️⃣ 세금 계산</h5>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span>관세 (${(calculation.appliedTariffRate * 100).toFixed(2)}%)</span>
                                <span>${formatCurrency(calculation.tariffAmount)}</span>
                            </div>
                            ${calculation.needsCO ? `
                                <div class="flex justify-between">
                                    <span>C/O 발급비</span>
                                    <span>${formatCurrency(calculation.coCost)}</span>
                                </div>
                            ` : ''}
                            <div class="flex justify-between">
                                <span>부가세 (10%)</span>
                                <span>${formatCurrency(calculation.vatAmount)}</span>
                            </div>
                            <div class="text-xs text-gray-400">부가세 과세표준: ${formatCurrency(calculation.vatBase)}</div>
                        </div>
                    </div>

                    <!-- 기타 비용 -->
                    ${calculation.otherCosts > 0 ? `
                        <div class="bg-gray-800/50 rounded-lg p-4">
                            <h5 class="font-semibold mb-3">3️⃣ 기타 비용</h5>
                            <div class="flex justify-between text-sm">
                                <span>인증비, 수수료 등</span>
                                <span>${formatCurrency(calculation.otherCosts)}</span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- 최종 합계 -->
                    <div class="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
                        <h5 class="font-semibold mb-3">💎 최종 합계</h5>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <div class="text-2xl font-bold text-blue-400">${formatCurrency(calculation.totalCost)}</div>
                                <div class="text-sm text-gray-400">총 수입 비용</div>
                            </div>
                            <div>
                                <div class="text-xl font-bold text-green-400">${formatCurrency(calculation.costPerUnit)}</div>
                                <div class="text-sm text-gray-400">개당 부가세 포함 원가</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 비용 구성 분석 (자동 표시) ✅ -->
                <div class="bg-gray-800/50 rounded-lg p-4">
                    <h5 class="font-semibold mb-3">📈 비용 구성 분석</h5>
                    ${this.generateCostBreakdownChart(result)}
                </div>

                <!-- PDF 출력 버튼 추가 ✅ -->
                <div class="flex gap-3">
                    <button onclick="totalCostCalculator.exportToPDF()" class="btn-secondary flex-1">
                        📄 PDF 출력
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 결과 화면용 관세율 정보 HTML 생성 (3개 관세율 표시)
     */
    generateResultTariffHTML(result) {
        const { input, calculation, tariffInfo } = result;
        
        // 실시간 조회된 관세율 데이터가 있는 경우
        if (tariffInfo?.tariffData) {
            return this.generateTariffResultHTML(tariffInfo.tariffData, input.importCountry);
        }
        
        // 기본 관세율 정보만 있는 경우
        const alertClass = calculation.tariffType === 'DEFAULT' ? 'alert-warning' : 'alert-info';
        return `
            <div class="alert ${alertClass}">
                <h4 class="font-bold mb-2">📋 적용된 관세율 정보</h4>
                <div class="space-y-2">
                    <p><strong>${(calculation.appliedTariffRate * 100).toFixed(2)}%</strong> (${this.getTariffTypeName(calculation.tariffType)})</p>
                    ${input.importCountry ? `<p class="text-sm">🌍 수입 국가: ${this.getCountryName(input.importCountry)}</p>` : ''}
                    ${calculation.tariffType === 'DEFAULT' ? '<p class="text-sm text-amber-200 mt-1">⚠️ HS Code 또는 수입국가 미입력으로 기본 관세율 적용</p>' : ''}
                </div>
            </div>
        `;
    }

    /**
     * 수입 요건 표시
     */
    displayRequirements(requirements) {
        const requirementSection = document.getElementById('requirementSection');
        const requirementResults = document.getElementById('requirementResults');
        
        if (!requirementSection || !requirementResults) return;

        // 수입요건이 있을 때만 표시
        if (requirements.length === 0 && (!requirements.data || requirements.data.requirements.length === 0)) {
            requirementSection.classList.add('hidden');
            return;
        }
        
        requirementSection.classList.remove('hidden');

        // data 속성이 있는 경우 (API 응답 형식)
        if (requirements.data) {
            const reqData = requirements.data;
            const totalCount = reqData.totalCount || 0;
            requirements = reqData.requirements || [];
            
            }

        requirementResults.innerHTML = `
            <div class="space-y-4">
                ${requirements.map(req => `
                    <div class="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
                        <h4 class="font-bold text-amber-300 mb-2">${req.lawName || req.name || req.requirementType || '수입요건'}</h4>
                        ${req.requirementDoc ? `<p class="text-sm mb-2"><strong>필요 서류:</strong> ${req.requirementDoc}</p>` : ''}
                        ${req.description ? `<p class="text-sm text-gray-300 mb-2">${req.description}</p>` : ''}
                        
                        <div class="text-xs text-gray-400 space-y-1">
                            ${req.agency ? `<p><strong>인증 가능 기관:</strong> ${req.agency}</p>` : ''}
                            ${req.agencies && Array.isArray(req.agencies) && req.agencies.length > 0 ? 
                                `<div class="mt-2 ml-4 space-y-1">
                                    ${req.agencies.map(a => `<p>• ${a.name || a} ${a.code ? `(${a.code})` : ''}</p>`).join('')}
                                </div>` : ''}
                            ${req.validUntil || req.endDate ? `<p><strong>유효기간:</strong> ${req.validUntil || req.endDate}까지</p>` : ''}
                            ${req.validFrom || req.startDate ? `<p><strong>시행일:</strong> ${req.validFrom || req.startDate}부터</p>` : ''}
                            ${req.contact ? `<p><strong>연락처:</strong> ${req.contact}</p>` : ''}

                        </div>
                    </div>
                `).join('')}
                
                <div class="alert alert-warning">
                    <h5 class="font-bold mb-2">⚠️ 중요 안내</h5>
                    <div class="text-sm space-y-2">
                        <p><strong>인증 비용:</strong> 위 요건들을 충족하기 위한 인증/시험 비용이 추가로 발생합니다.</p>
                        <p><strong>소요 시간:</strong> 인증 절차는 보통 2-8주 정도 소요됩니다.</p>
                        <p><strong>비용 예상:</strong></p>
                        <ul class="list-disc list-inside ml-4 space-y-1">
                            <li>KC 안전인증: 약 100-300만원</li>
                            <li>전파인증: 약 50-150만원</li>
                            <li>식품 안전확인: 약 30-100만원</li>
                        </ul>
                        <p class="text-amber-200 font-medium">💡 정확한 비용은 관련 기관에 문의하여 '기타 비용' 항목에 추가해주세요.</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 관세율 타입명 반환
     */
    getTariffTypeName(tariffType) {
        const typeNames = {
            'DEFAULT': '기본 관세율',
            'WTO': 'WTO 관세율',
            'FTA': 'FTA 특혜관세율',
            'PREFERENTIAL': '특혜관세율'
        };
        
        return typeNames[tariffType] || '알 수 없음';
    }

    /**
     * 국가명 반환
     */
    getCountryName(countryCode) {
        const countryNames = {
            'CN': '중국',
            'US': '미국',
            'JP': '일본',
            'DE': '독일',
            'VN': '베트남',
            'TH': '태국',
            'IN': '인도',
            'MY': '말레이시아',
            'SG': '싱가포르',
            'OTHER': '기타'
        };
        
        return countryNames[countryCode] || countryCode;
    }

    /**
     * 외화 포맷팅
     */
    formatForeignCurrency(amount, currency) {
        const symbols = {
            USD: '$',
            CNY: '¥',
            KRW: '₩'
        };
        
        const symbol = symbols[currency] || currency;
        const decimals = currency === 'KRW' ? 0 : 2; // 원화는 소수점 없이
        return `${symbol} ${formatNumber(amount, decimals)}`;
    }

    /**
     * 비용 구성 분석 생성
     */
    generateCostBreakdownChart(result) {
        const { breakdown } = result;
        
        const total = breakdown.productCost + breakdown.shippingCost + 
                     breakdown.tariffCost + breakdown.coCost + 
                     breakdown.vatCost + breakdown.otherCosts;

        const chartData = [
            { label: '제품 비용', value: breakdown.productCost, color: '#3B82F6' },
            { label: '운송비', value: breakdown.shippingCost, color: '#10B981' },
            { label: '관세', value: breakdown.tariffCost, color: '#F59E0B' },
            { label: '부가세', value: breakdown.vatCost, color: '#EF4444' },
            { label: 'C/O 비용', value: breakdown.coCost, color: '#8B5CF6' },
            { label: '기타 비용', value: breakdown.otherCosts, color: '#6B7280' }
        ].filter(item => item.value > 0);

        let chartHtml = '<div class="space-y-3">';
        chartData.forEach(item => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            chartHtml += `
                <div class="flex items-center space-x-3">
                    <div class="w-4 h-4 rounded" style="background-color: ${item.color}"></div>
                    <div class="flex-1 flex justify-between">
                        <span class="text-sm">${item.label}</span>
                        <span class="text-sm font-medium">${formatCurrency(item.value)} (${percentage}%)</span>
                    </div>
                </div>
            `;
        });
        chartHtml += '</div>';

        return chartHtml;
    }

    /**
     * PDF 출력 기능 - HTML을 이미지로 변환하여 PDF 생성 ✅
     */
    async exportToPDF() {
        if (!this.lastCalculationResult) {
            showAlert('계산 결과가 없습니다.', 'warning');
            return;
        }

        try {
            showAlert('📥 PDF 생성 중입니다...', 'info');
            
            // PDF 생성을 위한 HTML 컨텐츠 생성
            const result = this.lastCalculationResult;
            const { input, calculation, breakdown, requirementsInfo } = result;
            
            // 문서번호 생성 (연도-월-일-시분초)
            const now = new Date();
            const docNumber = `DT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            
            // PDF용 HTML 생성
            const pdfContent = document.createElement('div');
            pdfContent.style.cssText = 'position: absolute; left: -9999px; width: 800px; background: white; padding: 40px; font-family: Arial, sans-serif;';
            
            pdfContent.innerHTML = `
                <div style="border: 2px solid #e5e7eb; padding: 40px;">
                    <!-- 헤더 -->
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px;">
                        <div>
                            <img src="/images/og-image.jpg" style="width: 80px; height: 80px;">
                        </div>
                        <div style="text-align: center; flex: 1;">
                            <h1 style="color: #1e40af; margin: 0 0 10px 0; font-size: 28px;">통합 무역 비용 계산서</h1>
                            <p style="color: #6b7280; margin: 0; font-size: 16px;">INTEGRATED TRADE COST CALCULATION</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="color: #374151; margin: 0; font-size: 12px;">문서번호</p>
                            <p style="color: #1e40af; margin: 0; font-weight: bold;">${docNumber}</p>
                        </div>
                    </div>
                    
                    <!-- 발행 정보 -->
                    <div style="background: #f9fafb; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                        <table style="width: 100%; font-size: 14px;">
                            <tr>
                                <td style="width: 100px; color: #6b7280;">발행일자</td>
                                <td style="font-weight: bold;">${now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                <td style="width: 100px; color: #6b7280;">발행처</td>
                                <td style="font-weight: bold;">두리무역</td>
                            </tr>
                            <tr>
                                <td style="color: #6b7280;">담당자</td>
                                <td style="font-weight: bold;">시스템 자동발행</td>
                                <td style="color: #6b7280;">연락처</td>
                                <td style="font-weight: bold;">031-699-8781</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- 입력 정보 섹션 -->
                    <div style="margin-bottom: 20px;">
                        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">1. 입력 정보</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; border: 1px solid #e5e7eb; width: 30%;">제품 단가</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${this.formatForeignCurrency(input.unitPrice, input.productCurrency)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">수량</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatNumber(input.quantity)}개</td>
                            </tr>
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">총 물류비</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${this.formatForeignCurrency(input.shippingCost, input.shippingCurrency)}</td>
                            </tr>
                            ${input.hsCode ? `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">HS Code</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${input.hsCode}</td>
                            </tr>` : ''}
                            ${input.importCountry ? `
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">수입 국가</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${this.getCountryName(input.importCountry)}</td>
                            </tr>` : ''}
                            ${input.otherCosts > 0 ? `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">기타 비용</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(input.otherCosts)}</td>
                            </tr>` : ''}
                        </table>
                    </div>
                    
                    <!-- 계산 결과 섹션 -->
                    <div style="margin-bottom: 20px;">
                        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">2. 세부 계산 내역</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; border: 1px solid #e5e7eb; width: 30%;">제품 비용 (원화 환산)</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(breakdown.productCost)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">물류비 (원화 환산)</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(breakdown.shippingCost)}</td>
                            </tr>
                            <tr style="background: #fef3c7;">
                                <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">CIF (과세가격)</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(calculation.cifKRW)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">적용 관세율</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${(calculation.appliedTariffRate * 100).toFixed(2)}% (${this.getTariffTypeName(calculation.tariffType)})</td>
                            </tr>
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">관세액</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(calculation.tariffAmount)}</td>
                            </tr>
                            ${calculation.coCost > 0 ? `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">C/O 발급비</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(calculation.coCost)}</td>
                            </tr>` : ''}
                            <tr style="background: #f9fafb;">
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">부가세 과세표준</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${formatCurrency(calculation.vatBase)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e5e7eb;">부가세액 (10%)</td>
                                <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(calculation.vatAmount)}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <!-- 최종 합계 섹션 -->
                    <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="color: white; font-size: 18px; margin-bottom: 15px;">3. 최종 계산 결과</h2>
                        <div style="display: flex; justify-content: space-around;">
                            <div style="text-align: center;">
                                <p style="margin: 0; opacity: 0.9;">총 수입 비용</p>
                                <p style="font-size: 32px; font-weight: bold; margin: 5px 0;">${formatCurrency(calculation.totalCost)}</p>
                            </div>
                            <div style="text-align: center;">
                                <p style="margin: 0; opacity: 0.9;">개당 원가 (부가세 포함)</p>
                                <p style="font-size: 32px; font-weight: bold; margin: 5px 0;">${formatCurrency(calculation.costPerUnit)}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${requirementsInfo && requirementsInfo.length > 0 ? `
                    <!-- 세관장 확인 사항 -->
                    <div style="margin-bottom: 20px;">
                        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #e5e7eb;">4. 세관장 확인 사항 (수입요건)</h2>
                        <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
                            ${requirementsInfo.map((req, index) => `
                            <div style="${index > 0 ? 'margin-top: 15px; padding-top: 15px; border-top: 1px solid #fde68a;' : ''}">
                                <h3 style="color: #92400e; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">${req.lawName || req.name || req.requirementType || '수입요건'}</h3>
                                ${req.requirementDoc ? `<p style="margin: 5px 0; font-size: 12px;"><strong>필요 서류:</strong> ${req.requirementDoc}</p>` : ''}
                                ${req.description ? `<p style="margin: 5px 0; font-size: 12px; color: #6b7280;">${req.description}</p>` : ''}
                                
                                <div class="text-xs text-gray-400 space-y-1">
                                    ${req.agency ? `<p><strong>인증 가능 기관:</strong> ${req.agency}</p>` : ''}
                                    ${req.agencies && Array.isArray(req.agencies) && req.agencies.length > 0 ? 
                                        `<div class="mt-2 ml-4 space-y-1">
                                        ${req.agencies.map(a => `<p style="margin: 2px 0;">• ${a.name || a} ${a.code ? `(${a.code})` : ''}</p>`).join('')}
                                    </div>` : ''}
                                    ${req.validUntil || req.endDate ? `<p style="margin: 5px 0; font-size: 11px; color: #9ca3af;"><strong>유효기간:</strong> ${req.validUntil || req.endDate}까지</p>` : ''}
                                    ${req.validFrom || req.startDate ? `<p style="margin: 5px 0; font-size: 11px; color: #9ca3af;"><strong>시행일:</strong> ${req.validFrom || req.startDate}부터</p>` : ''}
                                    ${req.contact ? `<p><strong>연락처:</strong> ${req.contact}</p>` : ''}

                                </div>
                            </div>
                            `).join('')}
                            
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fde68a;">
                                <p style="color: #92400e; font-size: 12px; font-weight: bold; margin: 0;">⚠️ 중요 안내</p>
                                <ul style="margin: 5px 0 0 20px; padding: 0; font-size: 11px; color: #92400e;">
                                    <li>위 요건들을 충족하기 위한 인증/시험 비용이 추가로 발생합니다.</li>
                                    <li>인증 절차는 보통 2-8주 정도 소요됩니다.</li>
                                    <li>정확한 비용은 관련 기관에 문의하시기 바랍니다.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- 참고사항 -->
                    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #374151; font-size: 14px; margin-bottom: 10px;">※ 참고사항</h3>
                        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #6b7280;">
                            <li>환율은 계산 시점의 실시간 환율이 적용되었습니다.</li>
                            <li>관세율은 HS Code와 수입국가에 따라 자동 조회되었습니다.</li>
                            <li>부가세는 (제품비용 + 물류비 + 관세 + 기타비용)의 10%로 계산되었습니다.</li>
                            <li>실제 수입 시 추가 비용이 발생할 수 있으니 참고용으로만 활용하시기 바랍니다.</li>
                        </ul>
                    </div>
                    
                    <!-- 푸터 -->
                    <div style="text-align: center; border-top: 2px solid #e5e7eb; padding-top: 20px;">
                        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 10px;">본 문서는 두리무역의 통합 무역 계산서로 산정되었습니다.</p>
                        <p style="color: #1e40af; font-weight: bold; font-size: 16px; margin-bottom: 5px;">중국 출장검품 전문 - 두리무역</p>
                        <p style="color: #6b7280; font-size: 14px;">전화: 031-699-8781 | 이메일: duly@duly.co.kr | 홈페이지: https://www.duly.co.kr</p>
                    </div>
                </div>
            `;
            
            document.body.appendChild(pdfContent);
            
            // 이미지가 로드될 때까지 대기
            await new Promise(resolve => {
                const img = pdfContent.querySelector('img');
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve;
                }
            });
            
            // html2canvas와 jsPDF 라이브러리 로드
            if (!window.html2canvas) {
                const script1 = document.createElement('script');
                script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                document.head.appendChild(script1);
                await new Promise((resolve) => {
                    script1.onload = resolve;
                });
            }
            
            if (!window.jsPDF) {
                const script2 = document.createElement('script');
                script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                document.head.appendChild(script2);
                await new Promise((resolve) => {
                    script2.onload = resolve;
                });
            }
            
            // HTML을 캔버스로 변환
            const canvas = await html2canvas(pdfContent, {
                scale: 2,
                useCORS: true,
                logging: false
            });
            
            // PDF 생성
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
            
            // PDF 저장
            pdf.save(`총비용계산서_${new Date().toISOString().split('T')[0]}.pdf`);
            
            // 임시 요소 제거
            document.body.removeChild(pdfContent);
            
            showAlert('✅ PDF 파일이 저장되었습니다!', 'success');
            
        } catch (error) {
            showAlert('❌ PDF 생성 중 오류가 발생했습니다.', 'error');
        }
    }

    // CSV 내보내기 기능 제거됨 (PDF 출력 기능으로 대체)

    /**
     * 현재 입력값 저장
     */
    saveCurrentInput() {
        try {
            const input = this.collectInput();
            localStorage.setItem('lastCostInput', JSON.stringify(input));
        } catch (error) {
            }
    }

    /**
     * 마지막 입력값 로드
     */
    loadLastInput() {
        try {
            const saved = localStorage.getItem('lastCostInput');
            if (saved) {
                const input = JSON.parse(saved);
                this.populateInputs(input);
            }
        } catch (error) {
            }
    }

    /**
     * 입력값 폼에 채우기
     */
    populateInputs(input) {
        const setValueIfExists = (id, value) => {
            const element = document.getElementById(id);
            if (element && value !== undefined && value !== null) {
                element.value = value;
            }
        };

        setValueIfExists('unitPrice', input.unitPrice);
        setValueIfExists('quantity', input.quantity);
        setValueIfExists('productCurrency', input.productCurrency || input.currency); // 기존 호환성
        setValueIfExists('shippingCost', input.shippingCost);
        setValueIfExists('shippingCurrency', input.shippingCurrency || input.currency); // 기존 호환성
        setValueIfExists('importCountry', input.importCountry);
        setValueIfExists('hsCode', input.hsCode);
        setValueIfExists('otherCosts', input.otherCosts);
    }

    /**
     * 디버그 정보 출력
     */
    debugInfo() {
        
        }
}

// 총 비용 계산기 인스턴스 생성
const totalCostCalculator = new TotalCostCalculator();

// 전역에서 사용할 수 있도록 설정
window.totalCostCalculator = totalCostCalculator;