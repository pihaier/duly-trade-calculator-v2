/**
 * 관세율 조회 API - Vercel 서버리스 함수
 */
const axios = require('axios');
const xml2js = require('xml2js');

// 간단한 메모리 캐시
const cache = new Map();
const CACHE_DURATION = 0; // 캐시 사용 안함 (테스트를 위해)

const getFromCache = (key) => {
    // 캐시 비활성화
    return null;
    
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION * 1000) {
        return cached.data;
    }
    cache.delete(key);
    return null;
};

const setCache = (key, data) => {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
};

module.exports = async (req, res) => {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { hsCode, date, importCountry } = req.query;
        
        if (!hsCode) {
            return res.status(400).json({
                error: 'HS Code가 필요합니다.',
                code: 'MISSING_HS_CODE'
            });
        }

        const queryDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        // 캐시 확인
        const cacheKey = `tariff-rate_${hsCode}_${queryDate}_${importCountry}`;
        const cachedData = getFromCache(cacheKey);
        
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                cached: true
            });
        }

        // API 키 설정
        const apiKey = process.env.CUSTOMS_API_KEY || 'i260d241g061e220n060p010q0';
        
        if (!apiKey) {
            throw new Error('API 키가 설정되지 않았습니다.');
        }

        // 관세청 API 호출
        const apiUrl = 'https://unipass.customs.go.kr:38010/ext/rest/trrtQry/retrieveTrrt';
        
        const params = {
            crkyCn: apiKey,
            hsSgn: hsCode,
            aplyStrtDt: queryDate
        };

        const response = await axios.get(apiUrl, {
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'Duly-Trade-Calculator/2.0.0',
                'Accept': 'application/xml, text/xml, */*'
            }
        });

        let tariffInfo = null;

        // XML 응답 파싱
        if (typeof response.data === 'string' && response.data.includes('<?xml')) {
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true
            });
            
            const result = await parser.parseStringPromise(response.data);
            
            if (result && result.trrtQryRtnVo) {
                // 오류 응답 체크 - errYn이 있고 'Y'인 경우만 에러로 처리
                if (result.trrtQryRtnVo.errYn && result.trrtQryRtnVo.errYn === 'Y') {
                    throw new Error(result.trrtQryRtnVo.errMsg || '관세청 API 오류');
                }
                
                // 정상 응답 처리
                if (result.trrtQryRtnVo.trrtQryRsltVo) {
                    const tariffData = result.trrtQryRtnVo.trrtQryRsltVo;
                    const tariffList = Array.isArray(tariffData) ? tariffData : [tariffData];
                    
                    const rates = {};
                    const ftaRates = {};
                    
                    // 수입국가별 FTA 코드 매핑
                    const countryFtaMapping = {
                        '중국': ['FCN1', 'FRCCN1'], // 한중FTA, RCEP중국
                        'CN': ['FCN1', 'FRCCN1'],
                        '미국': ['FUS1'], // 한미FTA
                        'US': ['FUS1'],
                        '일본': ['FRCJP1'], // RCEP일본
                        'JP': ['FRCJP1'],
                        '베트남': ['FVN1', 'FAS1', 'FRCAS1'], // 한베트남FTA, 한아세안FTA, RCEP아세안
                        'VN': ['FVN1', 'FAS1', 'FRCAS1'],
                        '태국': ['FAS1', 'FRCAS1'], // 한아세안FTA, RCEP아세안
                        'TH': ['FAS1', 'FRCAS1'],
                        '싱가포르': ['FSG1', 'FAS1', 'FRCAS1'], // 한싱가포르FTA, 한아세안FTA, RCEP아세안
                        'SG': ['FSG1', 'FAS1', 'FRCAS1'],
                        '말레이시아': ['FAS1', 'FRCAS1'], // 한아세안FTA, RCEP아세안
                        'MY': ['FAS1', 'FRCAS1'],
                        '인도': ['FIN1'], // 한인도FTA
                        'IN': ['FIN1'],
                        '독일': ['FEU1'], // 한EU FTA
                        'DE': ['FEU1'],
                        'EU': ['FEU1']
                    };
                    
                    // 해당 국가의 FTA 코드 가져오기
                    const applicableFtaCodes = countryFtaMapping[importCountry] || [];
                    
                    tariffList.forEach(item => {
                        
                        // imexTpcd가 없으므로 모든 데이터가 수입 관련
                        const rateValue = parseFloat(item.trrt || 0);  // 필드명 수정
                        const rateType = item.trrtTpcd || '';  // 필드명 수정
                        const rateName = item.trrtTpNm || '';  // 필드명 수정
                        
                        // 기본세율
                        if (rateType === 'A') {
                            rates.basic = {
                                rate: rateValue,
                                description: '기본세율'
                            };
                        }
                        // WTO 협정세율
                        else if (rateType === 'C') {
                            rates.wto = {
                                rate: rateValue,
                                description: 'WTO 협정세율'
                            };
                        }
                        // 최빈국특혜관세
                        else if (rateType === 'R') {
                            rates.ldc = {
                                rate: rateValue,
                                description: '최빈국특혜관세'
                            };
                        }
                        // FTA 관세율 - 해당 국가의 FTA만 처리
                        else if (rateType.startsWith('F') && applicableFtaCodes.includes(rateType)) {
                            ftaRates[rateType] = {
                                rate: rateValue,
                                name: rateName,
                                code: rateType
                            };
                        }
                    });
                    
                    // 최적 세율 선택
                    let preferentialRate = rates.wto || rates.basic;
                    
                    // 수입국가에 따른 FTA 적용 (가장 낮은 FTA 세율 선택)
                    let lowestFtaRate = null;
                    Object.values(ftaRates).forEach(fta => {
                        if (!lowestFtaRate || fta.rate < lowestFtaRate.rate) {
                            lowestFtaRate = fta;
                        }
                    });
                    
                    if (lowestFtaRate && (!preferentialRate || lowestFtaRate.rate < preferentialRate.rate)) {
                        preferentialRate = {
                            rate: lowestFtaRate.rate,
                            description: lowestFtaRate.name
                        };
                    }
                    
                    // 실제 데이터가 없으면 에러 반환
                    if (!rates.basic && !rates.wto && Object.keys(ftaRates).length === 0) {
                        throw new Error('해당 HS Code에 대한 관세율 정보를 찾을 수 없습니다.');
                    }
                    
                    tariffInfo = {
                        hsCode: hsCode,
                        itemName: `HS ${hsCode} 품목`,  // 품목명이 응답에 없음
                        koreanName: `HS번호 ${hsCode} 품목`,
                        unit: 'KG',  // 단위도 응답에 없음
                        rates: {
                            basic: rates.basic,
                            wto: rates.wto,
                            preferential: preferentialRate
                        },
                        additionalInfo: {
                            ftaRates: ftaRates, // 해당 국가의 FTA만 포함됨
                            ftaApplicable: Object.keys(ftaRates).length > 0,
                            importCountry: importCountry || 'N/A',
                            queryDate: queryDate,
                            allRates: {
                                basic: rates.basic,
                                wto: rates.wto,
                                ldc: rates.ldc,
                                fta: ftaRates
                            }
                        },
                        date: queryDate
                    };
                }
            }
        }

        if (!tariffInfo) {
            throw new Error('관세율 정보를 찾을 수 없습니다.');
        }

        // 캐시 저장
        setCache(cacheKey, tariffInfo);

        res.json({
            success: true,
            data: tariffInfo
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: '관세청 관세율 API 호출에 실패했습니다.'
        });
    }
}; 