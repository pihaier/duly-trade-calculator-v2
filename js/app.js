// app.js - 두리무역 웹사이트 최적화된 JavaScript

// ===========================================
// 스마트 비디오 로딩 시스템
// ===========================================

class SmartVideoLoader {
    constructor() {
        this.video = document.getElementById('hero-video');
        this.background = document.getElementById('hero-background');
        this.isPlaying = false;
        this.isLoaded = false;
        
        this.init();
    }
    
    init() {
        if (!this.video) {
            console.warn('⚠️ hero-video 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 비디오 정적 배경 설정 - 완전 무음
        this.video.muted = true;
        this.video.volume = 0;
        this.video.playsInline = true;
        this.video.loop = true;
        this.video.preload = 'metadata';
        this.video.autoplay = true;
        this.video.controls = false; // 컨트롤 숨김
        
        // 비디오 표시
        this.video.style.display = 'block';
        this.video.style.pointerEvents = 'none'; // 클릭 이벤트 차단
        
        // 이벤트 리스너 설정
        this.setupVideoEvents();
        
        // 비디오 로딩 시작
        this.video.load();
        
        console.log('🔇 무음 배경 비디오 초기화 완료');
    }
    
    setupVideoEvents() {
        if (!this.video) return;
        
        // 재생 가능 상태
        this.video.addEventListener('canplay', () => {
            console.log('🔇 무음 비디오 재생 준비 완료');
            this.isLoaded = true;
            
            // 무음 재생 시도
            this.startSilentPlayback();
        });
        
        // 재생 시작
        this.video.addEventListener('play', () => {
            console.log('🔇 무음 비디오 재생 시작');
            this.isPlaying = true;
            
            // 재생 중에도 무음 보장
            this.video.muted = true;
            this.video.volume = 0;
        });
        
        // 재생 완료 시 자동 반복
        this.video.addEventListener('ended', () => {
            console.log('🔄 비디오 재생 완료, 다시 시작');
            this.video.currentTime = 0;
            this.video.play();
        });
        
        // 에러 처리 - 단순화
        this.video.addEventListener('error', (e) => {
            console.log('ℹ️ 비디오 재생 불가 - 정적 배경 사용');
            this.video.style.display = 'none';
        });
    }
    
    startSilentPlayback() {
        if (!this.video) return;
        
        // 무음 자동재생 시도
        this.video.muted = true;
        this.video.volume = 0;
        
        const playPromise = this.video.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('🔇 무음 비디오 재생 성공');
                    this.isPlaying = true;
                })
                .catch(error => {
                    console.log('ℹ️ 자동재생 제한 - 정적 배경으로 사용');
                    // 자동재생 실패해도 비디오는 표시 유지 (정적 이미지처럼)
                });
        }
    }
    
    // 强制播放视频 (调试用)
    forcePlay() {
        if (!this.video) return;
        
        console.log('🎬 강제 비디오 재생 시도');
        this.video.muted = true;
        this.video.volume = 0;
        this.video.currentTime = 0;
        
        this.video.play().then(() => {
            console.log('✅ 강제 재생 성공');
            this.isPlaying = true;
        }).catch(error => {
            console.error('❌ 강제 재생 실패:', error);
        });
    }
    
    // 获取视频状态信息
    getVideoStatus() {
        if (!this.video) return null;
        
        return {
            paused: this.video.paused,
            ended: this.video.ended,
            currentTime: this.video.currentTime,
            duration: this.video.duration,
            readyState: this.video.readyState,
            networkState: this.video.networkState,
            muted: this.video.muted,
            volume: this.video.volume,
            src: this.video.src
        };
    }
}

// 배터리 상태 모니터링
class BatteryOptimizer {
    constructor(videoLoader) {
        this.videoLoader = videoLoader;
        this.init();
    }
    
