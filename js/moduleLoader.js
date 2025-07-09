/**
 * 🔧 모듈 로더 시스템
 * 
 * 향후 확장성을 고려한 의존성 관리 및 모듈 로딩 시스템
 * ES6 모듈 시스템으로의 점진적 마이그레이션을 지원합니다.
 */

class ModuleLoader {
    constructor() {
        this.modules = new Map();
        this.dependencies = new Map();
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
        
        // 모듈 의존성 정의
        this.defineDependencies();
    }

    /**
     * 모듈 의존성 정의
     */
    defineDependencies() {
        // 의존성 그래프 정의
        this.dependencies.set('config', []);
        this.dependencies.set('apiService', ['config']);
        this.dependencies.set('cbmCalculator', ['config', 'apiService']);
        this.dependencies.set('totalCostCalculator', ['config', 'apiService']);
        this.dependencies.set('main', ['config', 'apiService', 'cbmCalculator', 'totalCostCalculator']);
    }

    /**
     * 모듈 등록
     */
    registerModule(name, factory, dependencies = []) {
        this.modules.set(name, { factory, dependencies });
        this.dependencies.set(name, dependencies);
    }

    /**
     * 모듈 로드 (비동기)
     */
    async loadModule(name) {
        // 이미 로드된 모듈인 경우
        if (this.loadedModules.has(name)) {
            return this.getModule(name);
        }

        // 이미 로딩 중인 경우 기존 Promise 반환
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        // 새로운 로딩 Promise 생성
        const loadingPromise = this._loadModuleInternal(name);
        this.loadingPromises.set(name, loadingPromise);

        try {
            const result = await loadingPromise;
            this.loadedModules.add(name);
            return result;
        } finally {
            this.loadingPromises.delete(name);
        }
    }

    /**
     * 내부 모듈 로딩 로직
     */
    async _loadModuleInternal(name) {
        const dependencies = this.dependencies.get(name) || [];
        
        // 의존성 먼저 로드
        const dependencyModules = await Promise.all(
            dependencies.map(dep => this.loadModule(dep))
        );

        // 모듈 팩토리 실행
        const moduleInfo = this.modules.get(name);
        if (moduleInfo) {
            const module = await moduleInfo.factory(...dependencyModules);
            window[name] = module; // 전역에 등록
            return module;
        }

        // 레거시 스크립트 로딩 (기존 방식)
        return this._loadLegacyScript(name);
    }

    /**
     * 레거시 스크립트 로딩
     */
    async _loadLegacyScript(name) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `js/${name}.js?v=2.4`;
            script.onload = () => {
                // 전역 객체에서 모듈 찾기
                const module = window[name] || window[this._toCamelCase(name)];
                resolve(module);
            };
            script.onerror = () => reject(new Error(`Failed to load module: ${name}`));
            document.head.appendChild(script);
        });
    }

    /**
     * 모듈 가져오기
     */
    getModule(name) {
        return window[name] || window[this._toCamelCase(name)];
    }

    /**
     * 모든 모듈 로드
     */
    async loadAllModules() {
        const moduleNames = ['config', 'apiService', 'cbmCalculator', 'totalCostCalculator', 'main'];
        
        try {
            await Promise.all(moduleNames.map(name => this.loadModule(name)));
            console.log('✅ 모든 모듈 로드 완료');
            return true;
        } catch (error) {
            console.error('❌ 모듈 로드 실패:', error);
            return false;
        }
    }

    /**
     * 모듈 상태 확인
     */
    getModuleStatus() {
        const status = {};
        for (const [name] of this.dependencies) {
            status[name] = {
                loaded: this.loadedModules.has(name),
                loading: this.loadingPromises.has(name),
                available: !!this.getModule(name)
            };
        }
        return status;
    }

    /**
     * 의존성 그래프 시각화
     */
    getDependencyGraph() {
        const graph = {};
        for (const [name, deps] of this.dependencies) {
            graph[name] = deps;
        }
        return graph;
    }

    /**
     * 헬퍼: 카멜케이스 변환
     */
    _toCamelCase(str) {
        return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }

    /**
     * 모듈 언로드 (개발/테스트용)
     */
    unloadModule(name) {
        this.loadedModules.delete(name);
        this.loadingPromises.delete(name);
        if (window[name]) {
            delete window[name];
        }
        console.log(`🗑️ 모듈 언로드: ${name}`);
    }

    /**
     * 핫 리로드 (개발용)
     */
    async reloadModule(name) {
        this.unloadModule(name);
        return this.loadModule(name);
    }
}

// 전역 모듈 로더 인스턴스
window.moduleLoader = new ModuleLoader();

// 개발자 도구용 헬퍼 함수들
window.getModuleStatus = () => window.moduleLoader.getModuleStatus();
window.getDependencyGraph = () => window.moduleLoader.getDependencyGraph();
window.reloadModule = (name) => window.moduleLoader.reloadModule(name);

console.log('🔧 모듈 로더 시스템 초기화 완료');
