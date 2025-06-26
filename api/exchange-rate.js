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
        const { currency, date } = req.query;
        const queryDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        // 🔧 최적화: 모든 환율을 조회하도록 캐시 키 변경
        const isAllCurrencies = !currency || currency === 'ALL';
        const cacheKey = isAllCurrencies ? `exchange-rate_ALL_${queryDate}` : `exchange-rate_${currency}_${queryDate}`;
        
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

        const response = await axios.get(apiUrl, {
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'Duly-Trade-Calculator/2.0.0',
                'Accept': 'application/xml, text/xml, */*'
            }
        });

        let exchangeRates = [];

        // XML 응답 파싱
        if (typeof response.data === 'string' && response.data.includes('<?xml')) {
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true
            });
            
            const result = await parser.parseStringPromise(response.data);
            
            if (result && result.trifFxrtInfoQryRtnVo) {
                // 오류 응답 체크
                if (result.trifFxrtInfoQryRtnVo.errYn === 'Y') {
                    throw new Error(result.trifFxrtInfoQryRtnVo.errMsg || '관세청 API 오류');
                }
                
                // 정상 응답 처리
                if (result.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo) {
                    const rateList = result.trifFxrtInfoQryRtnVo.trifFxrtInfoQryRsltVo;
                    const rates = Array.isArray(rateList) ? rateList : [rateList];
                    
                    // 🔧 최적화: 모든 환율 조회 시 필터링하지 않음
                    exchangeRates = rates
                        .filter(item => {
                            if (!item || !item.currSgn) return false;
                            // 특정 통화 요청 시에만 필터링
                            return isAllCurrencies || item.currSgn === currency;
                        })
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
            currency: isAllCurrencies ? 'ALL' : currency,
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
        res.status(500).json({
            success: false,
            error: error.message,
            message: '관세청 환율 API 호출에 실패했습니다.'
        });
    }
}; 