    async init() {
        if ('getBattery' in navigator) {
            try {
                const battery = await navigator.getBattery();
                
                // 배터리 20% 이하면 비디오 일시정지
                if (battery.level < 0.2) {
                    this.videoLoader.pauseVideo();
                }
                
                // 배터리 상태 변화 감지
                battery.addEventListener('levelchange', () => {
                    if (battery.level < 0.15 && this.videoLoader.isPlaying) {
                        this.videoLoader.pauseVideo();
                    }
                });
                
                battery.addEventListener('chargingchange', () => {
                    if (battery.charging && battery.level > 0.3) {
                        // 충전 중: 비디오 재생 허용
                    }
                });
                
            } catch (error) {
                // 배터리 API 지원 안함
            }
        }
    }
}

// ===========================================
// 기존 코드 시작
// ===========================================

// 성능 최적화를 위한 디바운스 함수
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Configuration
const config = {
    googleFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLSddIosYdxt42JjxDWBlG8U2ZHomsKp6U4ntii9qQl8YiGS-hA/viewform?usp=dialog",
    tel: "031-699-8781",
    email: "duly@duly.co.kr",
    report: {
        factoryAudit: "https://drive.google.com/file/d/1rZsIWD1eqfFppLI1N3-SPPXh6PlcPmV_/view",
        inspection: "https://drive.google.com/file/d/1gkS4OB_HoChtU2BIQsjKG57U1zkhVTgx/view",
        loading: "https://drive.google.com/file/d/1DbQ-Lq-0YPbdGIvwC0K_yF0OTSovFTYT/view",
    }
};

