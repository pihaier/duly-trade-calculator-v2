/**
 * 🧪 테스트 스위트
 * 
 * 탭 전환, 성능, 콘솔 오류 등을 자동으로 검증합니다.
 */

class TestSuite {
    constructor() {
        this.results = [];
        this.errors = [];
        this.warnings = [];
        this.startTime = null;
        this.endTime = null;
    }

    /**
     * 전체 테스트 실행
     */
    async runAllTests() {
        console.log('🧪 테스트 스위트 시작...');
        this.startTime = performance.now();
        
        // 콘솔 에러 모니터링 시작
        this.startConsoleMonitoring();
        
        try {
            // 1. 탭 전환 테스트
            await this.testTabSwitching();
            
            // 2. 모듈 로딩 테스트
            await this.testModuleLoading();
            
            // 3. 유틸리티 함수 테스트
            await this.testUtilityFunctions();
            
            // 4. 로컬 스토리지 테스트
            await this.testLocalStorage();
            
            // 5. 성능 테스트
            await this.testPerformance();
            
            // 6. 리소스 로딩 테스트
            await this.testResourceLoading();
            
        } catch (error) {
            this.addError('전체 테스트 실행 중 오류', error);
        }
        
        this.endTime = performance.now();
        this.generateReport();
    }

    /**
     * 탭 전환 테스트
     */
    async testTabSwitching() {
        console.log('📋 탭 전환 테스트 시작...');
        
        const tabs = ['ai', 'cbm', 'cost'];
        const mainController = window.mainController;
        
        if (!mainController) {
            this.addError('탭 전환 테스트', 'mainController를 찾을 수 없습니다');
            return;
        }
        
        for (const tab of tabs) {
            try {
                // 탭 전환 실행
                mainController.switchTab(tab);
                
                // 탭이 올바르게 활성화되었는지 확인
                const tabButton = document.getElementById(`${tab}Tab`);
                const tabContent = document.getElementById(`${tab}Section`);
                
                if (!tabButton || !tabContent) {
                    this.addError('탭 전환 테스트', `${tab} 탭 요소를 찾을 수 없습니다`);
                    continue;
                }
                
                if (!tabButton.classList.contains('active')) {
                    this.addError('탭 전환 테스트', `${tab} 탭 버튼이 활성화되지 않았습니다`);
                }
                
                if (!tabContent.classList.contains('active') || tabContent.classList.contains('hidden')) {
                    this.addError('탭 전환 테스트', `${tab} 탭 콘텐츠가 표시되지 않았습니다`);
                }
                
                // 현재 탭 상태 확인
                if (mainController.currentTab !== tab) {
                    this.addError('탭 전환 테스트', `currentTab이 ${tab}로 설정되지 않았습니다`);
                }
                
                this.addResult('탭 전환 테스트', `${tab} 탭 전환 성공`);
                
                // 메인 스레드 양보
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                this.addError('탭 전환 테스트', `${tab} 탭 전환 실패: ${error.message}`);
            }
        }
        
        // 유효하지 않은 탭 테스트
        try {
            mainController.switchTab('invalid');
            this.addResult('탭 전환 테스트', '유효하지 않은 탭 처리 성공');
        } catch (error) {
            this.addError('탭 전환 테스트', `유효하지 않은 탭 처리 실패: ${error.message}`);
        }
    }

    /**
     * 모듈 로딩 테스트
     */
    async testModuleLoading() {
        console.log('📦 모듈 로딩 테스트 시작...');
        
        const requiredModules = [
            'CONFIG', 'utils', 'apiService', 'mainController'
        ];
        
        for (const module of requiredModules) {
            if (window[module]) {
                this.addResult('모듈 로딩 테스트', `${module} 모듈 로드 성공`);
            } else {
                this.addError('모듈 로딩 테스트', `${module} 모듈을 찾을 수 없습니다`);
            }
        }
        
        // 계산기 모듈 테스트
        const calculatorModules = ['cbmCalculator', 'totalCostCalculator'];
        for (const module of calculatorModules) {
            if (window[module]) {
                this.addResult('모듈 로딩 테스트', `${module} 모듈 로드 성공`);
            } else {
                this.addWarning('모듈 로딩 테스트', `${module} 모듈을 찾을 수 없습니다 (선택적)`);
            }
        }
    }

