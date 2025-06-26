// 서비스 워커 - 캐싱 최적화
const CACHE_NAME = 'duly-trade-v2.3.1';
const STATIC_CACHE = 'duly-static-v2.3.1';
const DYNAMIC_CACHE = 'duly-dynamic-v2.3.1';

// 캐시할 정적 리소스
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/calculator.html',
    '/lib/tailwind.min.css',
    '/lib/fonts.css',
    '/lib/lucide.js',
    '/lib/three.min.js',
    '/lib/chart.js',
    '/js/main.js',
    '/js/app.js',
    '/js/apiService.js',
    '/js/config.js',
    '/js/performance.js',
    '/images/hero-fallback.jpg',
    '/manifest.json'
];

// 동적 캐시 전략이 필요한 리소스
const DYNAMIC_ASSETS = [
    '/api/exchange-rate',
    '/api/tariff-rate',
    '/api/health'
];

// 설치 이벤트
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // 즉시 활성화
                return self.skipWaiting();
            })
            .catch(error => {
                // 캐시 설치 실패 조용히 처리
            })
    );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // 오래된 캐시 삭제
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== CACHE_NAME) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // 모든 클라이언트에서 즉시 제어
                return self.clients.claim();
            })
    );
});

// 페치 이벤트 (네트워크 요청 가로채기)
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 같은 도메인의 요청만 처리
    if (url.origin !== location.origin) {
        return;
    }

    // GET 요청만 캐싱
    if (request.method !== 'GET') {
        return;
    }

    // API 요청 처리
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // 정적 리소스 처리
    if (isStaticAsset(url.pathname)) {
        event.respondWith(handleStaticAsset(request));
        return;
    }

    // HTML 페이지 처리
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(handlePageRequest(request));
        return;
    }

    // 기타 리소스 (이미지, 폰트 등)
    event.respondWith(handleOtherAssets(request));
});

// 정적 리소스 처리 (캐시 우선)
async function handleStaticAsset(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.status === 200) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        return new Response('Asset not available', { status: 404 });
    }
}

// API 요청 처리 (네트워크 우선, 캐시 백업)
async function handleApiRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        // 200이 아닌 성공 응답도 반환 (캐싱하지 않음)
        if (networkResponse.ok) {
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // API 실패 시 기본 응답
        return new Response(JSON.stringify({
            error: 'Service temporarily unavailable',
            message: '서비스가 일시적으로 사용할 수 없습니다.'
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// HTML 페이지 처리 (네트워크 우선)
async function handlePageRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        // 200이 아닌 성공 응답도 반환 (캐싱하지 않음)
        if (networkResponse.ok) {
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 오프라인 페이지 반환
        return caches.match('/index.html');
    }
}

// 기타 리소스 처리
async function handleOtherAssets(request) {
    try {
        // 캐시 먼저 확인
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            // 백그라운드에서 업데이트
            fetch(request).then(response => {
                if (response.ok && response.status === 200) {
                    const cache = caches.open(DYNAMIC_CACHE);
                    cache.then(c => c.put(request, response));
                }
            }).catch(() => {});
            
            return cachedResponse;
        }

        // 네트워크에서 가져오기
        const networkResponse = await fetch(request);
        
        // 206 (Partial Content) 및 기타 특수 상태 코드는 캐싱하지 않음
        if (networkResponse.ok && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        return new Response('Asset not available', { status: 404 });
    }
}

// 정적 리소스 판별
function isStaticAsset(pathname) {
    return STATIC_ASSETS.some(asset => asset === pathname) ||
           pathname.startsWith('/lib/') ||
           pathname.startsWith('/js/') ||
           pathname.startsWith('/css/') ||
           pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/);
}

// 메시지 처리 (캐시 관리)
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// 백그라운드 동기화 (미래 확장용)
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // 백그라운드에서 캐시 업데이트
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        
        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                }
            } catch (error) {
                // 백그라운드 동기화 실패 조용히 처리
            }
        }
    } catch (error) {
        // 백그라운드 동기화 실패 조용히 처리
    }
} 