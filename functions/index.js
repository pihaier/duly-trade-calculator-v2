/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

// 관세청 API 키들 (각 API별로 다른 키 사용)
const CUSTOMS_API_KEYS = {
    'trifFxrtInfoQry': process.env.EXCHANGE_API_KEY || 'o260t225i086q161g060c050i0',  // 환율조회
    'trrtQry': process.env.TARIFF_API_KEY || 'i260d241g061e220n060p010q0',           // 관세율조회  
    'ccctLworCdQry': process.env.REQUIREMENTS_API_KEY || 'o290n245e076c101p030d000q0' // 세관장확인
};

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const app = express();

// CORS 설정
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// =============================================================================
// CBM 계산기 API
// =============================================================================

/**
 * CBM 계산 함수
 */
function calculateCBM(input) {
    const { length, width, height, weight, quantity, usePallet, palletType } = input;
    
    // 기본 계산
    const volumePerBox = (length / 100) * (width / 100) * (height / 100); // m³
    const totalVolume = volumePerBox * quantity;
    const totalWeight = weight * quantity;
    
    // 컨테이너 정보
    const containers = {
        '20ft': { volume: 33.2, weight: 25000, length: 5.9, width: 2.35, height: 2.39 },
        '40ft': { volume: 67.7, weight: 26500, length: 12.03, width: 2.35, height: 2.39 },
        '40hc': { volume: 76.4, weight: 26500, length: 12.03, width: 2.35, height: 2.69 }
    };
    
    // 각 컨테이너별 계산
    const containerResults = {};
    
    Object.keys(containers).forEach(type => {
        const container = containers[type];
        
        // 부피 기준 계산
        const maxBoxesByVolume = Math.floor(container.volume / volumePerBox);
        
        // 무게 기준 계산
        const maxBoxesByWeight = Math.floor(container.weight / weight);
        
        // 실제 최대 적재량 (부피와 무게 중 작은 값)
        const maxBoxes = Math.min(maxBoxesByVolume, maxBoxesByWeight);
        
        // 필요한 컨테이너 수
        const containersNeeded = Math.ceil(quantity / maxBoxes);
        
        containerResults[type] = {
            maxBoxes,
            containersNeeded,
            efficiency: (quantity / (maxBoxes * containersNeeded) * 100).toFixed(1),
            totalVolume: containersNeeded * container.volume,
            totalWeight: containersNeeded * container.weight
        };
    });
    
    // 팔레트 계산
    let palletInfo = null;
    if (usePallet) {
        const palletDimensions = { width: 1.2, depth: 1.0, height: 1.8 };
        const palletVolume = palletDimensions.width * palletDimensions.depth * palletDimensions.height;
        const maxBoxesPerPallet = Math.floor(palletVolume / volumePerBox);
        const palletsNeeded = Math.ceil(quantity / maxBoxesPerPallet);
        
        palletInfo = {
            maxBoxesPerPallet,
            palletsNeeded,
            totalPalletVolume: palletsNeeded * palletVolume
        };
    }
    
    return {
        input,
        calculations: {
            volumePerBox,
            totalVolume,
            totalWeight,
            containers: containerResults,
            pallet: palletInfo
        },
        recommendation: getContainerRecommendation(containerResults)
    };
}

/**
 * 컨테이너 추천
 */
function getContainerRecommendation(containers) {
    let bestOption = null;
    let bestEfficiency = 0;
    
    Object.keys(containers).forEach(type => {
        const efficiency = parseFloat(containers[type].efficiency);
        if (efficiency > bestEfficiency) {
            bestEfficiency = efficiency;
            bestOption = type;
        }
    });
    
    return {
        recommended: bestOption,
        efficiency: bestEfficiency,
        reason: `가장 높은 적재 효율성 (${bestEfficiency}%)`
    };
}

/**
 * 3D 시뮬레이션 데이터 생성
 */
