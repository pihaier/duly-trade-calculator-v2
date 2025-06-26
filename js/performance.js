/**
 * 🚀 성능 모니터링 모듈 v2.0 - INP 최적화
 * 
 * Interaction to Next Paint (INP) 최적화 및 성능 모니터링
 * 
 * @version 2.0.0 - INP 최적화
 * @updated 2025-06-26
 */

class PerformanceMonitor {
    constructor() {
        this.isEnabled = true;
        this.metrics = {
            inp: [],
            fcp: null,
            lcp: null,
            cls: null,
            fid: null
        };
        
        // INP 임계값 (밀리초)
        this.INP_THRESHOLDS = {
            GOOD: 200,
            NEEDS_IMPROVEMENT: 500,
            POOR: 500
        };
        
        this.init();
    }

    /**
     * 초기화
     */
    init() {
        if (!this.isEnabled) return;
        
        this.setupINPMonitoring();
        this.setupWebVitalsMonitoring();
        this.setupEventOptimization();
        
        // 페이지 로드 완료 후 성능 리포트
        if (document.readyState === 'complete') {
            this.reportPerformance();
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.reportPerformance(), 1000);
            });
        }
    }

    /**
     * INP 모니터링 설정
     */
    setupINPMonitoring() {
        // PerformanceObserver로 INP 측정
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.name === 'event') {
                            this.recordINP(entry);
                        }
                    }
                });
                
                observer.observe({ type: 'event', buffered: true });
            } catch (error) {
                console.warn('INP monitoring setup failed:', error);
            }
        }

        // 수동 INP 측정 (fallback)
        this.setupManualINPTracking();
    }

    /**
     * 수동 INP 추적 설정
     */
    setupManualINPTracking() {
        let interactionStart = 0;
        
        // 클릭 이벤트 모니터링
        document.addEventListener('click', (event) => {
            interactionStart = performance.now();
            
            // 다음 프레임에서 INP 측정
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const inp = performance.now() - interactionStart;
                    this.recordINPManual(inp, 'click', event.target);
                });
            });
        }, { capture: true, passive: true });

        // 키보드 이벤트 모니터링
        document.addEventListener('keydown', (event) => {
            interactionStart = performance.now();
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const inp = performance.now() - interactionStart;
                    this.recordINPManual(inp, 'keydown', event.target);
                });
            });
        }, { capture: true, passive: true });
    }

    /**
     * INP 기록 (PerformanceObserver)
     */
    recordINP(entry) {
        const inp = entry.processingEnd - entry.processingStart;
        
        this.metrics.inp.push({
            value: inp,
            timestamp: Date.now(),
            type: entry.name,
            target: entry.target?.tagName || 'unknown'
        });

        // INP가 임계값을 초과하면 경고
        if (inp > this.INP_THRESHOLDS.NEEDS_IMPROVEMENT) {
            console.warn(`🐌 High INP detected: ${inp.toFixed(1)}ms (${entry.name})`);
        }
    }

    /**
     * INP 기록 (수동)
     */
    recordINPManual(inp, type, target) {
        this.metrics.inp.push({
            value: inp,
            timestamp: Date.now(),
            type: type,
            target: target?.tagName || 'unknown'
        });

        // INP가 임계값을 초과하면 경고 및 최적화 제안
        if (inp > this.INP_THRESHOLDS.NEEDS_IMPROVEMENT) {
            console.warn(`🐌 High INP detected: ${inp.toFixed(1)}ms (${type})`);
            
            // 심각한 INP 문제인 경우 사용자에게 알림
            if (inp > this.INP_THRESHOLDS.POOR * 2) {
                this.showINPWarning(inp);
            }
        }
    }

    /**
     * INP 경고 표시
     */
    showINPWarning(inp) {
        // 한 번만 표시하도록 제한
        if (this.inpWarningShown) return;
        this.inpWarningShown = true;

        console.warn(`⚠️ 심각한 성능 문제 감지: INP ${inp.toFixed(1)}ms`);
        
        // 개발자 모드에서만 표시
        if (window.location.hostname === 'localhost' || window.location.hostname.includes('vercel')) {
            setTimeout(() => {
                console.log('💡 INP 최적화 제안:', {
                    '1. API 호출': '비동기 처리 및 청크 분할',
                    '2. DOM 조작': '배치 처리 및 가상화',
                    '3. 계산 작업': 'Web Worker 또는 시간 분할',
                    '4. 이벤트 핸들러': '디바운싱 및 쓰로틀링'
                });
            }, 1000);
        }
    }

    /**
     * Web Vitals 모니터링 설정
     */
    setupWebVitalsMonitoring() {
        // FCP (First Contentful Paint)
        this.observePerformanceEntry('paint', (entries) => {
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
                this.metrics.fcp = fcpEntry.startTime;
            }
        });

        // LCP (Largest Contentful Paint)
        this.observePerformanceEntry('largest-contentful-paint', (entries) => {
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                this.metrics.lcp = lastEntry.startTime;
            }
        });

        // CLS (Cumulative Layout Shift)
        this.observePerformanceEntry('layout-shift', (entries) => {
            let clsValue = 0;
            for (const entry of entries) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.metrics.cls = clsValue;
        });

        // FID (First Input Delay)
        this.observePerformanceEntry('first-input', (entries) => {
            const firstInput = entries[0];
            if (firstInput) {
                this.metrics.fid = firstInput.processingStart - firstInput.startTime;
            }
        });
    }

    /**
     * PerformanceEntry 관찰
     */
    observePerformanceEntry(type, callback) {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    callback(list.getEntries());
                });
                observer.observe({ type, buffered: true });
            } catch (error) {
                console.warn(`Performance observation failed for ${type}:`, error);
            }
        }
    }

    /**
     * 이벤트 최적화 설정
     */
    setupEventOptimization() {
        // 스크롤 이벤트 최적화
        this.optimizeScrollEvents();
        
        // 리사이즈 이벤트 최적화
        this.optimizeResizeEvents();
        
        // 입력 이벤트 최적화
        this.optimizeInputEvents();
    }

    /**
     * 스크롤 이벤트 최적화
     */
    optimizeScrollEvents() {
        let scrollTimeout;
        let isScrolling = false;

        const optimizedScrollHandler = this.throttle(() => {
            if (!isScrolling) {
                isScrolling = true;
                requestAnimationFrame(() => {
                    // 스크롤 관련 DOM 업데이트
                    this.updateScrollPosition();
                    isScrolling = false;
                });
            }
        }, 16); // 60fps

        window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
    }

    /**
     * 리사이즈 이벤트 최적화
     */
    optimizeResizeEvents() {
        const optimizedResizeHandler = this.debounce(() => {
            // 리사이즈 관련 DOM 업데이트
            this.updateLayout();
        }, 250);

        window.addEventListener('resize', optimizedResizeHandler, { passive: true });
    }

    /**
     * 입력 이벤트 최적화
     */
    optimizeInputEvents() {
        // 모든 input 요소에 대해 최적화된 이벤트 핸들러 적용
        document.addEventListener('input', this.debounce((event) => {
            if (event.target.matches('input, textarea, select')) {
                // 입력 검증 및 처리를 다음 프레임으로 지연
                requestAnimationFrame(() => {
                    this.handleOptimizedInput(event);
                });
            }
        }, 150), { passive: true });
    }

    /**
     * 최적화된 입력 처리
     */
    handleOptimizedInput(event) {
        // 메인 스레드 블로킹 방지
        setTimeout(() => {
            // 입력 검증 로직
            this.validateInput(event.target);
        }, 0);
    }

    /**
     * 입력 검증
     */
    validateInput(input) {
        // 실제 검증 로직은 각 모듈에서 처리
        if (input.dataset.validate) {
            // 검증 로직 실행
        }
    }

    /**
     * 스크롤 위치 업데이트
     */
    updateScrollPosition() {
        // 스크롤 인디케이터 업데이트 등
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        
        // 스크롤 관련 UI 업데이트
        document.documentElement.style.setProperty('--scroll-percent', `${scrollPercent}%`);
    }

    /**
     * 레이아웃 업데이트
     */
    updateLayout() {
        // 반응형 레이아웃 조정
        const width = window.innerWidth;
        
        if (width < 768) {
            document.body.classList.add('mobile');
            document.body.classList.remove('desktop');
        } else {
            document.body.classList.add('desktop');
            document.body.classList.remove('mobile');
        }
    }

    /**
     * 쓰로틀링 유틸리티
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 디바운싱 유틸리티
     */
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    /**
     * 성능 리포트 생성
     */
    reportPerformance() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: {
                ...this.metrics,
                avgINP: this.calculateAverageINP(),
                maxINP: this.calculateMaxINP(),
                inpScore: this.calculateINPScore()
            },
            recommendations: this.generateRecommendations()
        };

        // 콘솔에 성능 리포트 출력
        console.group('🚀 성능 리포트');
        console.log('📊 Web Vitals:', {
            'FCP': this.metrics.fcp ? `${this.metrics.fcp.toFixed(1)}ms` : 'N/A',
            'LCP': this.metrics.lcp ? `${this.metrics.lcp.toFixed(1)}ms` : 'N/A',
            'FID': this.metrics.fid ? `${this.metrics.fid.toFixed(1)}ms` : 'N/A',
            'CLS': this.metrics.cls ? this.metrics.cls.toFixed(3) : 'N/A'
        });
        console.log('⚡ INP 분석:', {
            '평균 INP': report.metrics.avgINP ? `${report.metrics.avgINP.toFixed(1)}ms` : 'N/A',
            '최대 INP': report.metrics.maxINP ? `${report.metrics.maxINP.toFixed(1)}ms` : 'N/A',
            'INP 점수': report.metrics.inpScore,
            '측정 횟수': this.metrics.inp.length
        });
        
        if (report.recommendations.length > 0) {
            console.log('💡 최적화 권장사항:', report.recommendations);
        }
        console.groupEnd();

        return report;
    }

    /**
     * 평균 INP 계산
     */
    calculateAverageINP() {
        if (this.metrics.inp.length === 0) return null;
        
        const sum = this.metrics.inp.reduce((acc, inp) => acc + inp.value, 0);
        return sum / this.metrics.inp.length;
    }

    /**
     * 최대 INP 계산
     */
    calculateMaxINP() {
        if (this.metrics.inp.length === 0) return null;
        
        return Math.max(...this.metrics.inp.map(inp => inp.value));
    }

    /**
     * INP 점수 계산
     */
    calculateINPScore() {
        const avgINP = this.calculateAverageINP();
        if (!avgINP) return 'N/A';

        if (avgINP <= this.INP_THRESHOLDS.GOOD) return '우수';
        if (avgINP <= this.INP_THRESHOLDS.NEEDS_IMPROVEMENT) return '개선 필요';
        return '나쁨';
    }

    /**
     * 최적화 권장사항 생성
     */
    generateRecommendations() {
        const recommendations = [];
        const avgINP = this.calculateAverageINP();
        const maxINP = this.calculateMaxINP();

        if (avgINP > this.INP_THRESHOLDS.GOOD) {
            recommendations.push('평균 INP가 높습니다. 이벤트 핸들러 최적화를 고려하세요.');
        }

        if (maxINP > this.INP_THRESHOLDS.POOR) {
            recommendations.push('일부 상호작용에서 심각한 지연이 발생합니다. 메인 스레드 블로킹 작업을 확인하세요.');
        }

        if (this.metrics.inp.length > 20) {
            const slowInteractions = this.metrics.inp.filter(inp => inp.value > this.INP_THRESHOLDS.NEEDS_IMPROVEMENT);
            if (slowInteractions.length > 0) {
                recommendations.push(`${slowInteractions.length}개의 느린 상호작용이 감지되었습니다.`);
            }
        }

        return recommendations;
    }

    /**
     * 성능 모니터링 비활성화
     */
    disable() {
        this.isEnabled = false;
    }

    /**
     * 성능 모니터링 활성화
     */
    enable() {
        this.isEnabled = true;
    }
}

