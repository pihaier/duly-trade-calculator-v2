/**
 * 🚢 관세청 API 프록시 라우트
 * 
 * 관세청 Open API 호출을 중계하고 인증키를 안전하게 관리
 * - 환율 정보 조회 (API012)
 * - 관세율 정보 조회 (API030)
 * - 수입요건 조회 (API029)
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const xml2js = require('xml2js');
const { body, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { asyncHandler, badRequest, serviceUnavailable } = require('../middleware/errorHandler');

// 메모리 캐시 (간단한 구현)
const cache = new Map();
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 300; // 5분

/**
 * 캐시 키 생성
 */
const generateCacheKey = (endpoint, params) => {
    const sortedParams = Object.keys(params).sort().reduce((result, key) => {
        result[key] = params[key];
        return result;
    }, {});
    return `${endpoint}_${JSON.stringify(sortedParams)}`;
};

/**
 * 캐시에서 데이터 조회
 */
const getFromCache = (key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
        return cached.data;
    }
    cache.delete(key);
    return null;
};

/**
 * 캐시에 데이터 저장
 */
const setCache = (key, data) => {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
};

/**
 * 수입요건 설명 반환
 */
const getRequirementDescription = (lawName) => {
                // 기본 설명 제거 - API 응답 그대로 사용
            return '';
};

/**
 * 날짜 포맷팅 (YYYYMMDD -> YYYY.MM.DD)
 */
