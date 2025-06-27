// Google Analytics 4 설정
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

// GA4 측정 ID - 실제 ID로 교체 필요
// gtag('config', 'G-XXXXXXXXXX');

// 페이지뷰 추적
gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname
});

// 스크롤 깊이 추적
let maxScroll = 0;
window.addEventListener('scroll', () => {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (scrollPercent === 25 || scrollPercent === 50 || scrollPercent === 75 || scrollPercent === 100) {
            gtag('event', 'scroll', {
                percent_scrolled: scrollPercent
            });
        }
    }
});

// 외부 링크 클릭 추적
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link && link.href && !link.href.includes(window.location.hostname)) {
        gtag('event', 'click', {
            link_url: link.href,
            link_text: link.textContent,
            outbound: true
        });
    }
});

// 문의 버튼 클릭 추적
document.addEventListener('click', (e) => {
    if (e.target.textContent && e.target.textContent.includes('문의')) {
        gtag('event', 'generate_lead', {
            value: 1,
            currency: 'KRW'
        });
    }
}); 