// Data Arrays
const services = [
        { 
            id: 'factory-audit', 
            icon: 'factory', 
            title: '공장 실사', 
            description: '거래 전 공급업체의 실체를 파악하여 사기 및 부실 거래 리스크를 원천 차단합니다.', 
            fullDescription: '거래 전 공급업체의 실체를 파악하여 사기, 불법 하청 등 잠재적 리스크를 사전에 방지합니다.', 
            details: [
                '기초 정보 및 라이선스 확인', 
                '생산 설비 및 환경 실사', 
                '품질관리(QC) 시스템 검토', 
                '생산 라인 및 프로세스 확인', 
                '자체 시험실 및 검사 장비 유무', 
                '원자재 관리 시스템 확인', 
                '기술력 및 R&D 역량 평가', 
                '품질 추적 시스템 유무'
            ], 
            reportUrl: config.report.factoryAudit, 
            gradient: 'from-indigo-600 to-blue-600' 
        },
        { 
            id: 'inspection', 
            icon: 'package', 
            title: '생산 검품', 
            description: '생산 완료된 제품을 선적 전 현지에서 검수하여 불량품의 국내 유입을 막습니다.', 
            fullDescription: 'AQL 국제 표준에 따라 생산 완료된 제품이 고객의 요구사항과 일치하는지 종합적으로 검사합니다.', 
            details: [
                '생산 상태 확인: 생산 완료 수량, 포장 진행률, 누락 여부', 
                '포장 상태 검사: 외부/내부 박스 크기, 무게, 포장 방식, 구성품', 
                '제품 외관 및 마감: 스크래치, 파손, 이염, 조립 품질 등 육안 검사', 
                '사이즈 및 사양 확인: 크기, 중량, 케이블 길이 등 실측 데이터 비교', 
                '기능 및 내구성 테스트: 전원, 성능, 용량 등 핵심 기능 현장 테스트', 
                '불량 처리 지원: 불량 발견 시 즉시 보고 및 해결 방안 논의 지원'
            ], 
            reportUrl: config.report.inspection, 
            gradient: 'from-purple-600 to-pink-600' 
        },
        { 
            id: 'loading', 
            icon: 'truck', 
            title: '적재 검사', 
            description: '컨테이너 작업 시 수량, 포장 상태를 최종 확인하여 운송 중 발생 문제를 예방합니다.', 
            fullDescription: '선적 직전, 컨테이너에 제품이 정확하고 안전하게 실리는지 최종 확인하여 운송 리스크를 예방합니다.', 
            details: [
                '컨테이너 상태 점검: 적재 전 컨테이너 내부의 청결도, 파손, 오염 여부 확인', 
                '제품 및 수량 확인: 무작위 샘플 개봉으로 주문 제품과 일치하는지, 총 수량이 맞는지 최종 확인', 
                '적재 과정 감독: 제품이 안전하게 적재되는지, 파손 위험은 없는지 전 과정 감독', 
                '봉인 확인: 적재 완료 후 컨테이너 번호와 실(Seal) 번호를 사진으로 기록하여 발송'
            ], 
            reportUrl: config.report.loading, 
            gradient: 'from-green-600 to-teal-600' 
        }
    ];

    const benefits = [
        { 
            icon: 'dollar-sign', 
            title: '압도적인 비용 절감', 
            description: '불량으로 인한 재작업, 반품, 운송 비용을 현지에서 해결하여 잠재적 손실 수천만 원을 막아드립니다.', 
            color: 'from-blue-500 to-cyan-500' 
        },
        { 
            icon: 'handshake', 
            title: '확실한 현지 컨트롤', 
            description: '8년간 구축한 현지 네트워크로 공장과 직접 소통하고 유리한 협상을 이끌어냅니다.', 
            color: 'from-purple-500 to-pink-500' 
        },
        { 
            icon: 'clipboard-check', 
            title: '100% 투명한 보고', 
            description: '모든 검품 과정을 사진/영상으로 기록하여 상세히 보고합니다. 현장을 완벽하게 통제할 수 있습니다.', 
            color: 'from-green-500 to-teal-500' 
        }
    ];

    const problemSolutions = [
        { 
            id: 'quality', 
            icon: 'alert-circle', 
            title: '예측 불가능한 품질', 
            problem: '샘플과 전혀 다른 제품, 계속되는 불량에 손실이 커지고 계신가요?', 
            fullProblem: '샘플과 다른 품질, 반복되는 불량으로 인한 재정 손실 및 고객 신뢰도 하락.', 
            solution: '선적 전 AQL 샘플링 또는 전수 검사를 통해 현장에서 불량을 잡아내고, 원활한 문제 해결을 지원합니다.', 
            effects: ['보장된 제품 품질 확보 및 불량률 최소화', '국내 입고 후 처리 비용 "제로"'], 
            gradient: 'from-red-500 to-orange-500' 
        },
        { 
            id: 'cost', 
            icon: 'alert-circle', 
            title: '막대한 처리 비용', 
            problem: '국내 도착 후 발견된 불량품 처리, 반품/교환 비용이 부담되시나요?', 
            fullProblem: '국내 도착 후 발견된 불량품의 반품, 폐기, 재운송 등으로 인한 막대한 비용 발생.', 
            solution: '중국 현지에서 모든 품질 문제를 해결하여, 불량품이 한국으로 선적될 가능성을 원천 차단합니다.', 
            effects: ['불필요한 국제 운송/통관 비용 절감', '수익성 및 운영 효율성 증대'], 
            gradient: 'from-yellow-500 to-red-500' 
        },
        { 
            id: 'logistics', 
            icon: 'truck', 
            title: '물류 사고 및 수량 부족', 
            problem: '주문과 다른 제품이 실리거나, 수량이 맞지 않아 납기에 차질이 생겼나요?', 
            fullProblem: '주문과 다른 제품이 실리거나 수량 부족, 포장 불량으로 인한 제품 손상 및 납기 지연.', 
            solution: '적재 검사를 통해 컨테이너에 제품을 싣는 전 과정을 감독하며 수량, 제품 일치 여부를 최종 확인합니다.', 
            effects: ['정확한 수량의 제품 수령 보장', '운송 중 파손 리스크 최소화'], 
            gradient: 'from-blue-500 to-purple-500' 
        },
        { 
            id: 'fraud', 
            icon: 'shield', 
            title: '공급업체 사기 위험', 
            problem: '신규 공급업체가 믿을만한지, 대금만 받고 사라지진 않을지 불안한가요?', 
            fullProblem: '유령 회사, 열악한 생산 환경 등 부실/사기 공급업체로 인한 대금 손실 및 사업 차질.', 
            solution: '공장 실사를 통해 사업자등록증, 설비, 품질관리 시스템까지 직접 방문하여 검증하고 상세 보고서를 제공합니다.', 
            effects: ['신뢰할 수 있는 파트너와 안전한 거래', '잠재적 법적/재정적 리스크 예방'], 
            gradient: 'from-purple-500 to-indigo-500' 
        },
        { 
            id: 'communication', 
            icon: 'message-square', 
            title: '의사소통의 어려움', 
            problem: '언어 문제, 문화 차이로 인해 요구사항이 제대로 전달되지 않고 있나요?', 
            fullProblem: '언어 및 문화 차이로 인한 오해, 요구사항 누락, 문제 발생 시 대응 지연.', 
            solution: '중국어에 능통하고 현지 비즈니스 문화에 익숙한 전문 인력이 고객의 요구사항을 100% 정확하게 전달합니다.', 
            effects: ['명확하고 신속한 커뮤니케이션', '소통 오류로 인한 시간 및 비용 낭비 방지'], 
            gradient: 'from-green-500 to-blue-500' 
        },
        { 
            id: 'defects', 
            icon: 'package', 
            title: '불량 처리의 막막함', 
            problem: '불량 발생 시 재작업이나 보상 협상이 어려워 속수무책으로 당하고 있나요?', 
            fullProblem: '불량 발생 시 책임 소재를 따지기 어렵고, 재작업이나 손해배상 협상에 어려움을 겪음.', 
            solution: '현장에서 발견된 불량에 대해 명확한 근거를 확보하여 보고하고, 원활한 협상과 문제 해결을 지원합니다.', 
            effects: ['불량으로 인한 손실 최소화 및 신속한 해결', '공급업체와의 불필요한 감정 소모 방지'], 
            gradient: 'from-pink-500 to-rose-500' 
        }
    ];

    const processSteps = [
        { step: '1', title: '상담 및 견적 신청', description: '홈페이지를 통해 제품 정보와 함께 검품 서비스를 신청합니다.' },
        { step: '2', title: '일정 조율 및 결제', description: '담당자가 배정되어 현지 공장과 일정을 조율하고 서비스를 결제합니다.' },
        { step: '3', title: '현지 출장 검품', description: '전문 검품원이 현장으로 파견되어 합의된 기준에 따라 검품을 수행합니다.' },
        { step: '4', title: '결과 보고서 발송', description: '사진과 영상이 포함된 상세한 검품 결과 보고서를 이메일로 전달받습니다.' }
    ];

    const faqs = [
        { 
            id: 'faq1', 
            question: '검품 비용은 어떻게 되나요?', 
            answer: '검품 비용은 제품 종류, 수량, 검품 난이도, 공장 위치에 따라 맞춤형으로 책정됩니다. "무료 상담 및 견적 요청"을 통해 문의주시면, 24시간 내에 투명한 견적을 제공해 드립니다.' 
        },
        { 
            id: 'faq2', 
            question: '검품은 보통 며칠 걸리나요?', 
            answer: '일반적으로 요청일로부터 3~5 영업일 이내에 검품이 진행되며, 보고서는 검품 완료 후 24시간 이내에 발송됩니다. 긴급 검품이 필요하신 경우 별도 문의를 통해 신속히 조율 가능합니다.' 
        },
        { 
            id: 'faq3', 
            question: '모든 종류의 제품 검품이 가능한가요?', 
            answer: '네, 두리무역은 소비재부터 산업재까지 다양한 품목에 대한 검품 노하우를 보유하고 있습니다. 특정 제품에 대한 검품 가능 여부가 궁금하시면 "무료 상담 및 견적 요청"을 통해 문의해주세요.' 
        },
        { 
            id: 'faq4', 
            question: '불량이 발견되면 어떻게 처리되나요?', 
            answer: '불량 발견 즉시 실시간으로 사진/영상과 함께 고객님께 보고드립니다. 저희는 명확한 근거 자료와 현장 데이터를 제공하여 공급업체와의 원활한 문제 해결을 적극적으로 지원합니다.' 
        }
    ];