    /**
     * 유틸리티 함수 테스트
     */
    async testUtilityFunctions() {
        console.log('🛠️ 유틸리티 함수 테스트 시작...');
        
        if (!window.utils) {
            this.addError('유틸리티 함수 테스트', 'utils 모듈을 찾을 수 없습니다');
            return;
        }
        
        const utils = window.utils;
        
        // 숫자 포맷팅 테스트
        try {
            const formatted = utils.formatNumber(1234567.89, 2);
            if (formatted.includes('1,234,567.89') || formatted.includes('1,234,567')) {
                this.addResult('유틸리티 함수 테스트', '숫자 포맷팅 성공');
            } else {
                this.addError('유틸리티 함수 테스트', `숫자 포맷팅 결과 이상: ${formatted}`);
            }
        } catch (error) {
            this.addError('유틸리티 함수 테스트', `숫자 포맷팅 실패: ${error.message}`);
        }
        
        // 통화 포맷팅 테스트
        try {
            const krw = utils.formatCurrency(1000000, 'KRW');
            const usd = utils.formatCurrency(1000.50, 'USD');
            
            if (krw.includes('₩') && usd.includes('$')) {
                this.addResult('유틸리티 함수 테스트', '통화 포맷팅 성공');
            } else {
                this.addError('유틸리티 함수 테스트', `통화 포맷팅 결과 이상: KRW=${krw}, USD=${usd}`);
            }
        } catch (error) {
            this.addError('유틸리티 함수 테스트', `통화 포맷팅 실패: ${error.message}`);
        }
        
        // 콤마 추가/제거 테스트
        try {
            const withCommas = utils.addCommas(1234567);
            const withoutCommas = utils.removeCommas('1,234,567');
            
            if (withCommas === '1,234,567' && withoutCommas === '1234567') {
                this.addResult('유틸리티 함수 테스트', '콤마 처리 성공');
            } else {
                this.addError('유틸리티 함수 테스트', `콤마 처리 결과 이상: ${withCommas}, ${withoutCommas}`);
            }
        } catch (error) {
            this.addError('유틸리티 함수 테스트', `콤마 처리 실패: ${error.message}`);
        }
    }

    /**
     * 로컬 스토리지 테스트
     */
    async testLocalStorage() {
        console.log('💾 로컬 스토리지 테스트 시작...');
        
        if (!window.utils) {
            this.addError('로컬 스토리지 테스트', 'utils 모듈을 찾을 수 없습니다');
            return;
        }
        
        const testKey = 'testSuite_test';
        const testData = { test: true, timestamp: Date.now() };
        
        try {
            // 저장 테스트
            const saved = window.utils.saveToStorage(testKey, testData);
            if (saved) {
                this.addResult('로컬 스토리지 테스트', '데이터 저장 성공');
            } else {
                this.addError('로컬 스토리지 테스트', '데이터 저장 실패');
            }
            
            // 로드 테스트
            const loaded = window.utils.loadFromStorage(testKey);
            if (loaded && loaded.test === true) {
                this.addResult('로컬 스토리지 테스트', '데이터 로드 성공');
            } else {
                this.addError('로컬 스토리지 테스트', '데이터 로드 실패');
            }
            
            // 정리
            localStorage.removeItem(testKey);
            
        } catch (error) {
            this.addError('로컬 스토리지 테스트', `로컬 스토리지 테스트 실패: ${error.message}`);
        }
    }

    /**
     * 성능 테스트
     */
    async testPerformance() {
        console.log('⚡ 성능 테스트 시작...');
        
        // 페이지 로드 성능
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            if (loadTime < 3000) { // 3초 이내
                this.addResult('성능 테스트', `페이지 로드 시간: ${loadTime.toFixed(0)}ms (양호)`);
            } else {
                this.addWarning('성능 테스트', `페이지 로드 시간: ${loadTime.toFixed(0)}ms (개선 필요)`);
            }
        }
        
