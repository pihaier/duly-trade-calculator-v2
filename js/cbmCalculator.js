/**
 * 📦 CBM 계산기 모듈
 * 
 * 박스 정보 입력, 팔레트 설정, 적재 최적화 계산,
 * Three.js 기반 3D 시뮬레이션을 담당합니다.
 */

class CBMCalculator {
    constructor() {
        // 컨테이너 규격 (내부 치수 기준, cm)
        this.containers = {
            '20ft': { 
                name: '20ft GP (General Purpose)',
                length: 589,   // 5.9m
                width: 235,    // 2.35m
                height: 239,   // 2.39m
                cbm: 33.2,
                maxWeight: 17500 // 국내 제한 17.5톤
            },
            '40ft': { 
                name: '40ft GP (General Purpose)',
                length: 1203,  // 12.0m
                width: 235,    // 2.35m
                height: 239,   // 2.39m
                cbm: 67.7,
                maxWeight: 20000 // 국내 제한 20톤
            },
            '40hc': { 
                name: '40ft HC (High-Cube)',
                length: 1203,  // 12.0m
                width: 235,    // 2.35m
                height: 270,   // 2.70m (HC는 270cm)
                cbm: 76.4,
                maxWeight: 22000 // 국내 제한 22톤
            }
        };

        // 3D 관련 변수
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentView = 'pallet';
        this.lastCalculationResult = null;

        this.init();
    }

    /**
     * 초기화
     */
    init() {
        this.initEventListeners();
        this.init3DViewer();
        this.loadLastInput();
        
        }