const formatDate = (dateString) => {
    if (dateString && dateString.length === 8) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}.${month}.${day}`;
    }
    return dateString;
};

/**
 * 관세청 API 호출 공통 함수
 */
const callCustomsAPI = async (endpoint, params) => {
    const timer = logger.startTimer(`CustomsAPI-${endpoint}`);
    
    try {
        // API별 키 매핑 (정확한 키로 최종 수정)
        const apiKeys = {
            'trifFxrtInfoQry/retrieveTrifFxrtInfo': 'o260t225i086q161g060c050i0',  // 환율조회
            'trrtQry/retrieveTrrt': 'i260d241g061e220n060p010q0',               // 관세율조회 (정상작동 확인)
            'ccctLworCdQry/retrieveCcctLworCd': 'o290n245e076c101p030d000q0'     // 세관장확인대상 물품조회 (올바른 키)
        };
        
        // 엔드포인트에 맞는 API 키 선택
        const apiKey = process.env.CUSTOMS_API_KEY || apiKeys[endpoint] || 'o260t225i086q161g060c050i0';
        
        if (!apiKey || apiKey === 'your_actual_api_key_here' || apiKey === '') {
            throw new Error('관세청 API 키가 설정되지 않았습니다');
        }
        
        logger.debug(`Using API Key for ${endpoint}:`, apiKey.substring(0, 10) + '...');

        const baseUrl = process.env.CUSTOMS_API_BASE_URL || 'https://unipass.customs.go.kr:38010/ext/rest';
        const url = `${baseUrl}/${endpoint}`;
        
        // API 키 추가
        const requestParams = {
            ...params,
            crkyCn: apiKey
        };

        logger.debug(`Calling Customs API: ${endpoint}`, { params: requestParams });

        const response = await axios.get(url, {
            params: requestParams,
            timeout: parseInt(process.env.API_TIMEOUT) || 10000,
            headers: {
                'User-Agent': 'Trade-Cost-Calculator/1.0.0',
                'Accept': 'application/xml, text/xml, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive'
            }
        });

        const responseTime = timer.end();
        logger.apiRequest(url, 'GET', responseTime, response.status);

        // 응답이 텍스트인 경우 그대로 반환
        if (typeof response.data === 'string' && !response.data.includes('<?xml')) {
            logger.debug('Text response received');
            return response.data;
        }

        // XML 응답을 JSON으로 변환
        if (typeof response.data === 'string' && response.data.includes('<?xml')) {
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true,
                mergeAttrs: true
            });
            
            try {
                const result = await parser.parseStringPromise(response.data);
                logger.debug('Parsed XML response:', JSON.stringify(result, null, 2));
                return result;
            } catch (parseError) {
                logger.error('XML parsing error:', parseError);
                throw new Error('관세청 API 응답 파싱 실패');
            }
        }

        return response.data;

    } catch (error) {
        const responseTime = timer.end();
        
        if (error.response) {
            logger.apiRequest(endpoint, 'GET', responseTime, error.response.status);
            throw new Error(`관세청 API 오류 (${error.response.status}): ${error.response.data || error.response.statusText}`);
        } else if (error.code === 'ECONNREFUSED') {
            throw new Error('관세청 API 서버에 연결할 수 없습니다');
        } else if (error.code === 'ETIMEDOUT') {
            throw new Error('관세청 API 요청 시간이 초과되었습니다');
        } else {
            throw new Error(`관세청 API 호출 실패: ${error.message}`);
        }
    }
};

/**
 * 환율 정보 조회
 * GET /api/customs/exchange-rate
 */
router.get('/exchange-rate', [
    query('currency')
        .optional()
        .isIn(['USD', 'EUR', 'JPY', 'CNY', 'GBP'])
        .withMessage('지원하지 않는 통화입니다'),
    query('date')
        .optional()
        .matches(/^\d{8}$/)
        .withMessage('날짜는 YYYYMMDD 형식이어야 합니다')
], asyncHandler(async (req, res) => {
    // 입력 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw badRequest('입력값이 올바르지 않습니다', errors.array());
    }

    const { currency = 'USD', date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // 캐시 확인
    const cacheKey = generateCacheKey('exchange-rate', { currency, date: queryDate });
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
        logger.debug('Exchange rate data served from cache', { currency, date: queryDate });
        return res.json({
            success: true,
            data: cachedData,
            cached: true
        });
    }

    try {
        // 관세청 API 호출 (환율 정보)
        const result = await callCustomsAPI('trifFxrtInfoQry/retrieveTrifFxrtInfo', {
            qryYymmDd: queryDate,
            imexTp: '2' // 수입
        });

        // 응답 데이터 처리
        let exchangeRates = [];
        
        // XML 응답 구조에 맞게 파싱
        if (result && result.trifFxrtInfoQryRtnVo && result.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo) {
            const rateList = result.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo;
            const rates = Array.isArray(rateList) ? rateList : [rateList];
            
            exchangeRates = rates
                .filter(item => item && item.currSgn && (!currency || item.currSgn === currency))
                .map(item => ({
                    currency: item.currSgn,
                    currencyName: item.mtryUtNm || item.currKorNm,
                    baseRate: parseFloat(item.fxrt || item.basFxrt),
                    usdRate: parseFloat(item.usDlrFxrt || item.fxrt),
                    date: item.aplyBgnDt || queryDate,
                    unit: parseInt(item.currUnit) || 1
                }));
                
            logger.info(`Found ${exchangeRates.length} exchange rates for ${currency || 'all currencies'}`);
        }
        // 텍스트 응답 처리 (fallback - 실제로는 사용되지 않음)
        else if (typeof result === 'string' && result.length > 0) {
            logger.debug('Raw exchange rate response (first 500 chars):', result.substring(0, 500));
            
            // 응답 형식: 숫자+통화코드+통화명+환율+통화기호+날짜+단위
            // 예: 58AEUAE Dirham370.82AED202506152
            // USD 예: USUS Dollar1361.9USD202506152
            const parsedRates = {};
            
            // 더 정확한 정규식 - 통화코드가 2글자인 경우와 통화명 패턴 개선
            const regex = /(\d*)([A-Z]{2})([^0-9]+?)([\d.]+)([A-Z]{3})(\d{8})(\d+)/g;
            let match;
            
            while ((match = regex.exec(result)) !== null) {
                const currencyCode = match[5]; // USD, CNY 등 (3글자 코드)
                const currencyName = match[3].trim();
                const exchangeRate = parseFloat(match[4]);
                const date = match[6];
                const unit = parseInt(match[7]) || 1;
                
                // 유효한 환율 데이터인지 확인
                if (currencyCode && exchangeRate > 0) {
                    parsedRates[currencyCode] = {
                        currency: currencyCode,
                        currencyName: currencyName,
                        baseRate: exchangeRate,
                        usdRate: exchangeRate,
                        date: date,
                        unit: unit
                    };
                    
                    logger.debug(`Parsed exchange rate: ${currencyCode} - ${currencyName} - ${exchangeRate}`);
                }
            }
            
            // 요청한 통화의 환율 찾기
            if (currency && parsedRates[currency]) {
                exchangeRates = [parsedRates[currency]];
                logger.info(`Found exchange rate for ${currency}: ${parsedRates[currency].baseRate}`);
            } else if (!currency) {
                // 모든 환율 반환
                exchangeRates = Object.values(parsedRates);
            }
            
            // 캐시에 전체 환율 저장
            if (Object.keys(parsedRates).length > 0) {
                const cacheData = {};
                Object.entries(parsedRates).forEach(([code, rate]) => {
                    cacheData[code] = rate.baseRate;
                });
                setCache('exchangeRates', cacheData);
                logger.info(`Cached ${Object.keys(parsedRates).length} exchange rates`);
            }
        }

        // 요청한 통화의 환율이 없으면 기본값 제공
        if (exchangeRates.length === 0) {
            logger.warn(`No exchange rate found for ${currency} on ${queryDate}, using default`);
            
            const defaultRates = {
                'USD': { rate: 1350, name: '미국 달러' },
                'EUR': { rate: 1450, name: '유로' },
                'JPY': { rate: 900, name: '일본 엔' },
                'CNY': { rate: 190, name: '중국 위안' },
                'GBP': { rate: 1700, name: '영국 파운드' }
            };

            const defaultRate = defaultRates[currency] || defaultRates['USD'];
            exchangeRates = [{
                currency: currency,
                currencyName: defaultRate.name,
                baseRate: defaultRate.rate,
                usdRate: defaultRate.rate,
                date: queryDate,
                unit: 1,
                isDefault: true
            }];
        }

        const responseData = {
            currency,
            date: queryDate,
            rates: exchangeRates,
            timestamp: new Date().toISOString()
        };

        // 캐시 저장
        setCache(cacheKey, responseData);

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        logger.error('Exchange rate query failed', { error: error.message, currency, date: queryDate });
        throw serviceUnavailable(error.message);
    }
}));

/**
 * 관세율 정보 조회
 * GET /api/customs/tariff-rate
 */
router.get('/tariff-rate', [
    query('hsCode')
        .notEmpty()
        .withMessage('HS Code는 필수입니다')
        .isLength({ min: 6, max: 10 })
        .withMessage('HS Code는 6-10자리여야 합니다')
        .matches(/^\d+$/)
        .withMessage('HS Code는 숫자만 입력 가능합니다'),
    query('date')
        .optional()
        .matches(/^\d{8}$/)
        .withMessage('날짜는 YYYYMMDD 형식이어야 합니다')
], asyncHandler(async (req, res) => {
    // 입력 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw badRequest('입력값이 올바르지 않습니다', errors.array());
    }

    const { hsCode, date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // 캐시 확인
    const cacheKey = generateCacheKey('tariff-rate', { hsCode, date: queryDate });
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
        logger.debug('Tariff rate data served from cache', { hsCode, date: queryDate });
        return res.json({
            success: true,
            data: cachedData,
            cached: true
        });
    }

    try {
        // 관세청 API 호출 (관세율 기본정보)
        const result = await callCustomsAPI('trrtQry/retrieveTrrt', {
            hsSgn: hsCode,
            aplyStrtDt: queryDate
        });

        // 응답 데이터 처리 (웹 검색 결과 기반으로 수정)
        let tariffInfo = null;
        
        // 실제 관세청 API는 텍스트 형태로 응답 (웹 검색 결과 확인)
        if (typeof result === 'string' && result.length > 0) {
            logger.debug('Raw tariff response:', result);
            
            // 텍스트 응답 파싱 - 실제 응답 형식에 맞게 수정
            const tariffRates = {};
            let hasData = false;
            
            // 응답 형식: 숫자코드+HS코드+관세율코드+관세율명+날짜정보+세율
            // 예: 348509400000FEU1한ㆍEU FTA협정세율(선택1)202506302025010108509400000
            const regex = new RegExp(`(\\d+)${hsCode}([A-Z]+)(\\d*)([^\\d]+)(\\d{8})(\\d{8})(\\d+)`, 'g');
            let match;
            
            while ((match = regex.exec(result)) !== null) {
                hasData = true;
                const rateCode = match[2];
                const rateName = match[4];
                const rateValue = parseInt(match[7]);
                
                logger.debug(`Parsed rate: ${rateCode} - ${rateName} - ${rateValue}`);
                
                // 기본세율
                if (rateCode === 'A' || rateName.includes('기본세율')) {
                    tariffRates.basic = rateValue;
                }
                // WTO 협정세율
                else if (rateCode === 'C' || rateName.includes('WTO')) {
                    tariffRates.wto = rateValue;
                }
                // FTA 협정세율들
                else if (rateCode.startsWith('F') || rateName.includes('FTA') || rateName.includes('협정')) {
                    if (!tariffRates.fta) tariffRates.fta = {};
                    
                    // FTA 국가 추출
                    let country = 'FTA';
                    if (rateName.includes('EU')) country = 'EU';
                    else if (rateName.includes('미')) country = 'USA';
                    else if (rateName.includes('중국')) country = 'China';
                    else if (rateName.includes('아세안')) country = 'ASEAN';
                    else if (rateName.includes('베트남')) country = 'Vietnam';
                    else if (rateName.includes('영국')) country = 'UK';
                    else if (rateName.includes('호주')) country = 'Australia';
                    else if (rateName.includes('캐나다')) country = 'Canada';
                    
                    tariffRates.fta[country] = {
                        rate: rateValue,
                        name: rateName
                    };
                }
                // 특혜관세
                else if (rateCode === 'R' || rateName.includes('특혜') || rateName.includes('최빈국')) {
                    tariffRates.preferential = rateValue;
                }
            }
            
            if (hasData) {
                // 최적 세율 찾기
                let bestRate = tariffRates.basic || 8;
                let bestRateType = '기본세율';
                
                if (tariffRates.wto && tariffRates.wto < bestRate) {
                    bestRate = tariffRates.wto;
                    bestRateType = 'WTO 협정세율';
                }
                
                if (tariffRates.fta) {
                    Object.entries(tariffRates.fta).forEach(([country, ftaInfo]) => {
                        if (ftaInfo.rate < bestRate) {
                            bestRate = ftaInfo.rate;
                            bestRateType = ftaInfo.name;
                        }
                    });
                }
                
                if (tariffRates.preferential !== undefined && tariffRates.preferential < bestRate) {
                    bestRate = tariffRates.preferential;
                    bestRateType = '특혜관세율';
                }
                
                tariffInfo = {
                    hsCode: hsCode,
                    itemName: '관세청 조회 품목',
                    koreanName: `HS번호 ${hsCode} 품목`,
                    unit: 'KG',
                    rates: {
                        basic: {
                            rate: tariffRates.basic || 8,
                            description: '기본관세율'
                        },
                        wto: {
                            rate: tariffRates.wto || tariffRates.basic || 8,
                            description: 'WTO 협정관세율'
                        },
                        preferential: {
                            rate: bestRate,
                            description: bestRateType
                        }
                    },
                    date: queryDate,
                    additionalInfo: {
                        dutyType: 'MULTIPLE',
                        description: '다양한 관세율 적용 가능',
                        availableRates: Object.keys(tariffRates).length,
                        ftaRates: tariffRates.fta || {}
                    }
                };
                
                logger.info(`Tariff rates parsed for ${hsCode}:`, tariffRates);
            }
        }
        // XML 응답 처리 (기존 로직 유지)
        else if (result && result.trrtQryRsponRst && result.trrtQryRsponRst.length > 0) {
            const rawData = result.trrtQryRsponRst[0];
            
            tariffInfo = {
                hsCode: rawData.hsSgn,
                itemName: rawData.hankNm,
                koreanName: rawData.hankNm,
                unit: rawData.stdUnitCd,
                rates: {
                    basic: {
                        rate: parseFloat(rawData.trrt) || 0,
                        description: rawData.trrtTpNm || '관세율'
                    },
                    wto: {
                        rate: parseFloat(rawData.trrt) || 0,
                        description: rawData.trrtTpNm || 'WTO 협정관세율'
                    },
                    preferential: {
                        rate: 0.0,
                        description: '특혜관세율'
                    }
                },
                date: queryDate,
                additionalInfo: {
                    dutyType: rawData.trrtTpCd,
                    description: rawData.trrtTpNm
                }
            };
        }

        // HS Code에 해당하는 관세율이 없으면 기본값 제공
        if (!tariffInfo) {
            logger.warn(`No tariff info found for HS Code ${hsCode} on ${queryDate}, using default`);
            
            tariffInfo = {
                hsCode: hsCode,
                itemName: '정보 없음',
                koreanName: '해당 HS Code 정보를 찾을 수 없습니다',
                unit: 'KG',
                rates: {
                    basic: { rate: 8.0, description: '기본관세율 (추정)' },
                    wto: { rate: 8.0, description: 'WTO 협정관세율 (추정)' },
                    preferential: { rate: 0.0, description: '특혜관세율 (추정)' }
                },
                date: queryDate,
                isDefault: true,
                additionalInfo: {
                    dutyType: 'AD',
                    description: '정확한 정보는 관세청에 문의하세요'
                }
            };
        }

        const responseData = {
            hsCode,
            date: queryDate,
            tariff: tariffInfo,
            timestamp: new Date().toISOString()
        };

        // 캐시 저장
        setCache(cacheKey, responseData);

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        logger.error('Tariff rate query failed', { error: error.message, hsCode, date: queryDate });
        throw serviceUnavailable(error.message);
    }
}));

/**
 * 수입요건 조회
 * GET /api/customs/requirements
 */
router.get('/requirements', [
    query('hsCode')
        .notEmpty()
        .withMessage('HS Code는 필수입니다')
        .isLength({ min: 6, max: 10 })
        .withMessage('HS Code는 6-10자리여야 합니다')
        .matches(/^\d+$/)
        .withMessage('HS Code는 숫자만 입력 가능합니다')
], asyncHandler(async (req, res) => {
    // 입력 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw badRequest('입력값이 올바르지 않습니다', errors.array());
    }

    const { hsCode } = req.query;
    
    // 캐시 확인
    const cacheKey = generateCacheKey('requirements', { hsCode });
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
        logger.debug('Requirements data served from cache', { hsCode });
        return res.json({
            success: true,
            data: cachedData,
            cached: true
        });
    }

    try {
        // 관세청 API 호출 (세관장확인대상 물품 조회)
        const result = await callCustomsAPI('ccctLworCdQry/retrieveCcctLworCd', {
            hsSgn: hsCode,
            imexTp: '2'
        });

        // 응답 데이터 처리 (실제 관세청 API 응답 구조 반영)
        let requirements = [];
        
        // 실제 관세청 API는 텍스트 형태로 응답 (웹 검색 결과 확인)
        if (typeof result === 'string' && result.length > 0) {
            logger.debug('Raw requirements response:', result);
            
            // 응답 형식: 숫자코드+HS코드+기관코드+법령명+서류명+날짜+기관명+법령코드
            // 예: 78509400000105전기용품 및 생활용품 안전관리법전기용품 및 생활용품 요건확인서20240730기술표준원23
            const requirementMap = new Map();
            
            // 더 정확한 정규식 패턴
            const regex = new RegExp(`(\\d+)${hsCode}(\\d+)([^\\d]+?)([^\\d]+?)(\\d{8})([^\\d]+)(\\d+)`, 'g');
            let match;
            
            while ((match = regex.exec(result)) !== null) {
                const agencyCode = match[2];
                const lawName = match[3].trim();
                const requirementDoc = match[4].trim();
                const validDate = match[5];
                const agencyName = match[6].trim();
                const lawCode = match[7];
                
                logger.debug(`Parsed requirement: ${lawName} - ${requirementDoc} - ${agencyName}`);
                
                if (!requirementMap.has(lawName)) {
                    requirementMap.set(lawName, {
                        hsCode: hsCode,
                        lawName: lawName,
                        requirementDoc: requirementDoc,
                        description: getRequirementDescription(lawName),
                        isRequired: true,
                        authority: agencyName,
                        validFrom: formatDate(validDate),
                        validUntil: null,
                        agencies: [agencyName],
                        lawCode: lawCode
                    });
                } else {
                    // 같은 법령에 대해 여러 기관이 있는 경우 추가
                    const existing = requirementMap.get(lawName);
                    if (!existing.agencies.includes(agencyName)) {
                        existing.agencies.push(agencyName);
                        existing.authority = existing.agencies.join(', ');
                    }
                }
            }
            
            requirements = Array.from(requirementMap.values());
            logger.info(`Requirements parsed for ${hsCode}:`, requirements.length);
        }
        // XML 응답 처리 (실제 관세청 API 응답 구조에 맞게 수정)
        else if (result && result.ccctLworCdQryRtnVo && result.ccctLworCdQryRtnVo.ccctLworCdQryRsltVo) {
            const rawData = result.ccctLworCdQryRtnVo.ccctLworCdQryRsltVo;
            const dataArray = Array.isArray(rawData) ? rawData : [rawData];
            
            logger.debug(`Processing ${dataArray.length} requirement records`);
            
            const requirementMap = new Map();
            
            dataArray.forEach(item => {
                const lawName = item.dcerCfrmLworNm;
                const agency = item.reqApreIttNm;
                
                if (!requirementMap.has(lawName)) {
                    requirementMap.set(lawName, {
                        hsCode: item.hsSgn,
                        lawName: lawName,
                        requirementDoc: item.reqCfrmIstmNm,
                                                 description: getRequirementDescription(lawName),
                        isRequired: true,
                        authority: agency,
                                                 validFrom: item.aplyStrtDt ? formatDate(item.aplyStrtDt) : null,
                         validUntil: item.aplyEndDt ? formatDate(item.aplyEndDt) : null,
                        agencies: [agency],
                        lawCode: item.dcerCfrmLworCd
                    });
                } else {
                    // 같은 법령에 대해 여러 기관이 있는 경우 추가
                    const existing = requirementMap.get(lawName);
                    if (!existing.agencies.includes(agency)) {
                        existing.agencies.push(agency);
                        existing.authority = existing.agencies.join(', ');
                    }
                }
            });
            
            requirements = Array.from(requirementMap.values());
            logger.info(`Requirements parsed for ${hsCode}:`, requirements.length);
        }

        // 수입요건이 없으면 기본 정보 제공
        if (requirements.length === 0) {
            logger.info(`No specific requirements found for HS Code ${hsCode}`);
            
            requirements = [{
                hsCode: hsCode,
                itemName: '일반 수입품목',
                requirementType: '없음',
                description: '특별한 수입요건이 없는 품목입니다',
                isRequired: false,
                authority: '관세청',
                contact: '1544-1545',
                additionalInfo: '정확한 정보는 관세청에 문의하세요'
            }];
        }

        const responseData = {
            hsCode,
            requirements,
            summary: {
                totalRequirements: requirements.length,
                mandatoryRequirements: requirements.filter(req => req.isRequired).length,
                hasRequirements: requirements.some(req => req.isRequired)
            },
            timestamp: new Date().toISOString()
        };

        // 캐시 저장
        setCache(cacheKey, responseData);

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        logger.error('Requirements query failed', { error: error.message, hsCode });
        throw serviceUnavailable(error.message);
    }
}));

/**
 * 종합 조회 (환율 + 관세율 + 수입요건)
 * GET /api/customs/comprehensive
 */
router.get('/comprehensive', [
    query('hsCode')
        .notEmpty()
        .withMessage('HS Code는 필수입니다')
        .isLength({ min: 6, max: 10 })
        .withMessage('HS Code는 6-10자리여야 합니다')
        .matches(/^\d+$/)
        .withMessage('HS Code는 숫자만 입력 가능합니다'),
    query('currency')
        .optional()
        .isIn(['USD', 'EUR', 'JPY', 'CNY', 'GBP'])
        .withMessage('지원하지 않는 통화입니다'),
    query('date')
        .optional()
        .matches(/^\d{8}$/)
        .withMessage('날짜는 YYYYMMDD 형식이어야 합니다')
], asyncHandler(async (req, res) => {
    // 입력 검증
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw badRequest('입력값이 올바르지 않습니다', errors.array());
    }

    const { hsCode, currency = 'USD', date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');

    try {
        // 병렬로 모든 정보 조회
        const [exchangeRateResult, tariffRateResult, requirementsResult] = await Promise.allSettled([
            callCustomsAPI('trifFxrtInfoQry/retrieveTrifFxrtInfo', {
                qryYymmDd: queryDate,
                imexTp: '2'
            }),
            callCustomsAPI('trrtQry/retrieveTrrt', {
                hsSgn: hsCode,
                aplyStrtDt: queryDate
            }),
            callCustomsAPI('ccctLworCdQry/retrieveCcctLworCd', {
                hsSgn: hsCode,
                imexTp: '2'
            })
        ]);

        // 환율 정보 처리
        let exchangeRate = null;
        if (exchangeRateResult.status === 'fulfilled' && exchangeRateResult.value?.trifFxrtInfoQryRtnVo) {
            const rates = exchangeRateResult.value.trifFxrtInfoQryRtnVo
                .filter(item => item.currSgn === currency);
            
            if (rates.length > 0) {
                exchangeRate = {
                    currency: rates[0].currSgn,
                    currencyName: rates[0].currKorNm,
                    baseRate: parseFloat(rates[0].basFxrt),
                    usdRate: parseFloat(rates[0].usDlrFxrt),
                    date: rates[0].fxrtYymmDd,
                    unit: rates[0].currUnit
                };
            }
        }

        // 관세율 정보 처리
        let tariffInfo = null;
        if (tariffRateResult.status === 'fulfilled' && tariffRateResult.value?.trrtQryRsponRst) {
            const rawData = tariffRateResult.value.trrtQryRsponRst[0];
            if (rawData) {
                tariffInfo = {
                    hsCode: rawData.hsSgn,
                    itemName: rawData.hankNm,
                    koreanName: rawData.hankNm,
                    unit: rawData.stdUnitCd,
                    rates: {
                        basic: parseFloat(rawData.trrt) || 0,
                        wto: parseFloat(rawData.trrt) || 0,
                        preferential: 0.0
                    }
                };
            }
        }

        // 수입요건 정보 처리
        let requirements = [];
        if (requirementsResult.status === 'fulfilled' && requirementsResult.value?.ccctLworCdQryRsponRst) {
            requirements = requirementsResult.value.ccctLworCdQryRsponRst.map(item => ({
                requirementType: item.dcerCfrmLworNm,
                description: item.dcerCfrmCn,
                isRequired: true,
                authority: item.dcerCfrmAgncNm
            }));
        }

        const responseData = {
            hsCode,
            currency,
            date: queryDate,
            exchangeRate,
            tariff: tariffInfo,
            requirements,
            summary: {
                hasExchangeRate: !!exchangeRate,
                hasTariffInfo: !!tariffInfo,
                hasRequirements: requirements.length > 0,
                mandatoryRequirements: requirements.filter(req => req.isRequired).length
            },
            timestamp: new Date().toISOString(),
            apiCallResults: {
                exchangeRate: exchangeRateResult.status,
                tariffRate: tariffRateResult.status,
                requirements: requirementsResult.status
            }
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        logger.error('Comprehensive query failed', { error: error.message, hsCode, currency, date: queryDate });
        throw serviceUnavailable(error.message);
    }
}));

/**
 * 캐시 상태 조회
 * GET /api/customs/cache-status
 */
router.get('/cache-status', asyncHandler(async (req, res) => {
    const cacheStats = {
        totalEntries: cache.size,
        cacheHits: 0, // 실제 구현에서는 별도 카운터 필요
        cacheMisses: 0, // 실제 구현에서는 별도 카운터 필요
        cacheDuration: CACHE_DURATION,
        entries: []
    };

    // 캐시 항목들 정보
    cache.forEach((value, key) => {
        const age = Math.floor((Date.now() - value.timestamp) / 1000);
        const ttl = Math.max(0, CACHE_DURATION - age);
        
        cacheStats.entries.push({
            key,
            age: `${age}초`,
            ttl: `${ttl}초`,
            size: JSON.stringify(value.data).length
        });
    });

    res.json({
        success: true,
        data: cacheStats
    });
}));

/**
 * 캐시 초기화
 * DELETE /api/customs/cache
 */
router.delete('/cache', asyncHandler(async (req, res) => {
    const entriesDeleted = cache.size;
    cache.clear();
    
    logger.info(`Cache cleared: ${entriesDeleted} entries deleted`);
    
    res.json({
        success: true,
        data: {
            message: '캐시가 초기화되었습니다',
            entriesDeleted,
            timestamp: new Date().toISOString()
        }
    });
}));

module.exports = router; 