        // 메모리 사용량 (가능한 경우)
        if (performance.memory) {
            const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            if (memoryMB < 50) { // 50MB 이내
                this.addResult('성능 테스트', `메모리 사용량: ${memoryMB.toFixed(1)}MB (양호)`);
            } else {
                this.addWarning('성능 테스트', `메모리 사용량: ${memoryMB.toFixed(1)}MB (주의)`);
            }
        }
    }

    /**
     * 리소스 로딩 테스트
     */
    async testResourceLoading() {
        console.log('📁 리소스 로딩 테스트 시작...');
        
        const resources = performance.getEntriesByType('resource');
        let failedResources = 0;
        
        resources.forEach(resource => {
            if (resource.transferSize === 0 && !resource.name.includes('data:')) {
                failedResources++;
                this.addWarning('리소스 로딩 테스트', `리소스 로딩 실패 가능: ${resource.name}`);
            }
        });
        
        if (failedResources === 0) {
            this.addResult('리소스 로딩 테스트', '모든 리소스 로딩 성공');
        } else {
            this.addWarning('리소스 로딩 테스트', `${failedResources}개 리소스 로딩 문제 감지`);
        }
    }

    /**
     * 콘솔 에러 모니터링
     */
    startConsoleMonitoring() {
        const originalError = console.error;
        const originalWarn = console.warn;
        
        console.error = (...args) => {
            this.addError('콘솔 모니터링', args.join(' '));
            originalError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.addWarning('콘솔 모니터링', args.join(' '));
            originalWarn.apply(console, args);
        };
    }

    /**
     * 결과 추가
     */
    addResult(category, message) {
        this.results.push({ category, message, type: 'success' });
    }

    addError(category, message) {
        this.errors.push({ category, message, type: 'error' });
    }

    addWarning(category, message) {
        this.warnings.push({ category, message, type: 'warning' });
    }

    /**
     * 테스트 리포트 생성
     */
    generateReport() {
        const duration = this.endTime - this.startTime;
        
        console.log('\n🧪 테스트 결과 리포트');
        console.log('='.repeat(50));
        console.log(`⏱️ 실행 시간: ${duration.toFixed(2)}ms`);
        console.log(`✅ 성공: ${this.results.length}개`);
        console.log(`⚠️ 경고: ${this.warnings.length}개`);
        console.log(`❌ 오류: ${this.errors.length}개`);
        console.log('='.repeat(50));
        
        if (this.results.length > 0) {
            console.log('\n✅ 성공한 테스트:');
            this.results.forEach(result => {
                console.log(`  [${result.category}] ${result.message}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ 경고:');
            this.warnings.forEach(warning => {
                console.log(`  [${warning.category}] ${warning.message}`);
            });
        }
        
        if (this.errors.length > 0) {
            console.log('\n❌ 오류:');
            this.errors.forEach(error => {
                console.log(`  [${error.category}] ${error.message}`);
            });
        }
        
        // 전체 점수 계산
        const totalTests = this.results.length + this.warnings.length + this.errors.length;
        const score = totalTests > 0 ? Math.round((this.results.length / totalTests) * 100) : 0;
        
        console.log(`\n🎯 전체 점수: ${score}%`);
        
        if (score >= 90) {
            console.log('🎉 훌륭합니다! 모든 테스트가 성공적으로 통과했습니다.');
        } else if (score >= 70) {
            console.log('👍 양호합니다. 일부 개선사항이 있습니다.');
        } else {
            console.log('⚠️ 주의가 필요합니다. 여러 문제가 발견되었습니다.');
        }
        
        return {
            duration,
            score,
            results: this.results,
            warnings: this.warnings,
            errors: this.errors
        };
    }
}

// 전역에서 사용할 수 있도록 설정
window.TestSuite = TestSuite;

// 자동 테스트 실행 함수
window.runTests = async () => {
    const testSuite = new TestSuite();
    return await testSuite.runAllTests();
};

console.log('🧪 테스트 스위트 로드 완료. runTests() 함수로 실행하세요.');