function generate3DData(input, containerType) {
    const containers = {
        '20ft': { length: 5.9, width: 2.35, height: 2.39 },
        '40ft': { length: 12.03, width: 2.35, height: 2.39 },
        '40hc': { length: 12.03, width: 2.35, height: 2.69 }
    };
    
    const container = containers[containerType];
    const boxDimensions = {
        length: input.length / 100,
        width: input.width / 100,
        height: input.height / 100
    };
    
    // 박스 배치 계산
    const boxesPerRow = Math.floor(container.length / boxDimensions.length);
    const boxesPerColumn = Math.floor(container.width / boxDimensions.width);
    const boxesPerLayer = Math.floor(container.height / boxDimensions.height);
    
    const maxBoxes = boxesPerRow * boxesPerColumn * boxesPerLayer;
    const actualBoxes = Math.min(input.quantity, maxBoxes);
    
    // 박스 위치 계산
    const boxes = [];
    let count = 0;
    
    for (let layer = 0; layer < boxesPerLayer && count < actualBoxes; layer++) {
        for (let col = 0; col < boxesPerColumn && count < actualBoxes; col++) {
            for (let row = 0; row < boxesPerRow && count < actualBoxes; row++) {
                boxes.push({
                    id: count + 1,
                    position: {
                        x: row * boxDimensions.length + boxDimensions.length / 2,
                        y: layer * boxDimensions.height + boxDimensions.height / 2,
                        z: col * boxDimensions.width + boxDimensions.width / 2
                    },
                    dimensions: boxDimensions
                });
                count++;
            }
        }
    }
    
    return {
        container: {
            type: containerType,
            dimensions: container,
            utilization: (actualBoxes / maxBoxes * 100).toFixed(1)
        },
        boxes,
        summary: {
            totalBoxes: actualBoxes,
            maxCapacity: maxBoxes,
            layers: Math.ceil(actualBoxes / (boxesPerRow * boxesPerColumn))
        }
    };
}

