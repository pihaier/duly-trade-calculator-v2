/**
 * 수입요건 조회 API - Vercel 서버리스 함수
 */
const axios = require('axios');
const xml2js = require('xml2js');

// 간단한 메모리 캐시
const cache = new Map();
const CACHE_DURATION = 3600; // 1시간

const getFromCache = (key) => {
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
        const { hsCode } = req.query;
        
        if (!hsCode) {
            return res.status(400).json({
                error: 'HS Code가 필요합니다.',
                code: 'MISSING_HS_CODE'
            });
        }

        // 캐시 확인 - 임시로 비활성화 (가짜 데이터 문제 해결을 위해)
        const cacheKey = `requirements_${hsCode}`;
        // const cachedData = getFromCache(cacheKey);
        
        // if (cachedData) {
        //     return res.json({
        //         success: true,
        //         data: cachedData,
        //         cached: true
        //     });
        // }

        // API 키 설정
        const apiKey = process.env.CUSTOMS_API_KEY || 'o290n245e076c101p030d000q0';

        if (!apiKey) {
            throw new Error('API 키가 설정되지 않았습니다.');
        }

        // 관세청 API 호출
        const apiUrl = 'https://unipass.customs.go.kr:38010/ext/rest/ccctLworCdQry/retrieveCcctLworCd';
        
        const params = {
            crkyCn: apiKey,
            hsSgn: hsCode,
            imexTp: '2'  // 수입 (1: 수출, 2: 수입) - 필수 파라미터
        };

        const response = await axios.get(apiUrl, {
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'Duly-Trade-Calculator/2.0.0',
                'Accept': 'application/xml, text/xml, */*'
            }
        });

        let requirementInfo = null;

        // XML 응답 파싱
        if (typeof response.data === 'string' && response.data.includes('<?xml')) {
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true
            });
            
            const result = await parser.parseStringPromise(response.data);
            
            if (result && result.ccctLworCdQryRtnVo) {
                // 오류 응답 체크
                if (result.ccctLworCdQryRtnVo.errYn === 'Y') {
                    throw new Error(result.ccctLworCdQryRtnVo.errMsg || '관세청 API 오류');
                }
                
                // 정상 응답 처리
                if (result.ccctLworCdQryRtnVo.ccctLworCdQryRsltVo) {
                    const requirementData = result.ccctLworCdQryRtnVo.ccctLworCdQryRsltVo;
                    const requirementList = Array.isArray(requirementData) ? requirementData : [requirementData];
                    
                    // 수입요건 개수 확인
                    
                    const requirements = requirementList.map(item => ({
                        lawCode: item.dcerCfrmLworCd || '',
                        lawName: item.dcerCfrmLworNm || '관련 법규',
                        requirementDoc: item.reqCfrmIstmNm || '요건확인서',
                        agency: item.reqApreIttNm || '',
                        agencyCode: item.reqApreIttCd || '',
                        startDate: item.aplyStrtDt || '',
                        endDate: item.aplyEndDt || '',
                        hsCode: item.hsSgn || hsCode,
                        description: `${item.dcerCfrmLworNm}에 따른 ${item.reqCfrmIstmNm}가 필요합니다.`,
                        isRequired: true
                    }));
                    
                    // 법령별로 그룹화하여 중복 제거
                    const lawGroups = {};
                    requirements.forEach(req => {
                        if (!lawGroups[req.lawCode]) {
                            lawGroups[req.lawCode] = {
                                lawCode: req.lawCode,
                                lawName: req.lawName,
                                requirementDoc: req.requirementDoc,
                                description: req.description,
                                agencies: [],
                                isRequired: true
                            };
                        }
                        if (req.agency) {
                            lawGroups[req.lawCode].agencies.push({
                                name: req.agency,
                                code: req.agencyCode
                            });
                        }
                    });
                    
                    const groupedRequirements = Object.values(lawGroups).map(group => ({
                        lawName: group.lawName,
                        requirementDoc: group.requirementDoc,
                        description: group.description,
                        agency: group.agencies.map(a => a.name).join(', '),
                        isRequired: group.isRequired,
                        agencies: group.agencies
                    }));
                    
                    requirementInfo = {
                        hsCode: hsCode,
                        itemName: `HS ${hsCode} 품목`,
                        totalCount: parseInt(result.ccctLworCdQryRtnVo.tCnt) || requirementList.length,
                        requirements: groupedRequirements,
                        additionalInfo: {
                            source: '관세청 세관장확인대상 물품 조회 API',
                            lastUpdated: new Date().toISOString(),
                            hsCode: hsCode,
                            apiResponse: 'success'
                        }
                    };
                } else {
                    // 수입요건이 없는 경우
                    requirementInfo = {
                        hsCode: hsCode,
                        itemName: `HS ${hsCode} 품목`,
                        totalCount: 0,
                        requirements: [{
                            lawName: '일반 수입요건',
                            requirementDoc: '수입신고서',
                            description: '특별한 세관장확인대상 요건이 없는 품목입니다. 일반적인 수입 절차를 따릅니다.',
                            agency: '관세청',
                            isRequired: false
                        }],
                        additionalInfo: {
                            source: '관세청 세관장확인대상 물품 조회 API',
                            lastUpdated: new Date().toISOString(),
                            hsCode: hsCode,
                            apiResponse: 'no_requirements'
                        }
                    };
                }
            }
        }

        if (!requirementInfo) {
            throw new Error('수입요건 정보를 찾을 수 없습니다.');
        }

        // 캐시 저장
        setCache(cacheKey, requirementInfo);

        res.json({
            success: true,
            data: requirementInfo
        });

    } catch (error) {
        // 에러 발생 시 빈 배열이 아닌 에러 응답 반환
        res.status(500).json({
            success: false,
            error: error.message,
            message: '관세청 수입요건 API 호출에 실패했습니다.',
            data: {
                hsCode: hsCode,
                itemName: `HS ${hsCode} 품목`,
                totalCount: 0,
                requirements: [], // 빈 배열 반환, 기본값 없음
                additionalInfo: {
                    source: '관세청 세관장확인대상 물품 조회 API 실패',
                    lastUpdated: new Date().toISOString(),
                    hsCode: hsCode,
                    apiResponse: 'error'
                }
            }
        });
    }
}; 