// 페이지 로딩 최적화 - 깜박임 제거
document.addEventListener('DOMContentLoaded', () => {
    // 로딩 화면 처리 제거 (이미 HTML에서 숨김 처리됨)
    
    // Initialize components - 즉시 실행으로 깜박임 방지
    renderServices();
    renderBenefits();
    renderProblems();
    renderProcess();
    renderFAQ();
    renderModals();
    initializeEventListeners();
    initializeAnimations();
    
    // Lucide 아이콘 초기화
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 스마트 비디오 로딩 시스템 초기화
    const videoLoader = new SmartVideoLoader();
    
    // 전역 접근을 위해 window 객체에 추가
    window.videoLoader = videoLoader;
    
    // 调试方法全局访问
    window.playVideo = () => {
        console.log('🎬 수동 비디오 재생 시도');
        videoLoader.forcePlay();
    };
    
    window.getVideoStatus = () => {
        const status = videoLoader.getVideoStatus();
        console.log('📊 현재 비디오 상태:');
        console.table(status);
        return status;
    };
    
    // 3秒后自动检查视频状态并尝试播放
    setTimeout(() => {
        console.log('📊 자동 비디오 상태 확인 중...');
        const status = videoLoader.getVideoStatus();
        
        if (status) {
            console.table(status);
            
            // 如果视频已加载但未播放，尝试强制播放
            if (status.readyState >= 2 && status.paused && !videoLoader.isPlaying) {
                console.log('🔄 비디오가 로드되었지만 재생되지 않음. 강제 재생 시도...');
                videoLoader.forcePlay();
            }
        }
    }, 3000);
    
    // 배터리 최적화 초기화
    const batteryOptimizer = new BatteryOptimizer(videoLoader);
});

