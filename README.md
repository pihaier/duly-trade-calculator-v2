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

## 🏗️ **프로젝트 구조 (정리 후)**

```
/
├── 📄 index.html              ← 🎯 메인 페이지
├── 📄 calculator.html          ← 🧮 계산기 페이지
├── 🎨 style.css                ← 🎨 메인 스타일시트
├── 🎨 calculator.css           ← 🎨 계산기 전용 스타일시트
├── 📁 js/                       ← 💡 JavaScript 로직
│   ├── main.js                 ← 🎮 UI 컨트롤러
│   ├── apiService.js           ← 🔌 API 통신
│   ├── cbmCalculator.js        ← 📦 CBM 계산기 로직
│   └── totalCostCalculator.js  ← 💰 총 비용 계산기 로직
├── 📁 api/                      ← ☁️ Vercel 서버리스 함수
│   ├── exchange-rate.js        ← 💱 환율 조회
│   ├── tariff-rate.js          ← 📜 관세율 조회
│   └── ...
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

- **메인 URL**: https://duly-trade-calculator.vercel.app
- **계산기 URL**: https://duly-trade-calculator.vercel.app/calculator

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

## 📞 연락처

**두리무역**
- 대표자: 김두호
- 전화: 031-699-8781
- 이메일: duly@duly.co.kr
- 주소: 인천광역시 연수구 센트럴로 313 B2512
- 사업자등록번호: 605-29-80697

---

*Copyright © 2018-2025 Duly Trade. All rights reserved.*
