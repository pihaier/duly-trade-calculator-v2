/**
 * 🚨 에러 핸들링 미들웨어
 * 
 * Express 애플리케이션의 모든 에러를 처리하고
 * 적절한 응답을 클라이언트에 전송합니다.
 */

const logger = require('../utils/logger');

/**
 * 에러 타입별 처리
 */
const handleSpecificErrors = (error) => {
    // Validation 에러
    if (error.name === 'ValidationError') {
        return {
            statusCode: 400,
            message: '입력값 검증 실패',
            details: error.details || error.message
        };
    }

    // JWT 에러
    if (error.name === 'JsonWebTokenError') {
        return {
            statusCode: 401,
            message: '인증 토큰이 유효하지 않습니다',
            details: 'Invalid token'
        };
    }

    // JWT 만료 에러
    if (error.name === 'TokenExpiredError') {
        return {
            statusCode: 401,
            message: '인증 토큰이 만료되었습니다',
            details: 'Token expired'
        };
    }

    // CORS 에러
    if (error.message && error.message.includes('CORS')) {
        return {
            statusCode: 403,
            message: 'CORS 정책에 의해 차단되었습니다',
            details: 'Cross-Origin Request Blocked'
        };
    }

    // 외부 API 에러
    if (error.code === 'ECONNREFUSED') {
        return {
            statusCode: 503,
            message: '외부 서비스에 연결할 수 없습니다',
            details: 'Service Unavailable'
        };
    }

    // 타임아웃 에러
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        return {
            statusCode: 408,
            message: '요청 시간이 초과되었습니다',
            details: 'Request Timeout'
        };
    }

    // 관세청 API 관련 에러
    if (error.message && error.message.includes('관세청')) {
        return {
            statusCode: 502,
            message: '관세청 API 호출 중 오류가 발생했습니다',
            details: error.message
        };
    }

    // HTTP 상태 코드가 있는 에러 (axios 등)
    if (error.response && error.response.status) {
        const status = error.response.status;
        let message = '외부 API 호출 실패';
        
        if (status === 401) {
            message = 'API 인증에 실패했습니다';
        } else if (status === 403) {
            message = 'API 접근이 거부되었습니다';
        } else if (status === 404) {
            message = '요청한 리소스를 찾을 수 없습니다';
        } else if (status === 429) {
            message = 'API 요청 한도를 초과했습니다';
        } else if (status >= 500) {
            message = '외부 서비스에 오류가 발생했습니다';
        }

        return {
            statusCode: status,
            message,
            details: error.response.data || error.message
        };
    }

    // 기본 에러
    return null;
};

/**
 * 에러 응답 생성
 */
const createErrorResponse = (error, req) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const timestamp = new Date().toISOString();
    
    // 특정 에러 타입 처리
    const specificError = handleSpecificErrors(error);
    
    if (specificError) {
        return {
            ...specificError,
            timestamp,
            path: req.originalUrl,
            method: req.method,
            ...(isDevelopment && { stack: error.stack })
        };
    }

    // HTTP 에러 (express-http-errors 등)
    if (error.statusCode || error.status) {
        return {
            statusCode: error.statusCode || error.status,
            message: error.message || '서버 오류가 발생했습니다',
            timestamp,
            path: req.originalUrl,
            method: req.method,
            ...(isDevelopment && { stack: error.stack })
        };
    }

    // 일반 서버 에러
    return {
        statusCode: 500,
        message: isDevelopment ? error.message : '내부 서버 오류가 발생했습니다',
        timestamp,
        path: req.originalUrl,
        method: req.method,
        ...(isDevelopment && { 
            stack: error.stack,
            details: error.toString()
        })
    };
};

/**
 * 메인 에러 핸들러 미들웨어
 */
const errorHandler = (error, req, res, next) => {
    // 에러 로깅
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
        params: req.params
    };

    // 민감한 정보 제거 (비밀번호, 토큰 등)
    if (errorInfo.body && errorInfo.body.password) {
        errorInfo.body.password = '[REDACTED]';
    }
    if (errorInfo.body && errorInfo.body.token) {
        errorInfo.body.token = '[REDACTED]';
    }

    logger.error('Unhandled Error:', errorInfo);

    // 에러 응답 생성
    const errorResponse = createErrorResponse(error, req);

    // 헤더가 이미 전송되었는지 확인
    if (res.headersSent) {
        logger.warn('Headers already sent, delegating to default Express error handler');
        return next(error);
    }

    // 에러 응답 전송
    res.status(errorResponse.statusCode).json({
        success: false,
        error: {
            code: errorResponse.statusCode,
            message: errorResponse.message,
            timestamp: errorResponse.timestamp,
            path: errorResponse.path,
            method: errorResponse.method,
            ...(errorResponse.details && { details: errorResponse.details }),
            ...(errorResponse.stack && { stack: errorResponse.stack })
        }
    });
};

/**
 * 404 에러 핸들러
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`경로를 찾을 수 없습니다: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

/**
 * 비동기 함수 래퍼 (try-catch 자동화)
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 에러 생성 헬퍼 함수들
 */
const createError = (statusCode, message, details = null) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (details) {
        error.details = details;
    }
    return error;
};

const badRequest = (message = '잘못된 요청입니다', details = null) => {
    return createError(400, message, details);
};

const unauthorized = (message = '인증이 필요합니다', details = null) => {
    return createError(401, message, details);
};

const forbidden = (message = '접근이 거부되었습니다', details = null) => {
    return createError(403, message, details);
};

const notFound = (message = '리소스를 찾을 수 없습니다', details = null) => {
    return createError(404, message, details);
};

const internalServerError = (message = '내부 서버 오류입니다', details = null) => {
    return createError(500, message, details);
};

const serviceUnavailable = (message = '서비스를 사용할 수 없습니다', details = null) => {
    return createError(503, message, details);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    createError,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    internalServerError,
    serviceUnavailable
}; 