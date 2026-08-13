/**
 * 수집 대상 종목 목록.
 *
 * 지금은 프로토타입에 있던 10종목만 — 파이프라인 검증이 목적이다.
 * 이후 KRX 상장종목 전체(약 3,000개)로 자동 생성하도록 교체한다.
 */
export const UNIVERSE = [
  { code: "005930", name: "삼성전자",            kind: "주식" },
  { code: "000660", name: "SK하이닉스",          kind: "주식" },
  { code: "035420", name: "NAVER",               kind: "주식" },
  { code: "035720", name: "카카오",              kind: "주식" },
  { code: "005380", name: "현대차",              kind: "주식" },
  { code: "068270", name: "셀트리온",            kind: "주식" },
  { code: "069500", name: "KODEX 200",           kind: "ETF"  },
  { code: "360750", name: "TIGER 미국S&P500",    kind: "ETF"  },
  { code: "133690", name: "TIGER 미국나스닥100", kind: "ETF"  },
  { code: "305720", name: "KODEX 2차전지산업",   kind: "ETF"  }
];