// 성능 모니터 인스턴스 생성 및 전역 등록
const performanceMonitor = new PerformanceMonitor();
window.performanceMonitor = performanceMonitor;

// 성능 최적화 모듈
class PerformanceOptimizer {
    constructor() {
        this.observers = new Map();
        this.debounceTimers = new Map();
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        // 로딩 최적화
        this.optimizeLoading();
        
        // 이미지 지연 로딩
        this.setupLazyLoading();
        
        // 스크롤 최적화
        this.optimizeScrolling();
        
        // 이벤트 최적화
        this.optimizeEvents();
        
        this.isInitialized = true;
    }

    optimizeLoading() {
        // 폰트 로딩 최적화
        if ('fontDisplay' in document.documentElement.style) {
            const fontFaces = document.querySelectorAll('link[href*="font"]');
            fontFaces.forEach(link => {
                link.setAttribute('rel', 'preload');
                link.setAttribute('as', 'font');
                link.setAttribute('crossorigin', '');
            });
        }

        // 중요하지 않은 리소스 지연 로딩
        requestIdleCallback(() => {
            this.loadNonCriticalResources();
        });
    }

    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        img.classList.add('loaded');
                    }
                    imageObserver.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });

        this.observers.set('images', imageObserver);
    }

    optimizeScrolling() {
        let ticking = false;
        
        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // 스크롤 관련 업데이트
                    this.updateScrollElements();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    updateScrollElements() {
        const scrollY = window.scrollY;
        const nav = document.getElementById('main-nav');
        
        if (nav) {
            nav.classList.toggle('scrolled', scrollY > 50);
        }
    }

    optimizeEvents() {
        // 터치 이벤트 최적화
        if ('ontouchstart' in window) {
            document.body.classList.add('touch-device');
        }

        // 리사이즈 이벤트 디바운싱
        const debouncedResize = this.debounce(() => {
            this.handleResize();
        }, 250);

        window.addEventListener('resize', debouncedResize, { passive: true });
    }

    handleResize() {
        // 뷰포트 변경 시 최적화
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile', isMobile);
        
        // 비디오 최적화
        const video = document.getElementById('hero-video');
        if (video && isMobile) {
            video.pause();
            video.style.display = 'none';
        }
    }

    debounce(func, wait) {
        return (...args) => {
            const key = func.name || 'anonymous';
            clearTimeout(this.debounceTimers.get(key));
            this.debounceTimers.set(key, setTimeout(() => func.apply(this, args), wait));
        };
    }

    loadNonCriticalResources() {
        // 비중요 CSS 로딩
        const nonCriticalCSS = document.querySelectorAll('link[rel="preload"][as="style"]');
        nonCriticalCSS.forEach(link => {
            link.rel = 'stylesheet';
        });

        // 비중요 스크립트 로딩 (필요시 추가)
        // 현재 추가 스크립트 없음
    }

    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    const optimizer = new PerformanceOptimizer();
    optimizer.init();
    
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
        optimizer.cleanup();
    });
});

// 서비스 워커 등록 (캐싱 최적화)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                // Service Worker 등록 성공 (조용히 처리)
            })
            .catch(registrationError => {
                // 에러를 조용히 처리 (배포 환경에서만 작동)
            });
    });
} 