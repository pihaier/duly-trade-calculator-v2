# 🚢 두리무역 통합 무역 비용 계산기

중국 수입 전문가의 정밀 계산 시스템 | 관세청 API 연동 기반

## 📋 프로젝트 개요

두리무역의 통합 무역 비용 계산기는 중국 수입 비즈니스에 특화된 전문 도구입니다. 관세청 공식 API와 연동하여 정확한 환율, 관세율, 수입요건 정보를 실시간으로 제공합니다.

### 🎯 주요 기능
- **CBM 계산기**: 화물 부피 및 물류비 계산
- **총 비용 계산기**: 관세, 부가세, 물류비 등 종합 비용 분석
- **실시간 환율**: 관세청 공식 환율 API 연동
- **관세율 조회**: HS Code 기반 정확한 관세율 확인
- **수입요건 확인**: 품목별 수입 규제사항 조회
- **온라인 신청서**: 중국 출장검품 서비스 신청 (Google Sheets 연동)

## 🏗️ **프로젝트 구조 (정리 후)**

```
/
├── 📄 index.html              ← 🎯 메인 페이지
├── 📄 calculator.html          ← 🧮 계산기 페이지
├── 📄 application.html         ← 📝 검품 신청서 페이지
├── 🎨 style.css                ← 🎨 메인 스타일시트
├── 🎨 calculator.css           ← 🎨 계산기 전용 스타일시트
├── 📁 js/                       ← 💡 JavaScript 로직
│   ├── main.js                 ← 🎮 UI 컨트롤러
│   ├── apiService.js           ← 🔌 API 통신
│   ├── cbmCalculator.js        ← 📦 CBM 계산기 로직
│   ├── totalCostCalculator.js  ← 💰 총 비용 계산기 로직
│   └── application.js          ← 📋 신청서 페이지 로직
├── 📁 api/                      ← ☁️ Vercel 서버리스 함수
│   ├── exchange-rate.js        ← 💱 환율 조회
│   ├── tariff-rate.js          ← 📜 관세율 조회
│   └── ...
├── 📄 google-apps-script.js    ← 📊 Google Sheets 연동 스크립트
├── 📄 vercel.json              ← 🚀 Vercel 배포 설정
├── 📄 package.json              ← 📦 Node.js 의존성
└── 📄 README.md                 ← 📖 프로젝트 문서
```

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Three.js, Chart.js
- **Backend**: Node.js, Vercel Serverless Functions
- **API**: 대한민국 관세청 Open API
- **Deployment**: Vercel

## 🚀 배포 정보

- **메인 URL**: https://duly.co.kr
- **계산기 URL**: https://duly.co.kr/calculator
- **신청서 URL**: https://duly.co.kr/application
- **GitHub 저장소**: https://github.com/pihaier/duly-trade-calculator-v2
- **자동 배포**: Git 푸시 시 Vercel 자동 배포 활성화 ✅

### 🔄 배포 프로세스
1. 로컬에서 코드 수정
2. Git 커밋 및 푸시
3. Vercel 자동 감지 및 배포
4. 실시간 업데이트 완료

## 🛠️ 문제 해결 기록

### 1. CSS 스타일 충돌 문제
- **현상**: 클라우드 배포 시 계산기 페이지의 UI가 깨지는 문제 (탭 버튼 및 패널 배경색 오류)
- **원인**: 메인 `style.css`(어두운 테마)와 `calculator/style.css`(밝은 테마) 간의 스타일 충돌 및 우선순위 문제
- **해결**:
    -   모든 컴포넌트 스타일을 밝은 테마로 통일
    -   `!important`를 사용하여 `calculator.css`의 스타일 우선순위를 명시적으로 지정하여 문제 해결

### 2. 관세율 조회 결과 누락 문제
- **현상**: API에서 3개의 관세율(0% 포함)을 반환했으나, 화면에는 2개만 표시되는 문제
- **원인**:
    1.  초기 분석 시, 수정 대상이 아닌 `calculator/js/` 내의 파일을 수정함
    2.  실제 사용되는 `js/totalCostCalculator.js` 파일에서 `||` 연산자가 `0` 값을 `falsy`로 처리하여 필터링하는 논리적 오류 발견
- **해결**:
    -   `||` 연산자 대신 `!== undefined`를 사용하여 `0` 값이 유효한 데이터로 처리되도록 수정
    -   디버깅을 위한 상세 로그를 추가하여 데이터 흐름을 명확히 함