// CBM 계산 API 엔드포인트
app.post('/cbm/calculate', (req, res) => {
    try {
        const result = calculateCBM(req.body);
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('CBM 계산 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 3D 시뮬레이션 API 엔드포인트
app.post('/cbm/3d-simulation', (req, res) => {
    try {
        const { input, containerType } = req.body;
        const result = generate3DData(input, containerType);
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('3D 시뮬레이션 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// 총 비용 계산기 API
// =============================================================================

/**
 * 환율 조회 (API012 - 관세환율 정보)
 */
async function getExchangeRate() {
    try {
        // 관세청 환율 조회 API 호출
        const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        const response = await axios.get(
            'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo',
            {
                params: {
                    crkyCn: CUSTOMS_API_KEYS.trifFxrtInfoQry,
                    qryYymmDd: currentDate,
                    imexTp: '2' // 수입
                },
                timeout: 10000
            }
        );
        
        // XML 응답에서 USD 환율 추출
        const xmlData = response.data;
        
        // 정확한 USD 환율 추출: USD 통화 코드와 해당 환율을 정확히 매칭
        // 문제: 기존 정규식이 UZS(우즈베키스탄)의 0.11을 잘못 매칭함
        // 해결: US 국가코드부터 USD 통화코드까지 하나의 블록으로 매칭
        const usdPattern = /<cntySgn>US<\/cntySgn>[\s\S]*?<fxrt>([^<]+)<\/fxrt>[\s\S]*?<currSgn>USD<\/currSgn>/;
        const usdMatch = xmlData.match(usdPattern);
        
        if (usdMatch) {
            const usdRate = parseFloat(usdMatch[1]);
            // 관세청 API는 이미 1달러당 원화 환율을 직접 제공함 (1368.98원)
            // 기존 코드에서 역수를 취한 것은 잘못된 해석이었음
            return Math.round(usdRate);
        }
        
        return 1350; // 기본값
    } catch (error) {
        logger.error('환율 조회 오류:', error);
        return 1350; // 기본값
    }
}

/**
 * 관세율 조회 (API030 - 관세율 기본 조회)
 */
async function getTariffRate(hsCode, country) {
    try {
        // 관세청 관세율 조회 API 호출 (trrtQry)
        const response = await axios.get(
            'https://unipass.customs.go.kr:38010/ext/rest/trrtQry/retrieveTrrt',
            {
                params: {
                    crkyCn: CUSTOMS_API_KEYS.trrtQry,
                    hsSgn: hsCode,
                    trrtTpcd: 'C' // 기본 관세율
                },
                timeout: 10000
            }
        );
        
        // XML 응답 파싱
        const xmlData = response.data;
        const trrtMatch = xmlData.match(/<trrt>([^<]+)<\/trrt>/);
        
        if (trrtMatch) {
            const tariffRate = parseFloat(trrtMatch[1]);
            return tariffRate;
        }
        
        return 8.0; // 기본 관세율
    } catch (error) {
        logger.error('관세율 조회 오류:', error);
        return 8.0; // 기본값
    }
}

/**
 * 총 비용 계산
 */
async function calculateTotalCost(input) {
    const {
        productPrice,
        quantity,
        shippingCost,
        country,
        hsCode,
        insuranceRate = 0.3,
        otherCosts = 0
    } = input;
    
    // 기본 계산
    const totalProductCost = productPrice * quantity;
    const totalShippingCost = shippingCost;
    const insuranceCost = (totalProductCost + totalShippingCost) * (insuranceRate / 100);
    
    // CIF 가격 (Cost + Insurance + Freight)
    const cifPrice = totalProductCost + totalShippingCost + insuranceCost;
    
    // 환율 조회
    const exchangeRate = await getExchangeRate();
    const cifKrw = cifPrice * exchangeRate;
    
    // 관세율 조회
    const tariffRate = await getTariffRate(hsCode, country);
    const tariffAmount = cifKrw * (tariffRate / 100);
    
    // C/O 발급비 (원산지증명서)
    const coIssuanceFee = 50000; // 5만원 고정
    
    // 기타 비용
    const otherCostsKrw = otherCosts;
    
    // 부가세 계산 (CIF + 관세 + C/O 발급비 + 기타비용) × 10%
    const vatBase = cifKrw + tariffAmount + coIssuanceFee + otherCostsKrw;
    const vatAmount = vatBase * 0.1;
    
    // 총 비용
    const totalCost = cifKrw + tariffAmount + coIssuanceFee + otherCostsKrw + vatAmount;
    
    return {
        input,
        calculations: {
            productCost: totalProductCost,
            shippingCost: totalShippingCost,
            insuranceCost,
            cifPrice,
            cifKrw,
            exchangeRate,
            tariffRate,
            tariffAmount,
            coIssuanceFee,
            otherCosts: otherCostsKrw,
            vatBase,
            vatAmount,
            totalCost
        },
        breakdown: {
            'CIF 가격': cifKrw,
            '관세': tariffAmount,
            'C/O 발급비': coIssuanceFee,
            '기타 비용': otherCostsKrw,
            '부가세': vatAmount
        },
        summary: {
            totalCostKrw: totalCost,
            totalCostUsd: totalCost / exchangeRate,
            costPerUnit: totalCost / quantity
        }
    };
}

// 총 비용 계산 API 엔드포인트
app.post('/cost/calculate', async (req, res) => {
    try {
        const result = await calculateTotalCost(req.body);
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('총 비용 계산 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// 수입요건 조회 API
// =============================================================================

/**
 * 수입요건 조회 (API029 - 세관장확인대상 물품 조회)
 */
async function getImportRequirements(hsCode) {
    try {
        const response = await axios.get(
            'https://unipass.customs.go.kr:38010/ext/rest/ccctLworCdQry/retrieveCcctLworCd',
            {
                params: {
                    crkyCn: CUSTOMS_API_KEYS.ccctLworCdQry,
                    hsSgn: hsCode,
                    imexTp: '2' // 수입 (필수)
                },
                timeout: 10000
            }
        );
        
        const xmlData = response.data;
        const requirements = [];
        
        // XML에서 수입요건 정보 추출 - API 가이드에 맞춰 태그명 수정
        // API029 응답 파라미터: dcerCfrmLworNm (신고인확인법령명), reqCfrmIstmNm (요건확인서류명), reqApreIttNm (요건승인기관명)
        const lawMatches = xmlData.match(/<dcerCfrmLworNm>([^<]+)<\/dcerCfrmLworNm>/g);
        const docMatches = xmlData.match(/<reqCfrmIstmNm>([^<]+)<\/reqCfrmIstmNm>/g);
        const authorityMatches = xmlData.match(/<reqApreIttNm>([^<]+)<\/reqApreIttNm>/g);
        const lawCodeMatches = xmlData.match(/<dcerCfrmLworCd>([^<]+)<\/dcerCfrmLworCd>/g);
        const orgCodeMatches = xmlData.match(/<reqApreIttCd>([^<]+)<\/reqApreIttCd>/g);
        
        if (lawMatches && docMatches) {
            lawMatches.forEach((lawMatch, index) => {
                const lawName = lawMatch.replace(/<[^>]+>/g, '');
                const docName = docMatches[index] ? docMatches[index].replace(/<[^>]+>/g, '') : '';
                const authority = authorityMatches && authorityMatches[index] 
                    ? authorityMatches[index].replace(/<[^>]+>/g, '') 
                    : '관세청';
                const lawCode = lawCodeMatches && lawCodeMatches[index]
                    ? lawCodeMatches[index].replace(/<[^>]+>/g, '')
                    : '';
                const orgCode = orgCodeMatches && orgCodeMatches[index]
                    ? orgCodeMatches[index].replace(/<[^>]+>/g, '')
                    : '';
                
                if (lawName && docName) {
                    requirements.push({
                        id: index + 1,
                        lawCode: lawCode,
                        lawName: lawName,
                        requirementDoc: docName,
                        description: `HS코드 ${hsCode}에 대한 수입요건입니다.`,
                        authority: authority,
                        authorityCode: orgCode,
                        validFrom: new Date().toISOString().split('T')[0],
                        validUntil: '상시적용'
                    });
                }
            });
        }
        
        // 기본 요건이 없는 경우
        if (requirements.length === 0) {
            requirements.push({
                id: 1,
                lawName: '일반 수입요건',
                requirementDoc: '수입신고서, 원산지증명서, 상업송장, 포장명세서',
                description: '일반적인 수입 시 필요한 기본 서류입니다.',
                authority: '관세청',
                validFrom: new Date().toISOString().split('T')[0],
                validUntil: '상시적용'
            });
        }
        
        return requirements;
    } catch (error) {
        logger.error('수입요건 조회 오류:', error);
        
        // 기본 요건 반환
        return [{
            id: 1,
            lawName: '일반 수입요건',
            requirementDoc: '수입신고서, 원산지증명서, 상업송장, 포장명세서',
            description: '일반적인 수입 시 필요한 기본 서류입니다.',
            authority: '관세청',
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: '상시적용'
        }];
    }
}

// 수입요건 조회 API 엔드포인트
app.get('/requirements/:hsCode', async (req, res) => {
    try {
        const { hsCode } = req.params;
        const requirements = await getImportRequirements(hsCode);
        
        res.json({
            success: true,
            data: {
                hsCode,
                requirements,
                count: requirements.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('수입요건 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// 관세율 조회 API 엔드포인트
// =============================================================================

app.get('/tariff-rate/:hsCode', async (req, res) => {
    try {
        const { hsCode } = req.params;
        const { country } = req.query;
        
        if (!hsCode || !/^\d{6,10}$/.test(hsCode)) {
            return res.status(400).json({
                success: false,
                error: 'HS Code는 6-10자리 숫자여야 합니다.'
            });
        }

        const tariffRate = await getTariffRate(hsCode, country);
        
        res.json({
            success: true,
            data: {
                hsCode,
                country,
                tariffRate,
                tariffType: '기본 관세율',
                description: `HS코드 ${hsCode}의 관세율`,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        logger.error('관세율 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message || '관세율 조회 중 오류가 발생했습니다.'
        });
    }
});

// =============================================================================
// 환율 조회 API 엔드포인트
// =============================================================================

app.get('/exchange-rate', async (req, res) => {
    try {
        const { currency = 'USD' } = req.query;
        
        const exchangeRate = await getExchangeRate();
        
        res.json({
            success: true,
            data: {
                currency,
                rate: exchangeRate,
                date: new Date().toISOString().split('T')[0],
                source: '관세청 공식 환율',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        logger.error('환율 조회 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message || '환율 조회 중 오류가 발생했습니다.'
        });
    }
});

// =============================================================================
// 관세율 조회 API (요청사항)
// =============================================================================

/**
 * 세관장 API 엔드포인트
 */
app.get('/sekwanjang', async (req, res) => {
    try {
        const { hs } = req.query;
        
        if (!hs) {
            return res.status(400).set('Content-Type', 'application/xml').send(`
                <?xml version="1.0" encoding="UTF-8"?>
                <error>
                    <code>400</code>
                    <message>HS 코드가 필요합니다.</message>
                </error>
            `);
        }
        
        // 관세청 API 호출
        const response = await axios.get(
            'https://unipass.customs.go.kr:38010/ext/rest/ccctLworCdQry/retrieveCcctLworCd',
            {
                params: {
                    crkyCn: CUSTOMS_API_KEYS.ccctLworCdQry,
                    hsSgn: hs,
                    imexTp: '2' // 수입 (필수)
                },
                timeout: 10000
            }
        );
        
        // XML 응답을 그대로 반환
        res.set('Content-Type', 'application/xml');
        res.send(response.data);
        
    } catch (error) {
        logger.error('세관장 API 오류:', error);
        
        // 오류 시 XML 형태로 응답
        res.status(500).set('Content-Type', 'application/xml').send(`
            <?xml version="1.0" encoding="UTF-8"?>
            <error>
                <code>500</code>
                <message>관세청 API 호출 중 오류가 발생했습니다.</message>
                <details>${error.message}</details>
            </error>
        `);
    }
});

// =============================================================================
// 헬스 체크 및 기타 API
// =============================================================================

// 헬스 체크
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: '두리무역 통합 무역 비용 계산기',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 세관장확인 API 테스트 엔드포인트
app.get('/test-import-requirements', async (req, res) => {
    try {
        const { hsCode = '8509400000' } = req.query;
        const apiUrl = 'https://unipass.customs.go.kr:38010/ext/rest/ccctLworCdQry/retrieveCcctLworCd';
        const params = {
            crkyCn: CUSTOMS_API_KEYS.ccctLworCdQry,
            hsSgn: hsCode,
            imexTp: '2' // 수입
        };
        
        const response = await axios.get(apiUrl, {
            params: params,
            timeout: 10000
        });
        
        // ntceInfo 태그 확인
        const ntceInfoMatch = response.data.match(/<ntceInfo>([^<]*)<\/ntceInfo>/);
        // tCnt 태그 확인
        const tCntMatch = response.data.match(/<tCnt>([^<]+)<\/tCnt>/);
        // 수입요건 정보 추출
        const requirements = await getImportRequirements(hsCode);
        res.json({
            success: true,
            data: {
                rawResponse: response.data,
                ntceInfo: ntceInfoMatch ? ntceInfoMatch[1] : null,
                totalCount: tCntMatch ? tCntMatch[1] : null,
                requirements: requirements,
                requestParams: params,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data,
            status: error.response?.status
        });
    }
});

// 관세청 환율 API 테스트 엔드포인트
app.get('/test-exchange-rate', async (req, res) => {
    try {
        const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const apiUrl = 'https://unipass.customs.go.kr:38010/ext/rest/trifFxrtInfoQry/retrieveTrifFxrtInfo';
        const params = {
            crkyCn: CUSTOMS_API_KEYS.trifFxrtInfoQry,
            qryYymmDd: currentDate,
            imexTp: '2' // 수입
        };
        
        const response = await axios.get(apiUrl, {
            params: params,
            timeout: 10000
        });
        
        // ntceInfo 태그 확인
        const ntceInfoMatch = response.data.match(/<ntceInfo>([^<]*)<\/ntceInfo>/);
        // USD 환율 추출 시도 (정확한 USD 매칭)
        const usdMatch = response.data.match(/<currSgn>USD<\/currSgn>[\s\S]*?<fxrt>([^<]+)<\/fxrt>/);
        // 모든 통화 정보 추출
        const currencyMatches = response.data.match(/<currSgn>([^<]+)<\/currSgn>/g);
        const rateMatches = response.data.match(/<fxrt>([^<]+)<\/fxrt>/g);
        
        res.json({
            success: true,
            data: {
                rawResponse: response.data,
                ntceInfo: ntceInfoMatch ? ntceInfoMatch[1] : null,
                usdRate: usdMatch ? usdMatch[1] : null,
                currencies: currencyMatches,
                rates: rateMatches,
                requestParams: params,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data,
            status: error.response?.status
        });
    }
});

// API 정보
app.get('/', (req, res) => {
    res.json({
        service: '두리무역 통합 무역 비용 계산기 API',
        version: '1.0.0',
        endpoints: {
            'CBM 계산': 'POST /cbm/calculate',
            '3D 시뮬레이션': 'POST /cbm/3d-simulation',
            '총 비용 계산': 'POST /cost/calculate',
            '관세율 조회': 'GET /tariff-rate/:hsCode',
            '환율 조회': 'GET /exchange-rate',
            '수입요건 조회': 'GET /requirements/:hsCode',
            '세관장 API': 'GET /sekwanjang?hs=:hsCode',
            '헬스 체크': 'GET /health'
        },
        timestamp: new Date().toISOString()
    });
});

// 404 처리
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'API 엔드포인트를 찾을 수 없습니다.',
        availableEndpoints: [
            'POST /cbm/calculate',
            'POST /cbm/3d-simulation',
            'POST /cost/calculate',
            'GET /tariff-rate/:hsCode',
            'GET /exchange-rate',
            'GET /requirements/:hsCode',
            'GET /sekwanjang?hs=:hsCode',
            'GET /health'
        ]
    });
});

// Firebase Functions로 Express 앱 내보내기
exports.api = onRequest(app);
