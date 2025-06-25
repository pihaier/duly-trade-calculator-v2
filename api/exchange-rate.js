/**
 * 환율 조회 API - Vercel 서버리스 함수
 */
const axios = require('axios');
const xml2js = require('xml2js');

// 간단한 메모리 캐시
const cache = new Map();
const CACHE_DURATION = 300; // 5분

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
        const { currency = 'USD', date } = req.query;
        const queryDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        // 캐시 확인
        const cacheKey = `exchange-rate_${currency}_${queryDate}`;
        const cachedData = getFromCache(cacheKey);
        
        if (cachedData) {
            return res.json({
                success: true,
                data: cachedData,
                cached: true
            });
        }

        // API 키 설정
        const apiKey = process.env.CUSTOMS_API_KEY || 'o260t225i086q161g060c050i0';
        
        if (!apiKey) {
            throw new Error('API 키가 설정되지 않았습니다.');
        }

        // 관세청 API 호출
        const apiUrl = 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo';
        
        const params = {
            crkyCn: apiKey,
            qryYymmDd: queryDate,
            imexTp: '2' // 수입
        };

        console.log('관세청 환율 API 호출:', apiUrl);
        console.log('요청 파라미터:', params);

        const response = await axios.get(apiUrl, {
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'Duly-Trade-Calculator/2.0.0',
                'Accept': 'application/xml, text/xml, */*'
            }
        });

        console.log('API 응답 상태:', response.status);
        console.log('API 응답 타입:', typeof response.data);

        let exchangeRates = [];

        // XML 응답 파싱
        if (typeof response.data === 'string' && response.data.includes('<?xml')) {
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true
            });
            
            const result = await parser.parseStringPromise(response.data);
            console.log('파싱된 XML:', JSON.stringify(result, null, 2));
            
            if (result && result.trifFxrtInfoQryRtnVo) {
                // 오류 응답 체크
                if (result.trifFxrtInfoQryRtnVo.errYn === 'Y') {
                    throw new Error(result.trifFxrtInfoQryRtnVo.errMsg || '관세청 API 오류');
                }
                
                // 정상 응답 처리
                if (result.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo) {
                    const rateList = result.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo;
                    const rates = Array.isArray(rateList) ? rateList : [rateList];
                    
                    exchangeRates = rates
                        .filter(item => item && item.currSgn && (!currency || item.currSgn === currency))
                        .map(item => ({
                            currency: item.currSgn,
                            currencyName: item.mtryUtNm || item.currKorNm || item.currSgn,
                            baseRate: parseFloat(item.fxrt || item.basFxrt || 0),
                            usdRate: parseFloat(item.usDlrFxrt || item.fxrt || 0),
                            date: item.aplyBgnDt || queryDate,
                            unit: parseInt(item.currUnit) || 1
                        }));
                }
            }
        }

        if (exchangeRates.length === 0) {
            throw new Error('환율 정보를 찾을 수 없습니다.');
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
        console.error('환율 조회 오류:', error.message);
        console.error('상세 오류:', error.response?.data || error.stack);
        
        res.status(500).json({
            success: false,
            error: error.message,
            message: '관세청 환율 API 호출에 실패했습니다.'
        });
    }
}; 