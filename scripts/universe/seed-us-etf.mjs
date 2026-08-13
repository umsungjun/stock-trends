/**
 * 미국 ETF 시드 — 네이버에 ETF 전용 목록 API가 없어 수기로 큐레이션한다.
 *
 * 자동 시총 순위보다 큐레이션 품질이 낫다. 한국 투자자가 실제로 찾는 것 위주로 골랐고,
 * 한글 표시명은 scripts/seed-etf-aliases.mjs가 토스에서 받아 data/us-etf-aliases.json에 굽는다.
 * 여기 name은 그 수집이 실패했을 때의 폴백이다.
 */
export const US_ETF_SEED = [
  // 대표 시장지수
  { symbol: "SPY",  exchange: "AMEX",   name: "S&P500" },
  { symbol: "VOO",  exchange: "AMEX",   name: "뱅가드 S&P500" },
  { symbol: "IVV",  exchange: "AMEX",   name: "아이셰어즈 S&P500" },
  { symbol: "QQQ",  exchange: "NASDAQ", name: "나스닥100" },
  { symbol: "QQQM", exchange: "NASDAQ", name: "나스닥100 미니" },
  { symbol: "DIA",  exchange: "AMEX",   name: "다우존스30" },
  { symbol: "IWM",  exchange: "AMEX",   name: "러셀2000" },
  { symbol: "VTI",  exchange: "AMEX",   name: "미국 전체시장" },
  { symbol: "VT",   exchange: "AMEX",   name: "전세계 주식" },
  { symbol: "RSP",  exchange: "AMEX",   name: "S&P500 동일가중" },

  // 배당·인컴
  { symbol: "SCHD", exchange: "NASDAQ", name: "슈왑 미국 배당주" },
  { symbol: "VIG",  exchange: "AMEX",   name: "배당성장" },
  { symbol: "VYM",  exchange: "AMEX",   name: "고배당" },
  { symbol: "DGRO", exchange: "AMEX",   name: "배당성장 아이셰어즈" },
  { symbol: "JEPI", exchange: "AMEX",   name: "JP모건 커버드콜" },
  { symbol: "JEPQ", exchange: "NASDAQ", name: "JP모건 나스닥 커버드콜" },
  { symbol: "SPYD", exchange: "AMEX",   name: "S&P500 고배당" },
  { symbol: "SPHD", exchange: "AMEX",   name: "고배당 저변동" },

  // 섹터
  { symbol: "SOXX", exchange: "NASDAQ", name: "반도체 아이셰어즈" },
  { symbol: "SMH",  exchange: "NASDAQ", name: "반도체 반에크" },
  { symbol: "XLK",  exchange: "AMEX",   name: "기술" },
  { symbol: "XLF",  exchange: "AMEX",   name: "금융" },
  { symbol: "XLE",  exchange: "AMEX",   name: "에너지" },
  { symbol: "XLV",  exchange: "AMEX",   name: "헬스케어" },
  { symbol: "XLI",  exchange: "AMEX",   name: "산업재" },
  { symbol: "XLY",  exchange: "AMEX",   name: "경기소비재" },
  { symbol: "XLP",  exchange: "AMEX",   name: "필수소비재" },
  { symbol: "XLU",  exchange: "AMEX",   name: "유틸리티" },
  { symbol: "XLRE", exchange: "AMEX",   name: "리츠" },
  { symbol: "XLB",  exchange: "AMEX",   name: "소재" },
  { symbol: "XLC",  exchange: "AMEX",   name: "커뮤니케이션" },
  { symbol: "IBB",  exchange: "NASDAQ", name: "바이오테크" },
  { symbol: "ITA",  exchange: "AMEX",   name: "항공우주·방산" },
  { symbol: "IYW",  exchange: "AMEX",   name: "미국 기술" },

  // 테마·성장
  { symbol: "ARKK", exchange: "AMEX",   name: "아크 혁신" },
  { symbol: "ARKG", exchange: "AMEX",   name: "아크 게놈" },
  { symbol: "ARKW", exchange: "AMEX",   name: "아크 인터넷" },
  { symbol: "BOTZ", exchange: "NASDAQ", name: "로보틱스·AI" },
  { symbol: "ROBO", exchange: "AMEX",   name: "로보틱스 자동화" },
  { symbol: "LIT",  exchange: "AMEX",   name: "리튬·배터리" },
  { symbol: "ICLN", exchange: "NASDAQ", name: "청정에너지" },
  { symbol: "TAN",  exchange: "AMEX",   name: "태양광" },
  { symbol: "DRIV", exchange: "NASDAQ", name: "자율주행·전기차" },
  { symbol: "MOAT", exchange: "AMEX",   name: "경제적 해자" },
  { symbol: "QUAL", exchange: "AMEX",   name: "퀄리티 팩터" },
  { symbol: "MTUM", exchange: "AMEX",   name: "모멘텀 팩터" },
  { symbol: "VUG",  exchange: "AMEX",   name: "뱅가드 성장주" },
  { symbol: "VTV",  exchange: "AMEX",   name: "뱅가드 가치주" },
  { symbol: "SCHG", exchange: "AMEX",   name: "슈왑 대형 성장주" },

  // 레버리지·인버스 (변동성 경고 대상이지만 검색 수요가 크다)
  { symbol: "TQQQ", exchange: "NASDAQ", name: "나스닥100 3배" },
  { symbol: "SQQQ", exchange: "NASDAQ", name: "나스닥100 -3배" },
  { symbol: "UPRO", exchange: "AMEX",   name: "S&P500 3배" },
  { symbol: "SOXL", exchange: "AMEX",   name: "반도체 3배" },
  { symbol: "SOXS", exchange: "AMEX",   name: "반도체 -3배" },
  { symbol: "TECL", exchange: "AMEX",   name: "기술주 3배" },
  { symbol: "TMF",  exchange: "AMEX",   name: "장기채 3배" },
  { symbol: "QLD",  exchange: "AMEX",   name: "나스닥100 2배" },
  { symbol: "SSO",  exchange: "AMEX",   name: "S&P500 2배" },

  // 채권·현금성
  { symbol: "TLT",  exchange: "NASDAQ", name: "미국 장기국채" },
  { symbol: "IEF",  exchange: "NASDAQ", name: "미국 중기국채" },
  { symbol: "SHY",  exchange: "NASDAQ", name: "미국 단기국채" },
  { symbol: "BND",  exchange: "NASDAQ", name: "미국 종합채권" },
  { symbol: "AGG",  exchange: "AMEX",   name: "미국 종합채권 아이셰어즈" },
  { symbol: "LQD",  exchange: "AMEX",   name: "투자등급 회사채" },
  { symbol: "HYG",  exchange: "AMEX",   name: "하이일드 회사채" },
  { symbol: "TIP",  exchange: "AMEX",   name: "물가연동국채" },
  { symbol: "SGOV", exchange: "AMEX",   name: "초단기국채" },
  { symbol: "BIL",  exchange: "AMEX",   name: "1-3개월 국채" },

  // 원자재·귀금속
  { symbol: "GLD",  exchange: "AMEX",   name: "금" },
  { symbol: "IAU",  exchange: "AMEX",   name: "금 아이셰어즈" },
  { symbol: "SLV",  exchange: "AMEX",   name: "은" },
  { symbol: "GDX",  exchange: "AMEX",   name: "금광기업" },
  { symbol: "USO",  exchange: "AMEX",   name: "원유" },
  { symbol: "DBC",  exchange: "AMEX",   name: "원자재 종합" },
  { symbol: "PDBC", exchange: "NASDAQ", name: "원자재 액티브" },

  // 지역·국가
  { symbol: "EWY",  exchange: "AMEX",   name: "한국" },
  { symbol: "EWJ",  exchange: "AMEX",   name: "일본" },
  { symbol: "MCHI", exchange: "NASDAQ", name: "중국" },
  { symbol: "FXI",  exchange: "AMEX",   name: "중국 대형주" },
  { symbol: "INDA", exchange: "NASDAQ", name: "인도" },
  { symbol: "EWT",  exchange: "AMEX",   name: "대만" },
  { symbol: "VEA",  exchange: "AMEX",   name: "선진국 (미국 제외)" },
  { symbol: "VWO",  exchange: "AMEX",   name: "신흥국" },
  { symbol: "EFA",  exchange: "AMEX",   name: "선진국 아이셰어즈" },
  { symbol: "IEFA", exchange: "AMEX",   name: "선진국 코어" },
  { symbol: "EEM",  exchange: "AMEX",   name: "신흥국 아이셰어즈" },

  // 암호자산·기타
  { symbol: "IBIT", exchange: "NASDAQ", name: "비트코인 블랙록" },
  { symbol: "FBTC", exchange: "AMEX",   name: "비트코인 피델리티" },
  { symbol: "GBTC", exchange: "AMEX",   name: "비트코인 그레이스케일" },
  { symbol: "ETHA", exchange: "NASDAQ", name: "이더리움 블랙록" },
  { symbol: "BITO", exchange: "AMEX",   name: "비트코인 선물" },
  { symbol: "VNQ",  exchange: "AMEX",   name: "미국 리츠" },
  { symbol: "SCHH", exchange: "AMEX",   name: "슈왑 리츠" },
  { symbol: "VIXY", exchange: "AMEX",   name: "변동성 지수" },
  { symbol: "COWZ", exchange: "AMEX",   name: "잉여현금흐름" },
  { symbol: "AVUV", exchange: "AMEX",   name: "소형 가치주" },
  { symbol: "SPLG", exchange: "AMEX",   name: "S&P500 저비용" },
  { symbol: "SPYG", exchange: "AMEX",   name: "S&P500 성장주" },
  { symbol: "SPYV", exchange: "AMEX",   name: "S&P500 가치주" },
];
