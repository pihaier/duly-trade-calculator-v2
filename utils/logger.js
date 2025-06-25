/**
 * 📝 로깅 유틸리티
 * 
 * 개발/프로덕션 환경에 맞는 로깅 시스템
 */

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const LOG_COLORS = {
    error: '\x1b[31m',  // 빨간색
    warn: '\x1b[33m',   // 노란색
    info: '\x1b[36m',   // 청록색
    debug: '\x1b[37m',  // 흰색
    reset: '\x1b[0m'    // 색상 리셋
};

class Logger {
    constructor() {
        this.logLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;
        this.enableColors = process.env.NODE_ENV !== 'production';
    }

    /**
     * 로그 메시지 포맷팅
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase();
        
        let formattedMessage = `[${timestamp}] [${levelUpper}]`;
        
        // 개발 환경에서는 색상 적용
        if (this.enableColors) {
            const color = LOG_COLORS[level] || LOG_COLORS.reset;
            formattedMessage = `${color}[${timestamp}] [${levelUpper}]${LOG_COLORS.reset}`;
        }
        
        // 메시지 추가
        if (typeof message === 'object') {
            formattedMessage += ` ${JSON.stringify(message, null, 2)}`;
        } else {
            formattedMessage += ` ${message}`;
        }
        
        // 메타 정보 추가
        if (Object.keys(meta).length > 0) {
            formattedMessage += ` ${JSON.stringify(meta)}`;
        }
        
        return formattedMessage;
    }

    /**
     * 로그 출력
     */
    log(level, message, meta = {}) {
        if (LOG_LEVELS[level] <= this.logLevel) {
            const formattedMessage = this.formatMessage(level, message, meta);
            
            // 에러는 stderr로, 나머지는 stdout으로
            if (level === 'error') {
                } else {
                }
        }
    }

    /**
     * 에러 로그
     */
    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    /**
     * 경고 로그
     */
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    /**
     * 정보 로그
     */
    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    /**
     * 디버그 로그
     */
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }

    /**
     * HTTP 요청 로그
     */
    http(req, res, responseTime) {
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;
        
        let level = 'info';
        if (statusCode >= 500) level = 'error';
        else if (statusCode >= 400) level = 'warn';
        
        const message = `${method} ${originalUrl} - ${statusCode} - ${responseTime}ms`;
        
        this.log(level, message, {
            ip,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer')
        });
    }

    /**
     * API 요청 로그
     */
    apiRequest(url, method, responseTime, statusCode) {
        const message = `External API: ${method} ${url} - ${statusCode} - ${responseTime}ms`;
        
        let level = 'info';
        if (statusCode >= 500) level = 'error';
        else if (statusCode >= 400) level = 'warn';
        
        this.log(level, message);
    }

    /**
     * 성능 측정 시작
     */
    startTimer(label) {
        const start = process.hrtime.bigint();
        
        return {
            end: () => {
                const end = process.hrtime.bigint();
                const duration = Number(end - start) / 1000000; // 나노초를 밀리초로 변환
                this.debug(`Timer [${label}]: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    /**
     * 메모리 사용량 로그
     */
    logMemoryUsage() {
        const usage = process.memoryUsage();
        const formatBytes = (bytes) => {
            return Math.round(bytes / 1024 / 1024 * 100) / 100;
        };

        this.debug('Memory Usage:', {
            rss: `${formatBytes(usage.rss)} MB`,
            heapTotal: `${formatBytes(usage.heapTotal)} MB`,
            heapUsed: `${formatBytes(usage.heapUsed)} MB`,
            external: `${formatBytes(usage.external)} MB`
        });
    }

    /**
     * 시스템 정보 로그
     */
    logSystemInfo() {
        const os = require('os');
        
        this.info('System Information:', {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100} GB`,
            freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100} GB`,
            uptime: `${Math.round(os.uptime() / 60)} minutes`,
            nodeVersion: process.version
        });
    }
}

// 싱글톤 인스턴스 생성
const logger = new Logger();

module.exports = logger; 