// Component Rendering Functions
function renderServices() {
    const container = document.getElementById('services-container');
    if (!container) return;

    services.forEach(service => {
        const card = document.createElement('div');
        card.className = "group relative bg-white/10 backdrop-blur-lg p-6 md:p-10 rounded-2xl md:rounded-3xl text-center hover:bg-white/20 transition-all cursor-pointer hover-transform border border-white/20 modal-trigger";
        card.dataset.modalTarget = service.id;
        card.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-10 rounded-2xl md:rounded-3xl transition-opacity"></div>
            <div class="relative z-10">
                <div class="mb-4 md:mb-8 flex justify-center text-white transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                    <i data-lucide="${service.icon}" class="w-12 h-12 md:w-20 md:h-20"></i>
                </div>
                <h3 class="text-lg sm:text-xl md:text-3xl font-bold mb-3 md:mb-4 text-white">${service.title}</h3>
                <p class="text-sm md:text-base text-gray-300 mb-4 md:mb-6">${service.description}</p>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="text-yellow-400 font-bold text-sm md:text-lg">자세히 보기 →</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderBenefits() {
    const container = document.getElementById('benefits-container');
    if (!container) return;

    benefits.forEach(benefit => {
        const card = document.createElement('div');
        card.className = "group relative bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden hover-transform transition-all";
        card.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-5 group-hover:opacity-10 transition-opacity"></div>
            <div class="relative z-10 p-4 md:p-10">
                <div class="mb-3 md:mb-6 text-transparent bg-clip-text bg-gradient-to-r ${benefit.color} flex justify-center">
                    <i data-lucide="${benefit.icon}" class="w-8 h-8 md:w-16 md:h-16"></i>
                </div>
                <h3 class="text-base sm:text-lg md:text-3xl font-bold text-gray-800 mb-2 md:mb-4">${benefit.title}</h3>
                <p class="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">${benefit.description}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderProblems() {
    const container = document.getElementById('problems-container');
    if (!container) return;

    problemSolutions.forEach(item => {
        const card = document.createElement('div');
        card.className = "group relative bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all cursor-pointer hover-transform overflow-hidden modal-trigger";
        card.dataset.modalTarget = `problem-${item.id}`;
        card.innerHTML = `
            <div class="absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div class="relative z-10 flex flex-col items-center text-center h-full">
                <div class="flex-grow">
                    <div class="mb-4 text-transparent bg-clip-text bg-gradient-to-r ${item.gradient}">
                        <i data-lucide="${item.icon}" class="w-10 h-10 mx-auto"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800 mb-4">${item.title}</h3>
                    <p class="text-gray-600">${item.problem}</p>
                </div>
                <div class="mt-auto pt-4">
                    <span class="inline-flex items-center font-bold bg-gradient-to-r ${item.gradient} text-transparent bg-clip-text group-hover:gap-3 transition-all">
                        해결책 보기 <i data-lucide="chevron-right" class="inline w-5 h-5 ml-1 text-purple-600"></i>
                    </span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderProcess() {
    const container = document.getElementById('process-container');
    if (!container) return;

    processSteps.forEach(item => {
        const stepDiv = document.createElement('div');
        stepDiv.className = "relative flex flex-col items-center text-center group";
        stepDiv.innerHTML = `
            <div class="relative z-10 w-32 h-32 flex items-center justify-center bg-white rounded-full shadow-lg group-hover:scale-110 transition-transform mb-6 border-4 border-purple-100">
                <div class="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <span class="text-5xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">${item.step}</span>
            </div>
            <h3 class="text-xl font-bold mb-3 text-gray-800">${item.title}</h3>
            <p class="text-gray-600 px-4">${item.description}</p>
        `;
        container.appendChild(stepDiv);
    });
}

function renderFAQ() {
    const container = document.getElementById('faq-container');
    if (!container) return;

    faqs.forEach(faq => {
        const faqDiv = document.createElement('div');
        faqDiv.className = "bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-2xl transition-all";
        faqDiv.innerHTML = `
            <button class="w-full text-left p-8 bg-white hover:bg-gray-50 flex justify-between items-center text-lg font-bold text-gray-800 focus:outline-none transition-colors group faq-toggle" data-faq-id="${faq.id}">
                <span class="pr-4">${faq.question}</span>
                <div class="p-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white transition-transform duration-300">
                    <i data-lucide="plus" class="w-5 h-5"></i>
                </div>
            </button>
            <div id="faq-answer-${faq.id}" class="transition-all duration-500 ease-in-out overflow-hidden max-h-0">
                <div class="p-8 pt-0 text-gray-700 leading-relaxed">
                    <p>${faq.answer}</p>
                </div>
            </div>
        `;
        container.appendChild(faqDiv);
    });
}

// Event Listeners
function initializeEventListeners() {
    // Navigation scroll effect
    initializeNavigation();
    
    // Mobile menu
    initializeMobileMenu();
    
    // Counter animation
    initializeCounters();
    
    // FAQ accordion
    initializeFAQ();
    
    // Modal system
    initializeModals();
    
    // Smooth scrolling
    initializeSmoothScrolling();
}

function initializeNavigation() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    // 네비게이션바 고정 스타일 - 깜박임 제거
    nav.classList.add('shadow-lg');

    // 스크롤 효과 단순화
    const handleScroll = debounce(() => {
        // 클래스 변경 최소화
        if (window.scrollY > 50) {
            if (!nav.classList.contains('shadow-xl')) {
                nav.classList.add('shadow-xl');
            }
        } else {
            if (nav.classList.contains('shadow-xl')) {
                nav.classList.remove('shadow-xl');
            }
        }
    }, 50); // 디바운스 시간 증가

    window.addEventListener('scroll', handleScroll);
}

function initializeMobileMenu() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }
}

function initializeCounters() {
    const statsSection = document.getElementById('stats-section');
    if (!statsSection) {
        return;
    }

    const animateCounters = () => {
        const counters = [
            { id: 'counter-years', end: 8, duration: 2000 },
            { id: 'counter-satisfaction', end: 95, duration: 2000 },
            { id: 'counter-projects', end: 3000, duration: 2000 }
        ];
        
        counters.forEach(counter => {
            const el = document.getElementById(counter.id);
            if (el && !el.classList.contains('animated')) {
                el.classList.add('animated');
                animateCounter(el, counter.end, counter.duration);
            }
        });
    };

    // 즉시 실행
    setTimeout(() => {
        animateCounters();
    }, 1000);

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    counterObserver.observe(statsSection);
}

function animateCounter(element, end, duration) {
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let currentFrame = 0;
    
    // DOM 업데이트 함수 - 깜박임 제거
    const updateValue = (value) => {
        element.textContent = value.toString(); // 하나만 사용
    };
    
    // 즉시 0으로 시작
    updateValue(0);
    
    const timer = setInterval(() => {
        currentFrame++;
        const progress = currentFrame / totalFrames;
        const currentValue = Math.round(end * progress);
        
        // DOM 업데이트
        updateValue(currentValue);
        
        if (currentFrame >= totalFrames) {
            clearInterval(timer);
            updateValue(end);
        }
    }, frameDuration);
}

function initializeFAQ() {
    let activeFaqId = null;
    
    document.querySelectorAll('.faq-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const faqId = button.dataset.faqId;
            const answer = document.getElementById(`faq-answer-${faqId}`);
            const icon = button.querySelector('div');

            // Close previously active FAQ
            if (activeFaqId && activeFaqId !== faqId) {
                const lastActiveAnswer = document.getElementById(`faq-answer-${activeFaqId}`);
                const lastActiveIcon = document.querySelector(`[data-faq-id="${activeFaqId}"] div`);
                if (lastActiveAnswer) lastActiveAnswer.style.maxHeight = '0px';
                if (lastActiveIcon) lastActiveIcon.classList.remove('rotate-45');
            }
            
            // Toggle current FAQ
            if (answer && answer.style.maxHeight && answer.style.maxHeight !== '0px') {
                answer.style.maxHeight = '0px';
                if (icon) icon.classList.remove('rotate-45');
                activeFaqId = null;
            } else if (answer) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                if (icon) icon.classList.add('rotate-45');
                activeFaqId = faqId;
            }
        });
    });
}

function initializeModals() {
    const openModal = (id) => {
        const modal = document.getElementById(`modal-${id}`);
        if (modal) {
            document.body.style.overflow = 'hidden';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    const closeModal = (modal) => {
        if (modal) {
            document.body.style.overflow = '';
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    // Modal triggers
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-trigger') || e.target.closest('.modal-trigger')) {
            const trigger = e.target.classList.contains('modal-trigger') ? e.target : e.target.closest('.modal-trigger');
            openModal(trigger.dataset.modalTarget);
        }
    });

    // Modal close buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.flex').forEach(closeModal);
        }
    });
}

function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initializeAnimations() {
    // Intersection Observer for fade-in animations
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                sectionObserver.unobserve(entry.target);
            }
        });
    }, { 
        threshold: 0.1,
        rootMargin: '50px'
    });

    document.querySelectorAll('.fade-in-section').forEach(section => {
        sectionObserver.observe(section);
    });

    // 패럴랙스 효과 제거 - 깜박임 원인
    // 비디오는 고정 위치로 유지
}

// Modal Creation
function renderModals() {
    const modalsContainer = document.getElementById('modals-container');
    if (!modalsContainer) return;

    const createModal = (id, title, content) => {
        const modal = document.createElement('div');
        modal.id = `modal-${id}`;
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75 backdrop-blur-md hidden modal';
        modal.innerHTML = `
            <div class="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl modal-content" role="dialog" aria-modal="true">
                <button class="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all z-10 group modal-close" aria-label="모달 닫기">
                    <i data-lucide="x" class="w-6 h-6 text-gray-600 group-hover:rotate-90 transition-transform duration-300"></i>
                </button>
                <div class="overflow-y-auto max-h-[90vh] rounded-3xl">
                    ${title}
                    <div class="p-10 text-gray-800 space-y-4">
                       ${content}
                    </div>
                </div>
            </div>
        `;
        modalsContainer.appendChild(modal);
    };

    // Service Modals
    services.forEach(service => {
        const detailsHtml = service.details.map(detail => `
            <div class="flex items-start group">
                <div class="p-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 mr-3 mt-1 flex-shrink-0">
                    <i data-lucide="check-circle" class="w-5 h-5 text-white"></i>
                </div>
                <span class="text-gray-700 group-hover:text-gray-900 transition-colors">${detail}</span>
            </div>
        `).join('');
        
        const titleHtml = `<div class="bg-gradient-to-br ${service.gradient} text-white p-8 rounded-t-3xl"><h3 class="text-3xl font-black">${service.title}</h3></div>`;
        const contentHtml = `
            <p class="text-xl font-medium text-gray-700">${service.fullDescription}</p>
            <div class="grid md:grid-cols-2 gap-6 mt-8">${detailsHtml}</div>
            <div class="text-center mt-8">
                <a href="${service.reportUrl}" target="_blank" rel="noopener noreferrer" class="inline-block bg-gradient-to-r ${service.gradient} text-white font-bold py-4 px-10 rounded-full transition-all transform hover:scale-105 hover:shadow-2xl">
                    샘플 리포트 보기
                </a>
            </div>
        `;
        createModal(service.id, titleHtml, contentHtml);
    });

    // Problem Modals
    problemSolutions.forEach(problem => {
        const effectsHtml = problem.effects.map(effect => `
            <div class="flex items-center">
                <i data-lucide="check-circle" class="w-6 h-6 text-green-600 mr-3 flex-shrink-0"></i>
                <span class="text-gray-700">${effect}</span>
            </div>
        `).join('');
        
        const titleHtml = `<div class="bg-gradient-to-br from-purple-700 to-indigo-700 text-white p-8 rounded-t-3xl"><h3 class="text-3xl font-black flex items-center"><span class="text-4xl mr-4">💡</span> ${problem.title} 문제 해결책</h3></div>`;
        const contentHtml = `
            <div class="mb-6">
                <p class="text-xl mb-4"><strong class="text-red-600">문제점:</strong> ${problem.fullProblem}</p>
                <p class="text-xl text-blue-700 font-bold"><strong>두리무역의 해결책:</strong> ${problem.solution}</p>
            </div>
            <div class="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl">
                <p class="text-lg font-bold mb-3 text-gray-800">기대 효과:</p>
                <div class="space-y-2">${effectsHtml}</div>
            </div>
        `;
        createModal(`problem-${problem.id}`, titleHtml, contentHtml);
    });

    // Legal Modals
    createLegalModals(createModal);
}

function createLegalModals(createModal) {
    // Terms Modal
    const termsTitle = `<div class="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-8 rounded-t-3xl"><h3 class="text-3xl font-black">이용약관</h3></div>`;
    const termsContent = `
        <p><strong>제1조 (목적)</strong><br/>본 약관은 두리무역이 제공하는 검품 대행 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        <p><strong>제2조 (정의)</strong><br/>① "서비스"라 함은 회사가 제공하는 중국 출장 검품, 공장 실사, 적재 검사 등 제반 서비스를 의미합니다.<br/>② "회원"이라 함은 본 약관에 따라 서비스를 이용하는 고객을 의미합니다.</p>
        <p><strong>제3조 (서비스 제공)</strong><br/>회사는 안정적인 서비스 제공을 위해 최선을 다하며, 부득이한 사유로 서비스 제공을 일시 중단할 수 있습니다.</p>
        <p class="text-sm text-gray-500 mt-8">본 약관은 2018년 6월 19일부터 시행됩니다.</p>
    `;
    createModal('terms', termsTitle, termsContent);

    // Privacy Modal
    const privacyTitle = `<div class="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-8 rounded-t-3xl"><h3 class="text-3xl font-black">개인정보처리방침</h3></div>`;
    const privacyContent = `
        <p>두리무역은 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 개인정보 보호법 등 관련 법령을 준수하여 개인정보를 보호합니다.</p>
        <p><strong>1. 개인정보의 처리 목적</strong><br/>서비스 신청 및 진행 관리, 본인 식별/인증, 불만 처리 등 민원 처리, 고지사항 전달 등</p>
        <p><strong>2. 개인정보의 보유 기간</strong><br/>법령에 따른 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
        <p><strong>3. 개인정보 보호책임자</strong><br/>- 성명: 김두호<br/>- 직책: 대표<br/>- 연락처: 031-699-8781, duly@duly.co.kr</p>
        <p class="text-sm text-gray-500 mt-8">본 개인정보처리방침은 2018년 6월 5일부터 시행됩니다.</p>
    `;
    createModal('privacy', privacyTitle, privacyContent);
} 