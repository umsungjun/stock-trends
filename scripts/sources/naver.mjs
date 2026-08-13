/**
 * 네이버 금융 시세 어댑터.
 *
 * 소스 교체(KRX·공공데이터포털)를 대비해 인터페이스를 고정한다 —
 * fetchSeries(code, opts) → { dates: ["YYYYMMDD"...], closes: [number...] }
 * 이 계약만 지키면 fetch.mjs는 손대지 않고 소스를 갈아끼울 수 있다.
 *
 * 주의: 네이버 수정주가는 액면분할·유무상증자만 보정하고 배당은 반영하지 않는다.
 * 즉 여기서 나오는 수익률은 배당 미포함 주가 수익률이다.
 */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const ENDPOINT = "https://api.finance.naver.com/siseJson.naver";

export const SOURCE_ID = "naver";
export const INCLUDES_DIVIDEND = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 네이버는 JSON이 아니라 작은따옴표 섞인 JS 리터럴을 반환한다 — 정규화 후 파싱 */
const parseLoose = (text) => {
  const normalized = text.replace(/'/g, '"').replace(/\s+/g, "");
  if (!normalized.startsWith("[")) throw new Error(`예상 밖 응답: ${text.slice(0, 80)}`);
  return JSON.parse(normalized);
};

/**
 * @param {string} code 6자리 종목코드
 * @param {{ from?: string, to?: string, timeframe?: "day"|"week"|"month", retries?: number }} opts
 */
export const fetchSeries = async (code, opts = {}) => {
  const { from = "20000101", to = todayYmd(), timeframe = "week", retries = 3 } = opts;
  const url = `${ENDPOINT}?symbol=${code}&requestType=1&startTime=${from}&endTime=${to}&timeframe=${timeframe}`;

  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://finance.naver.com/" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = parseLoose(await res.text());

      // 첫 행은 헤더(['날짜','시가',...]), 이후가 데이터
      const dates = [];
      const closes = [];
      for (const row of rows.slice(1)) {
        if (!Array.isArray(row) || row.length < 5) continue;
        const close = Number(row[4]);
        if (!Number.isFinite(close) || close <= 0) continue; // 거래정지 구간 방어
        dates.push(String(row[0]));
        closes.push(close);
      }
      if (!closes.length) throw new Error("데이터 0건");
      return { dates, closes };
    } catch (err) {
      lastErr = err;
      await sleep(400 * (attempt + 1)); // 선형 백오프 — 상대 서버를 때리지 않기 위함
    }
  }
  throw new Error(`${code} 수집 실패: ${lastErr.message}`);
};

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};