    /**
     * 이벤트 리스너 초기화
     */
    initEventListeners() {
        // 계산 버튼
        const calculateBtn = document.getElementById('calculateCBM');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateCBM());
        }

        // 최대치 계산 버튼
        // 컨테이너별 최대 적재 단수 계산 버튼들
        const calculateMax20ftBtn = document.getElementById('calculateMax20ft');
        const calculateMax40ftBtn = document.getElementById('calculateMax40ft');
        const calculateMax40hcBtn = document.getElementById('calculateMax40hc');
        
        if (calculateMax20ftBtn) {
            calculateMax20ftBtn.addEventListener('click', () => this.calculateMaxLayers('20ft'));
        }
        if (calculateMax40ftBtn) {
            calculateMax40ftBtn.addEventListener('click', () => this.calculateMaxLayers('40ft'));
        }
        if (calculateMax40hcBtn) {
            calculateMax40hcBtn.addEventListener('click', () => this.calculateMaxLayers('40hc'));
        }

        // 3D 뷰 전환 버튼들
        this.init3DViewButtons();

        // 입력값 변경 시 자동 저장
        this.initAutoSave();
    }

    /**
     * 3D 뷰 버튼 초기화
     */
    init3DViewButtons() {
        const viewButtons = {
            'viewPallet': 'pallet',
            'view20ft': '20ft',
            'view40ft': '40ft', 
            'view40hc': '40hc'
        };

        Object.entries(viewButtons).forEach(([buttonId, view]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => this.switch3DView(view));
            }
        });
    }

    /**
     * 자동 저장 초기화
     */
    initAutoSave() {
        const inputs = [
            'boxLength', 'boxWidth', 'boxHeight', 'boxWeight',
            'totalQuantity', 'usePallet',
            'palletLength', 'palletWidth', 'palletHeight', 'palletLayers'
        ];

        inputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => this.saveCurrentInput());
            }
        });
    }

    /**
     * CBM 계산 실행
     */
    async calculateCBM() {
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

            // 계산 수행
            const result = this.performCalculation(input);
            
            // 결과 표시
            this.displayResults(result);
            
            // 3D 시뮬레이션 활성화
            this.enable3DSimulation(result);
            
            // 계산 결과 저장
            this.lastCalculationResult = result;
            
            // CBM 계산 완료 후 중간 광고 표시
            this.showMiddleAd();
            
            showAlert('✅ CBM 계산이 완료되었습니다!', 'success');

        } catch (error) {
            showAlert(`❌ 계산 오류: ${error.message}`, 'error');
        } finally {
            this.hideCalculationLoading();
        }
    }

    /**
     * 계산 로딩 표시
     */
    showCalculationLoading() {
        const loadingHtml = `
            <div id="calculationLoading" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                <div class="bg-white rounded-2xl p-8 text-center max-w-md mx-4 shadow-2xl">
                    <div class="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">CBM 계산 중...</h3>
                    <p class="text-gray-600 mb-4">정확한 계산을 위해 잠시만 기다려주세요</p>
                    
                    <!-- 광고 컨텐츠 -->
                    <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                        <h4 class="text-sm font-bold text-blue-800 mb-1">💡 알고 계셨나요?</h4>
                        <p class="text-xs text-gray-700 mb-2">
                            CBM 계산 후 가장 중요한 것은 <strong>품질 관리</strong>입니다!
                        </p>
                        <p class="text-xs text-blue-600 font-semibold">
                            <a href="https://www.duly.co.kr/" target="_blank" rel="noopener noreferrer" class="hover:underline">
                                두리무역의 8년 경력 검품 전문가 → 자세히 보기
                            </a>
                        </p>
                    </div>
                    
                    <div class="mt-4">
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div id="loadingProgress" class="bg-blue-600 h-2 rounded-full transition-all duration-1000" style="width: 0%"></div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">계산 진행률: <span id="progressText">0%</span></p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
        
        // 진행률 애니메이션 (성능 최적화)
        const progressBar = document.getElementById('loadingProgress');
        const progressText = document.getElementById('progressText');
        
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
        const loading = document.getElementById('calculationLoading');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * 중간 광고 표시 (CBM 계산 완료 후)
     */
    showMiddleAd() {
        const middleAd = document.getElementById('middleAdBanner');
        if (middleAd) {
            middleAd.classList.remove('hidden');
            // 자동 스크롤 제거 - 사용자가 원하는 위치에 머물도록 함
        }
    }

    /**
     * 입력값 수집
     */
    collectInput() {
        return {
            box: {
                length: parseFloat(document.getElementById('boxLength').value) || 0,
                width: parseFloat(document.getElementById('boxWidth').value) || 0,
                height: parseFloat(document.getElementById('boxHeight').value) || 0,
                weight: parseFloat(document.getElementById('boxWeight').value) || 0
            },
            totalQuantity: parseInt(document.getElementById('totalQuantity').value) || 0,

            usePallet: document.getElementById('usePallet').checked,
            pallet: {
                length: parseFloat(document.getElementById('palletLength').value) || 110,
                width: parseFloat(document.getElementById('palletWidth').value) || 110,
                height: parseFloat(document.getElementById('palletHeight').value) || 15,
                layers: parseInt(document.getElementById('palletLayers').value) || 1
            }
        };
    }

    /**
     * 입력값 검증 - 친절한 안내 메시지 포함 ✅
     */
    validateInput(input) {
        const { box, totalQuantity, usePallet, pallet } = input;

        // 🔍 박스 길이 검증
        if (box.length <= 0) {
            return { 
                valid: false, 
                message: '📏 박스 길이를 입력해주세요!\n\n📝 예시:\n• 작은 박스: 20cm\n• 일반 박스: 30cm\n• 큰 박스: 50cm\n\n💡 팁: 제품 포장 후 실제 박스 크기를 측정하세요.' 
            };
        }

        // 🔍 박스 너비 검증
        if (box.width <= 0) {
            return { 
                valid: false, 
                message: '📏 박스 너비를 입력해주세요!\n\n📝 예시:\n• 작은 박스: 15cm\n• 일반 박스: 25cm\n• 큰 박스: 40cm\n\n💡 팁: 가장 넓은 부분을 측정하세요.' 
            };
        }

        // 🔍 박스 높이 검증
        if (box.height <= 0) {
            return { 
                valid: false, 
                message: '📏 박스 높이를 입력해주세요!\n\n📝 예시:\n• 얇은 박스: 5cm\n• 일반 박스: 15cm\n• 높은 박스: 30cm\n\n💡 팁: 포장재 두께도 포함해서 측정하세요.' 
            };
        }

        // 🔍 총 수량 검증
        if (totalQuantity <= 0) {
            return { 
                valid: false, 
                message: '📦 총 박스 수량을 입력해주세요!\n\n📝 예시:\n• 샘플 주문: 10박스\n• 소량 주문: 100박스\n• 대량 주문: 1,000박스\n\n💡 팁: 전체 주문량 ÷ 박스당 개수 = 총 박스 수' 
            };
        }

        // 🔍 박스 무게 검증
        if (box.weight <= 0) {
            return { 
                valid: false, 
                message: '⚖️ 박스 무게를 입력해주세요!\n\n📝 예시:\n• 전자제품: 2~5kg\n• 의류: 1~3kg\n• 기계부품: 5~15kg\n\n💡 팁: 제품 + 포장재 무게를 모두 포함하세요.' 
            };
        }

        // 🔍 박스 크기 합리성 검증
        const boxCBM = this.calculateBoxCBM(box);
        if (boxCBM > 0.5) {
            return { 
                valid: false, 
                message: '📦 박스가 너무 큽니다! (현재: ' + boxCBM.toFixed(3) + 'CBM)\n\n📝 일반적인 박스 크기:\n• 소형: 0.01~0.05 CBM\n• 중형: 0.05~0.2 CBM\n• 대형: 0.2~0.5 CBM\n\n💡 박스 크기를 다시 확인해주세요.' 
            };
        }

        // 🔍 박스 무게 합리성 검증
        if (box.weight > 50) {
            return { 
                valid: false, 
                message: '⚖️ 박스가 너무 무겁습니다! (현재: ' + box.weight + 'kg)\n\n📝 일반적인 박스 무게:\n• 경량: 1~5kg\n• 중량: 5~20kg\n• 중량급: 20~30kg\n\n💡 30kg 이상은 포크리프트가 필요합니다.' 
            };
        }

        // 🔍 팔레트 사용 시 추가 검증
        if (usePallet) {
            if (pallet.layers <= 0) {
                return { 
                    valid: false, 
                    message: '📚 팔레트 적재 단수를 입력해주세요!\n\n📝 일반적인 적재 단수:\n• 가벼운 제품: 8~12단\n• 일반 제품: 4~8단\n• 무거운 제품: 2~4단\n\n💡 팁: 박스 무게 × 단수가 200kg을 넘지 않도록 하세요.' 
                };
            }

            // 팔레트 무게 제한 확인
            const palletWeight = box.weight * (pallet.layers * Math.floor(110/box.length) * Math.floor(110/box.width));
            if (palletWeight > 1000) {
                return { 
                    valid: false, 
                    message: '⚖️ 팔레트가 너무 무겁습니다! (예상: ' + Math.round(palletWeight) + 'kg)\n\n📝 팔레트 무게 제한:\n• 일반 팔레트: 1,000kg\n• 중량 팔레트: 1,500kg\n\n💡 적재 단수를 줄이거나 박스 무게를 확인하세요.' 
                };
            }

            // 높이 제한 확인
            const totalHeight = pallet.height + (pallet.layers * box.height);
            if (totalHeight > 240) {
                return { 
                    valid: false, 
                    message: '📏 팔레트 높이가 너무 높습니다! (현재: ' + totalHeight + 'cm)\n\n📝 높이 제한:\n• 일반 창고: 240cm\n• 컨테이너: 239cm (20ft/40ft GP)\n• 고큐브: 270cm (40ft HC)\n\n💡 적재 단수를 ' + Math.floor((240-pallet.height)/box.height) + '단으로 줄이세요.' 
                };
            }
        }

        // 🔍 총 CBM 합리성 검증 - 제한 제거, 안내만 제공 ✅
        const totalCBM = totalQuantity * boxCBM;
        if (totalCBM > 100) {
            // 경고 메시지만 표시하고 계산은 계속 진행
            showAlert(`📦 대용량 CBM 안내 (현재: ${totalCBM.toFixed(1)} CBM)\n\n📝 컨테이너 용량 참고:\n• 20ft GP: 33 CBM\n• 40ft GP: 67 CBM\n• 40ft HC: 76 CBM\n\n💡 여러 컨테이너가 필요할 수 있습니다. 계산을 계속 진행합니다.`, 'warning', 8000);
        }

        return { valid: true };
    }

    /**
     * 계산 수행
     */
    performCalculation(input) {
        const result = {
            input,
            boxCBM: this.calculateBoxCBM(input.box),
            optimizedLayout: this.optimizeLayout(input),
            containerResults: {},
            recommendation: null
        };

        // 각 컨테이너별 계산
        Object.entries(this.containers).forEach(([containerType, containerSpec]) => {
            result.containerResults[containerType] = this.calculateContainerResult(
                input, containerSpec, result.optimizedLayout, containerType
            );
        });

        // 최적 컨테이너 추천
        result.recommendation = this.generateRecommendation(input, result.containerResults);

        return result;
    }

    /**
     * 박스 CBM 계산
     */
    calculateBoxCBM(box) {
        return (box.length * box.width * box.height) / 1000000; // cm³ to m³
    }

    /**
     * 레이아웃 최적화
     */
    optimizeLayout(input) {
        const { box, pallet, usePallet } = input;
        
        if (usePallet) {
            return this.optimizePalletLayout(box, pallet);
        } else {
            return this.optimizeDirectLayout(box);
        }
    }

    /**
     * 팔레트 레이아웃 최적화
     */
    optimizePalletLayout(box, pallet) {
        // 박스의 가로/세로 방향별 적재 수량 계산
        const orientations = [
            { boxL: box.length, boxW: box.width, name: '정방향' },
            { boxL: box.width, boxW: box.length, name: '90도 회전' }
        ];

        let bestOrientation = null;
        let maxBoxesPerLayer = 0;

        orientations.forEach(orientation => {
            const boxesX = Math.floor(pallet.length / orientation.boxL);
            const boxesY = Math.floor(pallet.width / orientation.boxW);
            const boxesPerLayer = boxesX * boxesY;

            if (boxesPerLayer > maxBoxesPerLayer) {
                maxBoxesPerLayer = boxesPerLayer;
                bestOrientation = {
                    ...orientation,
                    boxesX,
                    boxesY,
                    boxesPerLayer
                };
            }
        });

        // 최대 적재 단수 계산
        const actualLayers = pallet.layers;
        const actualBoxesPerPallet = maxBoxesPerLayer * actualLayers;

        return {
            type: 'pallet',
            orientation: bestOrientation,
            boxesPerLayer: maxBoxesPerLayer,
            maxLayers: actualLayers,
            boxesPerPallet: actualBoxesPerPallet,
            dimensions: {
                length: pallet.length,
                width: pallet.width,
                height: pallet.height + (actualLayers * box.height)
            }
        };
    }

    /**
     * 직접 적재 레이아웃 최적화
     */
    optimizeDirectLayout(box) {
        return {
            type: 'direct',
            orientation: { boxL: box.length, boxW: box.width, name: '정방향' },
            boxesPerLayer: 1,
            maxLayers: 1,
            boxesPerPallet: 1,
            dimensions: box
        };
    }

    /**
     * 컨테이너별 계산 결과
     */
    calculateContainerResult(input, containerSpec, layout, containerType) {
        const { totalQuantity, box } = input;
        
        let boxesInContainer = 0;
        let efficiency = 0;
        let bestLayout = null;

        if (layout.type === 'pallet') {
            // 팔레트 기반 계산 - 컨테이너별 최적 단수 계산
            const palletsX = Math.floor(containerSpec.length / input.pallet.length);
            const palletsY = Math.floor(containerSpec.width / input.pallet.width);
            
            // 컨테이너별 최적 단수 계산
            const maxLayersForContainer = Math.floor((containerSpec.height - input.pallet.height) / box.height);
            const actualLayers = Math.min(maxLayersForContainer, input.pallet.layers);
            
            // 팔레트당 박스 수 (컨테이너별 최적 단수 적용)
            const boxesPerLayer = layout.orientation.boxesX * layout.orientation.boxesY;
            const boxesPerPallet = boxesPerLayer * actualLayers;
            
            // 팔레트 높이 (컨테이너별 최적 단수 적용)
            const palletTotalHeight = input.pallet.height + (actualLayers * box.height);
            const palletsZ = Math.floor(containerSpec.height / palletTotalHeight);
            
            const palletsPerContainer = palletsX * palletsY * palletsZ;
            boxesInContainer = palletsPerContainer * boxesPerPallet;
            
            // 팔레트 전체 부피 계산
            const usedVolume = palletsPerContainer * (
                input.pallet.length * input.pallet.width * palletTotalHeight
            ) / 1000000; // cm³ to m³
            
            efficiency = (usedVolume / containerSpec.cbm) * 100;
            bestLayout = {
                boxesX: layout.orientation.boxesX,
                boxesY: layout.orientation.boxesY,
                boxesZ: actualLayers, // 컨테이너별 최적 단수
                rotated: layout.orientation.name === '90도 회전'
            };
        } else {
            // 직접 적재 계산 - 박스 회전 최적화
            const orientations = [
                { boxL: box.length, boxW: box.width, rotated: false, name: '정방향' },
                { boxL: box.width, boxW: box.length, rotated: true, name: '90도 회전' }
            ];

            let maxBoxes = 0;
            orientations.forEach(orientation => {
                const boxesX = Math.floor(containerSpec.length / orientation.boxL);
                const boxesY = Math.floor(containerSpec.width / orientation.boxW);
                let boxesZ = Math.floor(containerSpec.height / box.height);
                
                // 하중 제한 제거 - 높이만 고려
                
                const totalBoxes = boxesX * boxesY * boxesZ;
                if (totalBoxes > maxBoxes) {
                    maxBoxes = totalBoxes;
                    bestLayout = {
                        boxesX,
                        boxesY,
                        boxesZ,
                        rotated: orientation.rotated
                    };
                }
            });
            
            boxesInContainer = maxBoxes;
            const actualBoxes = Math.min(totalQuantity, boxesInContainer);
            const usedVolume = actualBoxes * this.calculateBoxCBM(box);
            efficiency = (usedVolume / containerSpec.cbm) * 100;
        }

        // 컨테이너 무게 제한 확인
        const totalBoxWeight = boxesInContainer * box.weight;
        const weightLimited = totalBoxWeight > containerSpec.maxWeight;
        
        if (weightLimited) {
            // 무게 제한으로 인해 박스 수 조정
            const maxBoxesByWeight = Math.floor(containerSpec.maxWeight / box.weight);
            boxesInContainer = Math.min(boxesInContainer, maxBoxesByWeight);
            
            // 효율성 재계산 (무게 제한 적용 후)
            const actualBoxes = Math.min(totalQuantity, boxesInContainer);
            const usedVolume = actualBoxes * this.calculateBoxCBM(box);
            efficiency = (usedVolume / containerSpec.cbm) * 100;
        }

        // 컨테이너 수 계산
        const containersNeeded = Math.ceil(totalQuantity / boxesInContainer);
        const remainingBoxes = totalQuantity % boxesInContainer;

        return {
            containerType,
            boxesPerContainer: boxesInContainer,
            containersNeeded,
            remainingBoxes,
            efficiency: Math.round(efficiency * 100) / 100,
            layout: bestLayout,
            weightLimited: weightLimited,
            maxWeight: containerSpec.maxWeight
        };
    }

    /**
     * 최적 컨테이너 추천 (박스 수량 기준 + CBM 나머지 처리)
     */
    generateRecommendation(input, containerResults) {
        const boxCBM = this.calculateBoxCBM(input.box);
        const totalQuantity = input.totalQuantity;
        const totalCBM = totalQuantity * boxCBM;
        
        // 각 컨테이너의 박스 수용량 가져오기
        const container20ft = containerResults['20ft'];
        const container40ft = containerResults['40ft'];
        const container40hc = containerResults['40hc'];
        
        let bestRecommendation = null;
        
        // 컨테이너 이름 간소화 함수
        const getSimpleContainerName = (type) => {
            const nameMap = {
                '20ft': '20ft GP',
                '40ft': '40ft GP', 
                '40hc': '40ft HG'
            };
            return nameMap[type] || type;
        };
        
        // 박스 수량 기준으로 컨테이너 선택
        if (totalQuantity >= container20ft.boxesPerContainer * 0.6) {
            // 20ft GP 60% 이상
            
            if (totalQuantity <= container20ft.boxesPerContainer) {
                // 20ft 1개로 충분
                if (totalCBM >= 15 || container20ft.efficiency >= 70) {
                    bestRecommendation = {
                        containerType: '20ft',
                        shippingMethod: `${getSimpleContainerName('20ft')} * 1개 FCL`,
                        reason: totalCBM >= 15 ? 
                            `총 CBM ${Math.round(totalCBM * 10) / 10} ≥ 15이므로 FCL 권장` : 
                            `컨테이너 효율 ${Math.round(container20ft.efficiency)}% ≥ 70%이므로 FCL 권장`,
                        efficiency: container20ft.efficiency,
                        containersNeeded: 1,
                        boxesPerContainer: container20ft.boxesPerContainer,
                        remainingBoxes: 0
                    };
                } else {
                    bestRecommendation = {
                        containerType: '20ft',
                        shippingMethod: 'LCL',
                        reason: `총 CBM ${Math.round(totalCBM * 10) / 10} < 15이고 효율 ${Math.round(container20ft.efficiency)}% < 70%`,
                        efficiency: container20ft.efficiency,
                        containersNeeded: 1,
                        boxesPerContainer: container20ft.boxesPerContainer,
                        remainingBoxes: 0
                    };
                }
            } else if (totalQuantity <= container40ft.boxesPerContainer) {
                // 40ft GP 추천
                bestRecommendation = {
                    containerType: '40ft',
                    shippingMethod: `${getSimpleContainerName('40ft')} * 1개 FCL`,
                    reason: `박스 수량 ${totalQuantity}개는 40ft GP 적재 가능`,
                    efficiency: container40ft.efficiency,
                    containersNeeded: 1,
                    boxesPerContainer: container40ft.boxesPerContainer,
                    remainingBoxes: 0
                };
            } else if (totalQuantity <= container40hc.boxesPerContainer) {
                // 40ft HC 추천
                bestRecommendation = {
                    containerType: '40hc',
                    shippingMethod: `${getSimpleContainerName('40hc')} * 1개 FCL`,
                    reason: `박스 수량 ${totalQuantity}개는 40ft HG 적재 가능`,
                    efficiency: container40hc.efficiency,
                    containersNeeded: 1,
                    boxesPerContainer: container40hc.boxesPerContainer,
                    remainingBoxes: 0
                };
            } else {
                // 여러 컨테이너 필요 - 가장 효율적인 것 선택
                const options = [
                    { type: '20ft', result: container20ft },
                    { type: '40ft', result: container40ft },
                    { type: '40hc', result: container40hc }
                ];
                
                // 필요 컨테이너 수가 가장 적은 것 우선, 같으면 효율성으로 선택
                options.sort((a, b) => {
                    if (a.result.containersNeeded === b.result.containersNeeded) {
                        return b.result.efficiency - a.result.efficiency;
                    }
                    return a.result.containersNeeded - b.result.containersNeeded;
                });
                
                const bestOption = options[0];
                const remainingBoxes = bestOption.result.remainingBoxes;
                
                if (remainingBoxes > 0) {
                    // 나머지 박스가 있는 경우 - CBM 기준으로 처리
                    const remainingCBM = remainingBoxes * boxCBM;
                    
                    if (remainingCBM < 15) {
                        // 15 CBM 미만은 LCL
                        bestRecommendation = {
                            containerType: bestOption.type,
                            shippingMethod: `${getSimpleContainerName(bestOption.type)} * ${bestOption.result.containersNeeded - 1}개 FCL + LCL * 1개`,
                            reason: `마지막 컨테이너는 LCL 권장 (${Math.round(remainingCBM * 10) / 10}CBM)`,
                            efficiency: bestOption.result.efficiency,
                            containersNeeded: bestOption.result.containersNeeded,
                            boxesPerContainer: bestOption.result.boxesPerContainer,
                            remainingBoxes: remainingBoxes
                        };
                    } else {
                        // 15 CBM 이상 - 나머지에 적합한 컨테이너 찾기 (단수 조정)
                        const remainderRecommendation = this.calculateRemainderContainer(input, remainingBoxes, remainingCBM);
                        let remainderContainer = remainderRecommendation.containerName;
                        let remainderReason = remainderRecommendation.reason;
                        
                        bestRecommendation = {
                            containerType: bestOption.type,
                            shippingMethod: `${getSimpleContainerName(bestOption.type)} * ${bestOption.result.containersNeeded - 1}개 FCL + ${remainderContainer} * 1개 FCL`,
                            reason: remainderReason,
                            efficiency: bestOption.result.efficiency,
                            containersNeeded: bestOption.result.containersNeeded,
                            boxesPerContainer: bestOption.result.boxesPerContainer,
                            remainingBoxes: remainingBoxes
                        };
                    }
                } else {
                    // 나머지 없음
                    bestRecommendation = {
                        containerType: bestOption.type,
                        shippingMethod: `${getSimpleContainerName(bestOption.type)} * ${bestOption.result.containersNeeded}개 FCL`,
                        reason: `효율성: ${Math.round(bestOption.result.efficiency)}%`,
                        efficiency: bestOption.result.efficiency,
                        containersNeeded: bestOption.result.containersNeeded,
                        boxesPerContainer: bestOption.result.boxesPerContainer,
                        remainingBoxes: 0
                    };
                }
            }
        } else {
            // 20ft GP 60% 미만 - LCL
            bestRecommendation = {
                containerType: '20ft',
                shippingMethod: 'LCL',
                reason: `박스 수량이 20ft GP 용량의 60% 미만 (${Math.round(totalCBM * 10) / 10}CBM)`,
                efficiency: container20ft.efficiency,
                containersNeeded: 1,
                boxesPerContainer: container20ft.boxesPerContainer,
                remainingBoxes: 0
            };
        }
        
        return bestRecommendation;
    }

    /**
     * 나머지 박스에 적합한 컨테이너 계산 (박스 수량 기준)
     */
    calculateRemainderContainer(input, remainingBoxes, remainingCBM) {
        // 각 컨테이너의 기본 용량과 남은 박스 수량 비교 (박스 수량 기준)
        const containerOptions = [];
        
        // 20ft GP 용량 확인
        const container20ft = this.calculateContainerResult(
            { ...input, totalQuantity: remainingBoxes }, 
            this.containers['20ft'], 
            this.optimizeLayout({ ...input, totalQuantity: remainingBoxes }), 
            '20ft'
        );
        
        if (container20ft.boxesPerContainer >= remainingBoxes) {
            containerOptions.push({
                type: '20ft',
                name: '20ft GP',  // 간단한 이름으로 변경
                capacity: container20ft.boxesPerContainer
            });
        }
        
        // 40ft GP 용량 확인
        const container40ft = this.calculateContainerResult(
            { ...input, totalQuantity: remainingBoxes }, 
            this.containers['40ft'], 
            this.optimizeLayout({ ...input, totalQuantity: remainingBoxes }), 
            '40ft'
        );
        
        if (container40ft.boxesPerContainer >= remainingBoxes) {
            containerOptions.push({
                type: '40ft',
                name: '40ft GP',  // 간단한 이름으로 변경
                capacity: container40ft.boxesPerContainer
            });
        }
        
        // 40ft HC 용량 확인
        const container40hc = this.calculateContainerResult(
            { ...input, totalQuantity: remainingBoxes }, 
            this.containers['40hc'], 
            this.optimizeLayout({ ...input, totalQuantity: remainingBoxes }), 
            '40hc'
        );
        
        if (container40hc.boxesPerContainer >= remainingBoxes) {
            containerOptions.push({
                type: '40hc',
                name: '40ft HG',  // 간단한 이름으로 변경 (HG = High-Cube)
                capacity: container40hc.boxesPerContainer
            });
        }
        
        if (containerOptions.length > 0) {
            // 가장 작은 컨테이너 우선 선택 (효율적인 사용)
            containerOptions.sort((a, b) => {
                return this.containers[a.type].cbm - this.containers[b.type].cbm;
            });
            
            const bestOption = containerOptions[0];
            
            return {
                containerName: bestOption.name,
                reason: `남은 수량 ${remainingBoxes}개는 ${bestOption.name} 적재 가능 (${Math.round(remainingCBM * 10) / 10}CBM)`
            };
        }
        
        return {
            containerName: 'LCL',
            reason: `남은 ${Math.round(remainingCBM * 10) / 10}CBM`
        };
    }

    /**
     * 결과 표시
     */
    displayResults(result) {
        const resultsContainer = document.getElementById('cbmResults');
        if (!resultsContainer) return;

        const { input, recommendation, containerResults } = result;

        resultsContainer.innerHTML = `
            <div class="space-y-6">
                <!-- 요약 정보 -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="stat-card">
                        <span class="stat-value">${formatNumber(input.totalQuantity)}</span>
                        <div class="stat-label">총 박스 수량</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${result.boxCBM.toFixed(3)}</span>
                        <div class="stat-label">박스당 CBM</div>
                    </div>
                </div>

                <!-- 추천 컨테이너 -->
                <div class="alert alert-success">
                    <h4 class="font-bold mb-2">🎯 최적 추천</h4>
                    <p><strong>${recommendation.shippingMethod === 'LCL' ? 'LCL' : recommendation.containerType + ' ' + recommendation.shippingMethod}</strong></p>
                    <p class="text-sm mt-1">${recommendation.reason}</p>
                    <p class="text-sm">효율성: ${recommendation.efficiency}%</p>
                </div>

                <!-- 상세 결과 테이블 -->
                <div class="overflow-x-auto">
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>컨테이너</th>
                                <th>적재 구성</th>
                                <th>박스/컨테이너</th>
                                <th>필요 컨테이너</th>
                                <th>효율성</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(containerResults).map(([type, result]) => `
                                <tr>
                                    <td class="font-medium">${this.containers[type].name}</td>
                                    <td>${result.layout.boxesX} × ${result.layout.boxesY} × ${result.layout.boxesZ}</td>
                                    <td>${formatNumber(result.boxesPerContainer)}</td>
                                    <td>${result.containersNeeded}</td>
                                    <td class="status-${result.efficiency > 70 ? 'success' : result.efficiency > 50 ? 'warning' : 'error'}">
                                        ${result.efficiency}%
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- PDF 출력 버튼 추가 ✅ -->
                <div class="flex gap-3">
                    <button onclick="cbmCalculator.exportToPDF()" class="btn-secondary flex-1">
                        📄 PDF 출력
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 3D 시뮬레이션 활성화
     */
    enable3DSimulation(result) {
        const threeDSection = document.getElementById('threeDSection');
        if (threeDSection) {
            threeDSection.classList.remove('hidden');
            
            // 3D 뷰어 재초기화 (컨테이너가 보이는 상태에서)
            setTimeout(() => {
                this.init3DViewer();
                // 팔레트 사용 여부에 따라 초기 뷰 결정
                if (result.input.usePallet) {
                    this.switch3DView('pallet');
                } else {
                    // 추천된 컨테이너 타입으로 초기 뷰 설정
                    const recommendedType = result.recommendation.containerType;
                    this.switch3DView(recommendedType);
                }
            }, 100);
        }
    }

    /**
     * 컨테이너별 최대 적재 단수 계산
     */
    calculateMaxLayers(containerType = null) {
        try {
            const input = this.collectInput();
            
            if (!input.box.height || !input.box.weight) {
                showAlert('박스 높이와 무게를 입력해주세요.', 'warning');
                return;
            }

            if (!input.usePallet) {
                showAlert('팔레트를 사용하는 경우에만 계산 가능합니다.', 'warning');
                return;
            }

            if (containerType) {
                // 특정 컨테이너에 대한 최대 단수 계산
                const containerSpec = this.containers[containerType];
                if (!containerSpec) {
                    showAlert('유효하지 않은 컨테이너 타입입니다.', 'error');
                    return;
                }
                
                const availableHeight = containerSpec.height - input.pallet.height;
                const maxLayers = Math.floor(availableHeight / input.box.height);
            
            document.getElementById('palletLayers').value = maxLayers;
            
                showAlert(`✅ ${containerSpec.name}에서 최대 ${maxLayers}단까지 적재 가능합니다.`, 'success');
                
            } else {
                // 일반적인 최대 단수 계산 (240cm 제한)
                const maxStackHeight = 240; // cm
                const availableHeight = maxStackHeight - input.pallet.height;
                const maxLayers = Math.floor(availableHeight / input.box.height);
                
                document.getElementById('palletLayers').value = maxLayers;
                
                showAlert(`✅ 일반적으로 최대 ${maxLayers}단까지 적재 가능합니다.`, 'success');
            }

        } catch (error) {
            showAlert('계산 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * 3D 뷰어 초기화
     */
    init3DViewer() {
        const container = document.getElementById('threeDContainer');
        if (!container || !window.THREE) {
            return;
        }

        // 기존 애니메이션 정지
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // 컨테이너 크기 확인
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 400;

        // Three.js 기본 설정
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe2e8f0);

        // 카메라 설정
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000);
        this.camera.position.set(600, 450, 600);

        // 렌더러 설정
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 컨테이너에 추가
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);

        // 조명 설정
        this.setupLighting();

        // 컨트롤 설정
        this.setupControls();

        // 첫 렌더링
        this.renderer.render(this.scene, this.camera);

        }

    /**
     * 조명 설정
     */
    setupLighting() {
        if (!this.scene) return;

        // 환경광
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        // 방향광
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.directionalLight.position.set(5, 10, 5);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 50;
        this.directionalLight.shadow.camera.left = -20;
        this.directionalLight.shadow.camera.right = 20;
        this.directionalLight.shadow.camera.top = 20;
        this.directionalLight.shadow.camera.bottom = -20;
        this.scene.add(this.directionalLight);
    }

    /**
     * 컨트롤 설정
     */
    setupControls() {
        // OrbitControls 확인
        const OrbitControlsClass = window.THREE?.OrbitControls || window.OrbitControls;

        if (OrbitControlsClass) {
            this.controls = new OrbitControlsClass(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        } else {
            }

        // 애니메이션 루프
        this.animate();
    }

    /**
     * 애니메이션 루프
     */
    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;

        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 3D 뷰 전환
     */
    switch3DView(viewType) {
        if (!this.lastCalculationResult) {
            showAlert('먼저 CBM 계산을 수행해주세요.', 'warning');
            return;
        }

        // 버튼 상태 업데이트
        document.querySelectorAll('.view-button').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeButton = document.querySelector(`[data-view="${viewType}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        this.currentView = viewType;
        this.render3DView(viewType);
    }

    /**
     * 3D 뷰 렌더링 (간소화 버전)
     */
    render3DView(viewType) {
        if (!this.scene) {
            return;
        }
        
        if (!this.lastCalculationResult) {
            return;
        }

        // 기존 박스들 제거
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.userData.isBox || child.userData.isPallet || child.userData.isContainer) {
                objectsToRemove.push(child);
            }
        });

        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        const input = this.lastCalculationResult.input;
        const containerResult = this.lastCalculationResult.containerResults[viewType];

        if (viewType === 'pallet') {
            this.renderPalletView(input);
        } else if (containerResult) {
            this.renderContainerView(viewType, input, containerResult);
        } else {
            }
        
        // 렌더링 강제 실행
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * 팔레트 뷰 렌더링
     */
    renderPalletView(input) {
        if (!input.usePallet) return;

        const pallet = input.pallet;
        const box = input.box;
        const layout = this.lastCalculationResult.optimizedLayout;
        
        // 팔레트 그룹 생성
        const palletGroup = new THREE.Group();
        
        // 팔레트를 개별 면으로 생성 (윗면 제외)
        const palletMaterial = new THREE.MeshStandardMaterial({ color: 0xdeb887 });
        
        // 팔레트 바닥면
        const bottomGeometry = new THREE.PlaneGeometry(pallet.length, pallet.width);
        const bottomMesh = new THREE.Mesh(bottomGeometry, palletMaterial);
        bottomMesh.rotation.x = -Math.PI / 2;
        bottomMesh.position.y = -pallet.height / 2;
        bottomMesh.receiveShadow = true;
        palletGroup.add(bottomMesh);
        
        // 팔레트 측면들
        const sideHeight = pallet.height;
        
        // 앞면
        const frontGeometry = new THREE.PlaneGeometry(pallet.length, sideHeight);
        const frontMesh = new THREE.Mesh(frontGeometry, palletMaterial);
        frontMesh.position.z = pallet.width / 2;
        frontMesh.castShadow = true;
        palletGroup.add(frontMesh);
        
        // 뒷면
        const backGeometry = new THREE.PlaneGeometry(pallet.length, sideHeight);
        const backMesh = new THREE.Mesh(backGeometry, palletMaterial);
        backMesh.position.z = -pallet.width / 2;
        backMesh.rotation.y = Math.PI;
        backMesh.castShadow = true;
        palletGroup.add(backMesh);
        
        // 왼쪽면
        const leftGeometry = new THREE.PlaneGeometry(pallet.width, sideHeight);
        const leftMesh = new THREE.Mesh(leftGeometry, palletMaterial);
        leftMesh.position.x = -pallet.length / 2;
        leftMesh.rotation.y = Math.PI / 2;
        leftMesh.castShadow = true;
        palletGroup.add(leftMesh);
        
        // 오른쪽면
        const rightGeometry = new THREE.PlaneGeometry(pallet.width, sideHeight);
        const rightMesh = new THREE.Mesh(rightGeometry, palletMaterial);
        rightMesh.position.x = pallet.length / 2;
        rightMesh.rotation.y = -Math.PI / 2;
        rightMesh.castShadow = true;
        palletGroup.add(rightMesh);
        
        // 팔레트 테두리 (윗면만)
        const topEdgesGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(pallet.length, pallet.width));
        const topEdges = new THREE.LineSegments(topEdgesGeometry, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 }));
        topEdges.rotation.x = -Math.PI / 2;
        topEdges.position.y = pallet.height / 2;
        palletGroup.add(topEdges);
        
        palletGroup.position.y = pallet.height / 2;
        palletGroup.userData.isPallet = true;
        this.scene.add(palletGroup);

        // 박스들 생성
        if (layout && layout.orientation) {
            const boxWidth = layout.orientation.name === '90도 회전' ? box.width : box.length;
            const boxDepth = layout.orientation.name === '90도 회전' ? box.length : box.width;
            const boxGeometry = new THREE.BoxGeometry(boxWidth, box.height, boxDepth);
            const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x90CAF9 });
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });

            // 팔레트에 실제로 올릴 박스 수 계산
            const boxesPerPallet = layout.orientation.boxesX * layout.orientation.boxesY * layout.maxLayers;
            const totalBoxesToShow = Math.min(input.totalQuantity, boxesPerPallet);
            let boxCount = 0;

            for (let layer = 0; layer < layout.maxLayers; layer++) {
                for (let x = 0; x < layout.orientation.boxesX; x++) {
                    for (let y = 0; y < layout.orientation.boxesY; y++) {
                        // 박스 수가 총 수량에 도달하면 중단
                        if (boxCount >= totalBoxesToShow) break;
                        
                        const boxGroup = new THREE.Group();
                        
                        const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
                        boxMesh.castShadow = true;
                        boxMesh.receiveShadow = true;
                        boxGroup.add(boxMesh);
                        
                        const boxEdges = new THREE.EdgesGeometry(boxGeometry);
                        const boxLine = new THREE.LineSegments(boxEdges, lineMaterial);
                        boxGroup.add(boxLine);
                        
                        // 팔레트 위 박스들을 중앙에 배치
                        const totalWidthUsed = layout.orientation.boxesX * boxWidth;
                        const totalDepthUsed = layout.orientation.boxesY * boxDepth;
                        const xOffset = -totalWidthUsed / 2;
                        const zOffset = -totalDepthUsed / 2;
                        
                        const xPos = xOffset + boxWidth * (x + 0.5);
                        const zPos = zOffset + boxDepth * (y + 0.5);
                        const yPos = pallet.height + box.height * (layer + 0.5);
                        
                        boxGroup.position.set(xPos, yPos, zPos);
                        boxGroup.userData.isBox = true;
                        this.scene.add(boxGroup);
                        
                        boxCount++;
                    }
                    if (boxCount >= totalBoxesToShow) break;
                }
                if (boxCount >= totalBoxesToShow) break;
            }
        }

        // 카메라와 조명 위치 조정
        const totalHeight = pallet.height + (layout.maxLayers * box.height);
        this.camera.position.set(pallet.length * 1.2, totalHeight * 1.2, pallet.width * 1.2);
        this.camera.lookAt(0, totalHeight / 2, 0);
        
        if (this.controls) {
            this.controls.target.set(0, totalHeight / 2, 0);
            this.controls.update();
        }
        
        if (this.directionalLight) {
            this.directionalLight.position.set(pallet.length, totalHeight * 2, pallet.width);
        }
    }

    /**
     * 컨테이너 뷰 렌더링
     */
    renderContainerView(containerType, input, containerResult) {
        const containerSpec = this.containers[containerType];
        const box = input.box;
        const layout = containerResult.layout;
        const usePallet = input.usePallet;
        
        // 컨테이너 그룹 생성
        const containerGroup = new THREE.Group();
        
        // 컨테이너 외곽선 생성
        const containerGeometry = new THREE.BoxGeometry(
            containerSpec.length,
            containerSpec.height,
            containerSpec.width
        );
        
        // 컨테이너 테두리만 표시
        const containerEdges = new THREE.EdgesGeometry(containerGeometry);
        const containerLine = new THREE.LineSegments(
            containerEdges, 
            new THREE.LineBasicMaterial({ color: 0x374151, linewidth: 2 })
        );
        
        // 반투명 컨테이너 내부
        const containerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xD1D5DB,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const containerMesh = new THREE.Mesh(containerGeometry, containerMaterial);
        
        containerGroup.add(containerMesh);
        containerGroup.add(containerLine);
        containerGroup.position.y = containerSpec.height / 2;
        containerGroup.userData.isContainer = true;
        this.scene.add(containerGroup);

        // 팔레트 사용 시 팔레트와 박스 렌더링
        if (usePallet && this.lastCalculationResult.optimizedLayout) {
            const palletLayout = this.lastCalculationResult.optimizedLayout;
            const pallet = input.pallet;
            
            // 팔레트 재질
            const palletMaterial = new THREE.MeshStandardMaterial({ color: 0xdeb887 });
            const palletGeometry = new THREE.BoxGeometry(
                palletLayout.dimensions.length,
                palletLayout.dimensions.height,
                palletLayout.dimensions.width
            );
            
            // 컨테이너 내 팔레트 배치 계산
            const palletsX = Math.floor(containerSpec.length / palletLayout.dimensions.length);
            const palletsY = Math.floor(containerSpec.width / palletLayout.dimensions.width);
            const palletsZ = Math.floor(containerSpec.height / palletLayout.dimensions.height);
            
            let palletCount = 0;
            const totalPalletsNeeded = Math.ceil(input.totalQuantity / palletLayout.boxesPerPallet);
            
            for (let z = 0; z < palletsZ; z++) {
                for (let y = 0; y < palletsY; y++) {
                    for (let x = 0; x < palletsX; x++) {
                        if (palletCount >= totalPalletsNeeded) break;
                        
                        // 팔레트 그룹
                        const palletGroup = new THREE.Group();
                        
                        // 팔레트를 개별 면으로 생성 (윗면 제외)
                        // 팔레트 바닥면
                        const bottomGeometry = new THREE.PlaneGeometry(palletLayout.dimensions.length, palletLayout.dimensions.width);
                        const bottomMesh = new THREE.Mesh(bottomGeometry, palletMaterial);
                        bottomMesh.rotation.x = -Math.PI / 2;
                        bottomMesh.position.y = -palletLayout.dimensions.height / 2;
                        bottomMesh.receiveShadow = true;
                        palletGroup.add(bottomMesh);
                        
                        // 팔레트 측면들
                        const sideHeight = palletLayout.dimensions.height;
                        
                        // 앞면
                        const frontGeometry = new THREE.PlaneGeometry(palletLayout.dimensions.length, sideHeight);
                        const frontMesh = new THREE.Mesh(frontGeometry, palletMaterial);
                        frontMesh.position.z = palletLayout.dimensions.width / 2;
                        frontMesh.castShadow = true;
                        palletGroup.add(frontMesh);
                        
                        // 뒷면
                        const backGeometry = new THREE.PlaneGeometry(palletLayout.dimensions.length, sideHeight);
                        const backMesh = new THREE.Mesh(backGeometry, palletMaterial);
                        backMesh.position.z = -palletLayout.dimensions.width / 2;
                        backMesh.rotation.y = Math.PI;
                        backMesh.castShadow = true;
                        palletGroup.add(backMesh);
                        
                        // 왼쪽면
                        const leftGeometry = new THREE.PlaneGeometry(palletLayout.dimensions.width, sideHeight);
                        const leftMesh = new THREE.Mesh(leftGeometry, palletMaterial);
                        leftMesh.position.x = -palletLayout.dimensions.length / 2;
                        leftMesh.rotation.y = Math.PI / 2;
                        leftMesh.castShadow = true;
                        palletGroup.add(leftMesh);
                        
                        // 오른쪽면
                        const rightGeometry = new THREE.PlaneGeometry(palletLayout.dimensions.width, sideHeight);
                        const rightMesh = new THREE.Mesh(rightGeometry, palletMaterial);
                        rightMesh.position.x = palletLayout.dimensions.length / 2;
                        rightMesh.rotation.y = -Math.PI / 2;
                        rightMesh.castShadow = true;
                        palletGroup.add(rightMesh);
                        
                        // 팔레트 테두리 (윗면만)
                        const topEdgesGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(palletLayout.dimensions.length, palletLayout.dimensions.width));
                        const topEdges = new THREE.LineSegments(topEdgesGeometry, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 }));
                        topEdges.rotation.x = -Math.PI / 2;
                        topEdges.position.y = palletLayout.dimensions.height / 2;
                        palletGroup.add(topEdges);
                        
                        // 팔레트 위치
                        const palletX = -containerSpec.length / 2 + palletLayout.dimensions.length * (x + 0.5);
                        const palletZ = -containerSpec.width / 2 + palletLayout.dimensions.width * (y + 0.5);
                        const palletY = palletLayout.dimensions.height / 2 + z * palletLayout.dimensions.height;
                        
                        palletGroup.position.set(palletX, palletY, palletZ);
                        palletGroup.userData.isPallet = true;
                        this.scene.add(palletGroup);
                        
                        // 팔레트 위 박스들
                        const boxWidth = palletLayout.orientation.name === '90도 회전' ? box.width : box.length;
                        const boxDepth = palletLayout.orientation.name === '90도 회전' ? box.length : box.width;
                        const boxGeometry = new THREE.BoxGeometry(boxWidth, box.height, boxDepth);
                        const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x90CAF9 });
                        
                        // 이 팔레트에 올릴 박스 수 계산
                        const remainingBoxes = input.totalQuantity - (palletCount * palletLayout.boxesPerPallet);
                        const boxesOnThisPallet = Math.min(remainingBoxes, palletLayout.boxesPerPallet);
                        
                        let boxCount = 0;
                        for (let layer = 0; layer < palletLayout.maxLayers; layer++) {
                            for (let bx = 0; bx < palletLayout.orientation.boxesX; bx++) {
                                for (let by = 0; by < palletLayout.orientation.boxesY; by++) {
                                    if (boxCount >= boxesOnThisPallet) break;
                                    
                                    const boxGroup = new THREE.Group();
                                    
                                    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
                                    boxMesh.castShadow = true;
                                    boxMesh.receiveShadow = true;
                                    boxGroup.add(boxMesh);
                                    
                                    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
                                    const boxLine = new THREE.LineSegments(
                                        boxEdges, 
                                        new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
                                    );
                                    boxGroup.add(boxLine);
                                    
                                    // 박스를 팔레트 중앙에 배치
                                    const totalWidthUsed = palletLayout.orientation.boxesX * boxWidth;
                                    const totalDepthUsed = palletLayout.orientation.boxesY * boxDepth;
                                    const boxXOffset = -totalWidthUsed / 2 + boxWidth * (bx + 0.5);
                                    const boxZOffset = -totalDepthUsed / 2 + boxDepth * (by + 0.5);
                                    const boxYOffset = pallet.height + box.height * (layer + 0.5);
                                    
                                    boxGroup.position.set(
                                        palletX + boxXOffset,
                                        palletY - palletLayout.dimensions.height / 2 + boxYOffset,
                                        palletZ + boxZOffset
                                    );
                                    boxGroup.userData.isBox = true;
                                    this.scene.add(boxGroup);
                                    
                                    boxCount++;
                                }
                                if (boxCount >= boxesOnThisPallet) break;
                            }
                            if (boxCount >= boxesOnThisPallet) break;
                        }
                        
                        palletCount++;
                    }
                    if (palletCount >= totalPalletsNeeded) break;
                }
                if (palletCount >= totalPalletsNeeded) break;
            }
        } else {
            // 팔레트 미사용 시 기존 로직
            // 박스 크기 (회전 고려)
            const boxWidth = layout.rotated ? box.width : box.length;
            const boxDepth = layout.rotated ? box.length : box.width;
            
            // 박스들 생성
            const boxGeometry = new THREE.BoxGeometry(boxWidth, box.height, boxDepth);
            const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x90CAF9 });
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
        
        // 실제로 보여줄 박스 수 계산 - 제한 없이 모든 박스 표시
        const totalBoxes = Math.min(input.totalQuantity, containerResult.boxesPerContainer);
        
        let boxCount = 0;
        for (let z = 0; z < layout.boxesZ; z++) {
            for (let y = 0; y < layout.boxesY; y++) {
                for (let x = 0; x < layout.boxesX; x++) {
                    // 가장 중요한 부분: 그려진 박스 수가 사용자가 입력한 수량에 도달하면 즉시 중단
                    if (boxCount >= totalBoxes) break;
                    
                    const boxGroup = new THREE.Group();
                    
                    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
                    boxMesh.castShadow = true;
                    boxMesh.receiveShadow = true;
                    boxGroup.add(boxMesh);
                    
                    const boxEdges = new THREE.EdgesGeometry(boxGeometry);
                    const boxLine = new THREE.LineSegments(boxEdges, lineMaterial);
                    boxGroup.add(boxLine);
                    
                    const xPos = -containerSpec.length / 2 + boxWidth * (x + 0.5);
                    const zPos = -containerSpec.width / 2 + boxDepth * (y + 0.5);
                    const yPos = box.height * (z + 0.5);
                    
                    boxGroup.position.set(xPos, yPos, zPos);
                    boxGroup.userData.isBox = true;
                    this.scene.add(boxGroup);
                    
                    boxCount++; // 박스를 하나 그릴 때마다 카운터 1 증가
                }
                if (boxCount >= totalBoxes) break; // 안쪽 루프가 끝났을 때 다시 한번 확인
            }
            if (boxCount >= totalBoxes) break; // 중간 루프가 끝났을 때 다시 한번 확인
        }
        }

        // 카메라와 조명 위치 조정
        const distance = Math.max(containerSpec.length, containerSpec.width, containerSpec.height) * 0.8;
        this.camera.position.set(distance, distance * 0.7, distance);
        this.camera.lookAt(0, containerSpec.height / 2, 0);
        
        if (this.controls) {
            this.controls.target.set(0, containerSpec.height / 2, 0);
            this.controls.update();
        }
        
        if (this.directionalLight) {
            this.directionalLight.position.set(containerSpec.length, containerSpec.height * 2, containerSpec.width);
        }
    }

    /**
     * 현재 입력값 저장
     */
    saveCurrentInput() {
        try {
            const input = this.collectInput();
            localStorage.setItem('lastCbmInput', JSON.stringify(input));
        } catch (error) {
            }
    }

    /**
     * 마지막 입력값 로드
     */
    loadLastInput() {
        try {
            const saved = localStorage.getItem('lastCbmInput');
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

        setValueIfExists('boxLength', input.box?.length);
        setValueIfExists('boxWidth', input.box?.width);
        setValueIfExists('boxHeight', input.box?.height);
        setValueIfExists('boxWeight', input.box?.weight);
        setValueIfExists('totalQuantity', input.totalQuantity);
        
        setValueIfExists('palletLength', input.pallet?.length);
        setValueIfExists('palletWidth', input.pallet?.width);
        setValueIfExists('palletHeight', input.pallet?.height);
        setValueIfExists('palletLayers', input.pallet?.layers);

        const usePalletCheckbox = document.getElementById('usePallet');
        if (usePalletCheckbox && input.usePallet !== undefined) {
            usePalletCheckbox.checked = input.usePallet;
        }
    }

    /**
     * PDF 출력 기능 - HTML 인쇄 방식 ✅
     */
    exportToPDF() {
        if (!this.lastCalculationResult) {
            showAlert('먼저 CBM 계산을 수행해주세요.', 'warning');
            return;
        }

        try {
            showAlert('📄 PDF 생성 중입니다...', 'info', 2000);
            
            // PDF용 HTML 창 생성
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            const pdfContent = this.generatePDFContent(this.lastCalculationResult);
            
            printWindow.document.write(pdfContent);
            printWindow.document.close();
            
            // 스타일이 로드된 후 인쇄 대화상자 열기
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            };
            
            showAlert('✅ PDF 인쇄 창이 열렸습니다!', 'success');
            
        } catch (error) {
            console.error('PDF 생성 오류:', error);
            showAlert('❌ PDF 생성 중 오류가 발생했습니다.', 'error');
        }
    }

    /**
     * PDF용 HTML 컨텐츠 생성 ✅
     */
    generatePDFContent(result) {
        const { input, optimizedLayout, containerResults } = result;
        const currentDate = new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CBM 계산 결과 보고서</title>
    <style>
        @page {
            margin: 20mm;
            @top-center {
                content: "두리무역 무료 통합 무역 계산 시스템";
                font-weight: bold;
                font-size: 14px;
                color: #8b5cf6;
            }
            @bottom-center {
                content: "두리무역 - 중국 출장 품질 관리 전문 업체 | 문의: trade@duly.co.kr";
                font-size: 10px;
                color: #666;
                border-top: 1px solid #ddd;
                padding-top: 5mm;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Malgun Gothic', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            border-bottom: 3px solid #8b5cf6;
        }
        
        .header h1 {
            color: #8b5cf6;
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 25px;
            break-inside: avoid;
        }
        
        .section-title {
            background: #f8f9fa;
            padding: 10px 15px;
            border-left: 4px solid #8b5cf6;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
        }
        
        .info-card h3 {
            color: #8b5cf6;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-card .value {
            font-size: 20px;
            font-weight: bold;
            color: #333;
        }
        
        .info-card .unit {
            font-size: 12px;
            color: #666;
            margin-left: 5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background: #f8f9fa;
            font-weight: bold;
            color: #555;
        }
        
        .highlight {
            background: #fff3cd;
            font-weight: bold;
        }
        
        .container-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .container-card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
        }
        
        .container-card h4 {
            color: #8b5cf6;
            margin-bottom: 10px;
        }
        
        .container-card .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 14px;
        }
        
        .footer-ad {
            margin-top: 40px;
            padding: 20px;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            text-align: center;
            border-radius: 10px;
            break-inside: avoid;
        }
        
        .footer-ad h3 {
            font-size: 18px;
            margin-bottom: 10px;
        }
        
        .footer-ad p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        @media print {
            .header {
                margin-top: 0;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 CBM 계산 결과 보고서</h1>
        <div class="subtitle">생성일: ${currentDate}</div>
    </div>

    <!-- 입력 정보 -->
    <div class="section">
        <div class="section-title">📋 입력 정보</div>
        <table>
            <tr>
                <th>항목</th>
                <th>값</th>
                <th>항목</th>
                <th>값</th>
            </tr>
            <tr>
                <td>박스 길이</td>
                <td>${input.box.length} cm</td>
                <td>박스 너비</td>
                <td>${input.box.width} cm</td>
            </tr>
            <tr>
                <td>박스 높이</td>
                <td>${input.box.height} cm</td>
                <td>박스 무게</td>
                <td>${input.box.weight} kg</td>
            </tr>
            <tr>
                <td>총 수량</td>
                <td>${input.totalQuantity.toLocaleString()} 박스</td>
                <td>팔레트 사용</td>
                <td>${input.usePallet ? '예' : '아니오'}</td>
            </tr>
            ${input.usePallet ? `
            <tr>
                <td>팔레트 크기</td>
                <td>${input.pallet.length}×${input.pallet.width}×${input.pallet.height} cm</td>
                <td>적재 단수</td>
                <td>${input.pallet.layers} 단</td>
            </tr>
            ` : ''}
        </table>
    </div>

    <!-- 계산 결과 요약 -->
    <div class="section">
        <div class="section-title">📊 계산 결과 요약</div>
        <div class="info-grid">
            <div class="info-card">
                <h3>박스당 CBM</h3>
                <div class="value">${result.boxCBM.toFixed(4)}<span class="unit">CBM</span></div>
            </div>
            <div class="info-card">
                <h3>총 CBM</h3>
                <div class="value">${(result.boxCBM * input.totalQuantity).toFixed(2)}<span class="unit">CBM</span></div>
            </div>
            <div class="info-card">
                <h3>총 무게</h3>
                <div class="value">${(input.box.weight * input.totalQuantity).toLocaleString()}<span class="unit">kg</span></div>
            </div>
            <div class="info-card">
                <h3>최적 컨테이너</h3>
                <div class="value">${this.getOptimalContainer(containerResults)}</div>
            </div>
        </div>
    </div>

    <!-- 컨테이너별 적재 결과 -->
    <div class="section">
        <div class="section-title">🚢 컨테이너별 적재 분석</div>
        <div class="container-grid">
            ${Object.entries(containerResults).map(([type, data]) => `
                <div class="container-card">
                    <h4>${data.spec.name}</h4>
                    <div class="metric">
                        <span>필요 컨테이너:</span>
                        <strong>${data.containersNeeded}개</strong>
                    </div>
                    <div class="metric">
                        <span>CBM 효율:</span>
                        <span>${data.efficiency.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span>무게 효율:</span>
                        <span>${data.weightEfficiency.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span>예상 비용:</span>
                        <strong>$${data.estimatedCost.toLocaleString()}</strong>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <!-- 최적화 권장사항 -->
    <div class="section">
        <div class="section-title">💡 최적화 권장사항</div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            ${this.generateOptimizationRecommendations(result)}
        </div>
    </div>

    <!-- 광고 -->
    <div class="footer-ad">
        <h3>🌟 두리무역 - 중국 출장 품질 관리 전문 업체</h3>
        <p>✓ 공장 검수 및 품질 관리 ✓ 중국 현지 조달 지원 ✓ 무역 컨설팅</p>
        <p>📧 trade@duly.co.kr | 📞 1588-0000 | 🌐 www.duly.co.kr</p>
    </div>
</body>
</html>`;
    }

    /**
     * 최적 컨테이너 추천
     */
    getOptimalContainer(containerResults) {
        let bestOption = null;
        let bestScore = -1;

        Object.entries(containerResults).forEach(([type, data]) => {
            // 효율성과 비용을 종합한 점수 계산
            const score = (data.efficiency + data.weightEfficiency) / 2 - (data.estimatedCost / 10000);
            if (score > bestScore) {
                bestScore = score;
                bestOption = data.spec.name;
            }
        });

        return bestOption || '분석 불가';
    }

    /**
     * 최적화 권장사항 생성
     */
    generateOptimizationRecommendations(result) {
        const { input, containerResults } = result;
        const recommendations = [];

        // CBM 효율성 분석
        const totalCBM = result.boxCBM * input.totalQuantity;
        if (totalCBM < 20) {
            recommendations.push('📦 소량 화물로 LCL(혼재) 운송을 권장합니다.');
        } else if (totalCBM > 60) {
            recommendations.push('📦 대량 화물로 40ft 컨테이너 사용을 권장합니다.');
        }

        // 무게 vs CBM 분석
        const totalWeight = input.box.weight * input.totalQuantity;
        const density = totalWeight / totalCBM;
        if (density > 300) {
            recommendations.push('⚖️ 고중량 화물로 무게 제한에 주의하세요.');
        } else if (density < 100) {
            recommendations.push('📦 경량 화물로 CBM 기준으로 계산됩니다.');
        }

        // 팔레트 사용 권장
        if (!input.usePallet && input.totalQuantity > 50) {
            recommendations.push('🏗️ 대량 화물은 팔레트 사용을 권장합니다.');
        }

        return recommendations.length > 0 
            ? recommendations.map(rec => `<p style="margin-bottom: 8px;">• ${rec}</p>`).join('')
            : '<p>현재 설정이 최적화되어 있습니다.</p>';
    }
}

// CBM 계산기 인스턴스 생성
const cbmCalculator = new CBMCalculator();

// 전역에서 사용할 수 있도록 설정
window.cbmCalculator = cbmCalculator; 