### 3. 네이버 SEO 최적화 완료 (2025-06-27)
- **목적**: 네이버 검색엔진 최적화를 통한 국내 검색 노출 개선
- **주요 작업**:
    1.  **네이버 사이트맵 업데이트** (`naver-sitemap.xml`)
        -   lastmod 날짜를 2024-06-20 → 2025-06-27로 업데이트
        -   누락된 계산기 페이지(`/calculator`) 및 신청서 페이지(`/application`) 추가
        -   각 페이지별 뉴스 키워드 최적화
    2.  **계산기 페이지 SEO 강화** (`calculator.html`)
        -   메타 description 상세화 및 키워드 확장
        -   네이버 전용 메타 태그 추가 (`naver:title`, `naver:description`, `news_keywords`)
        -   구조화된 데이터(JSON-LD) 추가 - WebApplication, SoftwareApplication 스키마
        -   Open Graph 및 Twitter Card 완성
    3.  **신청서 페이지 SEO 강화** (`application.html`)
        -   페이지 제목 및 메타 description 최적화
        -   네이버/다음 검색엔진 최적화 태그 추가
        -   Service 스키마 구조화된 데이터 추가
    4.  **일반 사이트맵 업데이트** (`sitemap.xml`)
        -   모든 페이지 lastmod 날짜 최신화 (2025-06-27)
        -   신청서 페이지 추가 및 우선순위 재조정
- **기대 효과**:
    -   네이버 검색 결과 노출 개선
    -   리치 스니펫을 통한 클릭률 향상
    -   검색엔진의 페이지 이해도 증진

### 4. 네이버 SEO 전략 가이드 작성 (2025-06-27)
- **목적**: 체계적인 네이버 SEO 실행을 위한 종합 가이드 문서 생성
- **주요 내용**: `NAVER_SEO_STRATEGY_2025.md` 파일 생성
    1.  **시장 분석**: 네이버 검색시장 점유율 57.86% vs 구글 32.98% 현황
    2.  **등록 가이드**: 네이버 서치어드바이저 완전 등록 프로세스
    3.  **차별화 전략**: 홈페이지와 계산기 페이지별 맞춤형 SEO 전략
    4.  **플랫폼 활용**: 네이버 블로그, 카페, 지식iN 활용 전략
    5.  **기술 최적화**: 모바일 최적화, 페이지 속도, 구조화 데이터
    6.  **콘텐츠 전략**: 키워드 최적화, 제목 작성법, 본문 구조화
    7.  **실행 계획**: 4주차 단계별 타임라인 및 성과 측정 방법
- **실행 방향**:
    -   블로그 없이 웹사이트만으로 SEO 최적화 전략
    -   홈페이지(브랜드/서비스 중심) vs 계산기(기능/도구 중심) 차별화
    -   네이버 자체 서비스 적극 활용을 통한 트래픽 확보

### 5. 계산기 페이지 키워드 구체화 최적화 (2025-07-02)
- **목적**: 사용자 요청에 따른 계산기 페이지 키워드를 CBM계산기, 수입금액계산기 등으로 구체화
- **주요 작업**:
    1.  **페이지 제목 변경**: "🚢 통합 무역 비용 계산기" → "CBM계산기 | 수입금액계산기 | 두리무역 통합 무역비용 계산기"
    2.  **메타 태그 강화**: 키워드를 CBM계산기, 수입금액계산기, 관세계산기, 무역계산기, 컨테이너적재계산기, 물류비계산기, 환율계산기, 팔레트계산기, 중국수입계산기, 무역비용계산기로 확장
    3.  **네이버 전용 태그 최적화**: naver:title, naver:description, news_keywords 모두 새 키워드로 업데이트
    4.  **Open Graph/Twitter Card 개선**: SNS 공유 시 노출되는 제목과 설명을 구체적 키워드로 변경
    5.  **구조화된 데이터 업데이트**: JSON-LD의 WebApplication, WebPage, SoftwareApplication 스키마에 새 키워드 반영
    6.  **UI 텍스트 개선**: 탭 버튼을 "CBM계산기", "수입금액계산기"로 변경하여 일관성 확보
- **네이버 사이트맵 업데이트**: 계산기 페이지의 news:title과 news:keywords를 새 키워드로 갱신
- **SEO 전략 가이드 업데이트**: NAVER_SEO_STRATEGY_2025.md의 계산기 페이지 키워드 전략 섹션 개선
- **기대 효과**:
    -   "CBM계산기", "수입금액계산기", "관세계산기" 등 구체적 키워드 검색 시 상위 노출
    -   사용자 검색 의도와 정확히 일치하는 키워드로 클릭률 향상
    -   경쟁사 대비 차별화된 포지셔닝 확보

## 📞 연락처

**두리무역**
- 대표자: 김두호
- 전화: 031-699-8781
- 이메일: duly@duly.co.kr
- 주소: 인천광역시 연수구 센트럴로 313 B2512
- 사업자등록번호: 605-29-80697

---

*Copyright © 2018-2025 Duly Trade. All rights reserved.*
