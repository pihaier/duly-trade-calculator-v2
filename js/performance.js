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
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                // 에러를 조용히 처리 (배포 환경에서만 작동)
                if (window.DEBUG_MODE) {
                    console.log('SW registration failed: ', registrationError);
                }
            });
    });
} 