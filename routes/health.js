/**
 * 💊 헬스체크 라우트
 * 
 * 서버 상태 확인 및 시스템 모니터링
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 기본 헬스체크
 * GET /api/health
 */
router.get('/', asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    // 기본 상태 정보
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    };

    // 응답 시간 측정
    const responseTime = Date.now() - startTime;
    healthStatus.responseTime = `${responseTime}ms`;

    // 메모리 사용량 체크
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
    };

    // 메모리 사용량이 임계치를 초과하는지 확인 (1GB)
    if (memoryUsageMB.rss > 1024) {
        healthStatus.status = 'warning';
        healthStatus.warnings = ['High memory usage detected'];
    }

    healthStatus.memory = memoryUsageMB;

    logger.debug('Health check requested', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        responseTime: responseTime
    });

    res.json({
        success: true,
        data: healthStatus
    });
}));

/**
 * 상세 시스템 정보
 * GET /api/health/detailed
 */
router.get('/detailed', asyncHandler(async (req, res) => {
    const os = require('os');
    const startTime = Date.now();

    // 시스템 정보 수집
    const systemInfo = {
        server: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: '1.0.0',
            nodeVersion: process.version
        },
        system: {
            platform: os.platform(),
            arch: os.arch(),
            release: os.release(),
            hostname: os.hostname(),
            cpus: os.cpus().length,
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
            freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100, // GB
            loadAverage: os.loadavg(),
            uptime: Math.round(os.uptime() / 60) // minutes
        },
        process: {
            pid: process.pid,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100,
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
                external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
            },
            cpu: {
                usage: process.cpuUsage()
            }
        },
        environment: {
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT,
            customsApiConfigured: !!process.env.CUSTOMS_API_KEY,
            logLevel: process.env.LOG_LEVEL
        }
    };

    // 상태 평가
    const warnings = [];
    const errors = [];

    // 메모리 사용량 체크
    if (systemInfo.process.memory.rss > 1024) {
        warnings.push('High memory usage detected');
    }

    // CPU 로드 평균 체크 (1분 평균이 CPU 수보다 높으면 경고)
    if (systemInfo.system.loadAverage[0] > systemInfo.system.cpus) {
        warnings.push('High CPU load detected');
    }

    // 여유 메모리 체크 (전체의 10% 미만이면 경고)
    const memoryUsagePercent = ((systemInfo.system.totalMemory - systemInfo.system.freeMemory) / systemInfo.system.totalMemory) * 100;
    if (memoryUsagePercent > 90) {
        warnings.push('Low system memory available');
    }

    // API 키 설정 확인
    if (!systemInfo.environment.customsApiConfigured) {
        warnings.push('Customs API key not configured');
    }

    // 상태 결정
    if (errors.length > 0) {
        systemInfo.server.status = 'unhealthy';
        systemInfo.server.errors = errors;
    } else if (warnings.length > 0) {
        systemInfo.server.status = 'warning';
        systemInfo.server.warnings = warnings;
    }

    // 응답 시간 측정
    const responseTime = Date.now() - startTime;
    systemInfo.server.responseTime = `${responseTime}ms`;

    logger.debug('Detailed health check requested', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        responseTime: responseTime
    });

    res.json({
        success: true,
        data: systemInfo
    });
}));

/**
 * 관세청 API 연결 테스트
 * GET /api/health/customs-api
 */
router.get('/customs-api', asyncHandler(async (req, res) => {
    const axios = require('axios');
    const startTime = Date.now();

    // API 키 확인 (환경변수 우선, 없으면 하드코딩된 키 사용)
    const apiKey = process.env.CUSTOMS_API_KEY || 'o260t225i086q161g060c050i0';
    if (!apiKey || apiKey === 'your_actual_api_key_here') {
        return res.json({
            success: false,
            data: {
                status: 'error',
                message: 'Customs API key not configured',
                timestamp: new Date().toISOString()
            }
        });
    }

    try {
        // 간단한 환율 조회로 API 연결 테스트
        const testUrl = `${process.env.CUSTOMS_API_BASE_URL}/trifFxrtInfoQry/retrieveTrifFxrtInfo`;
        const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        const response = await axios.get(testUrl, {
            params: {
                crkyCn: apiKey,
                qryYymmDd: currentDate,
                imexTp: '2'
            },
            timeout: parseInt(process.env.API_TIMEOUT) || 10000
        });

        const responseTime = Date.now() - startTime;

        logger.info('Customs API connection test successful', {
            responseTime: responseTime,
            statusCode: response.status
        });

        res.json({
            success: true,
            data: {
                status: 'healthy',
                message: 'Customs API connection successful',
                responseTime: `${responseTime}ms`,
                statusCode: response.status,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;

        logger.error('Customs API connection test failed', {
            error: error.message,
            responseTime: responseTime
        });

        let errorMessage = 'Customs API connection failed';
        let statusCode = error.response ? error.response.status : null;

        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to Customs API server';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Customs API request timeout';
        } else if (statusCode === 401) {
            errorMessage = 'Invalid Customs API key';
        } else if (statusCode === 403) {
            errorMessage = 'Customs API access denied';
        }

        res.status(200).json({
            success: false,
            data: {
                status: 'error',
                message: errorMessage,
                responseTime: `${responseTime}ms`,
                statusCode: statusCode,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        });
    }
}));

/**
 * 서버 리스타트 (개발 환경에서만)
 * POST /api/health/restart
 */
router.post('/restart', asyncHandler(async (req, res) => {
    // 프로덕션 환경에서는 비활성화
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            error: {
                code: 403,
                message: 'Restart not allowed in production environment'
            }
        });
    }

    logger.warn('Server restart requested', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json({
        success: true,
        data: {
            message: 'Server restart initiated',
            timestamp: new Date().toISOString()
        }
    });

    // 응답 전송 후 서버 재시작
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}));

/**
 * 메모리 정리 (가비지 컬렉션 강제 실행)
 * POST /api/health/gc
 */
router.post('/gc', asyncHandler(async (req, res) => {
    const memoryBefore = process.memoryUsage();

    // 가비지 컬렉션 실행 (--expose-gc 플래그 필요)
    if (global.gc) {
        global.gc();
        logger.info('Garbage collection executed');
    } else {
        logger.warn('Garbage collection not available (use --expose-gc flag)');
    }

    const memoryAfter = process.memoryUsage();

    res.json({
        success: true,
        data: {
            message: 'Garbage collection completed',
            memoryBefore: {
                rss: Math.round(memoryBefore.rss / 1024 / 1024 * 100) / 100,
                heapUsed: Math.round(memoryBefore.heapUsed / 1024 / 1024 * 100) / 100
            },
            memoryAfter: {
                rss: Math.round(memoryAfter.rss / 1024 / 1024 * 100) / 100,
                heapUsed: Math.round(memoryAfter.heapUsed / 1024 / 1024 * 100) / 100
            },
            freed: {
                rss: Math.round((memoryBefore.rss - memoryAfter.rss) / 1024 / 1024 * 100) / 100,
                heapUsed: Math.round((memoryBefore.heapUsed - memoryAfter.heapUsed) / 1024 / 1024 * 100) / 100
            },
            timestamp: new Date().toISOString()
        }
    });
}));

module.exports = router; 