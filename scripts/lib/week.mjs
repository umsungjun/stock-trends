/**
 * ISO 8601 주차 유틸 — 이 프로젝트에서 가장 중요한 모듈.
 *
 * 시장마다 주봉 바의 날짜 관례가 다르다.
 *   한국(siseJson)        그 주의 마지막 거래일   20260807(금), 20260813(목)
 *   미국(chart/foreign)   그 주의 일요일(주 시작)  20260802(일), 20260809(일)
 *
 * 미국 20260809는 일요일이라 ISO로는 W32지만 실제로 커버하는 거래주는 8/10~8/14 = W33이다.
 * 그래서 미국 바는 반드시 isoWeekKey(addDays(date, 1))로 매핑해야 한다.
 * 보정을 빠뜨리면 미국 계열 전체가 한 주씩 밀린 채 "그럴듯하게" 동작해 발견이 늦는다.
 */

const DAY_MS = 86_400_000;

/** "YYYYMMDD" → UTC Date. 로컬 타임존이 섞이면 하루가 밀리므로 전 구간 UTC로 다룬다 */
const toDate = (ymd) => {
  if (ymd instanceof Date) return new Date(Date.UTC(ymd.getUTCFullYear(), ymd.getUTCMonth(), ymd.getUTCDate()));
  const s = String(ymd);
  if (!/^\d{8}$/.test(s)) throw new Error(`YYYYMMDD 형식이 아님: ${ymd}`);
  return new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
};

/** UTC Date → "YYYYMMDD" */
const toYmd = (d) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

/** ISO 요일: 월=1 … 일=7 (JS의 일=0을 7로 옮긴다) */
const isoDay = (d) => d.getUTCDay() || 7;

/**
 * @description "YYYYMMDD" 또는 Date를 ISO 8601 주차 키로 변환한다.
 * ISO 규칙: 주는 월요일 시작, 1주차는 그 해 첫 목요일이 속한 주.
 * @param {string|Date} ymdOrDate - "YYYYMMDD" 또는 Date
 * @returns {string} "2026-W33"
 */
export const isoWeekKey = (ymdOrDate) => {
  const d = toDate(ymdOrDate);
  // 그 주의 목요일로 옮기면 소속 연도가 확정된다 (연말·연초 경계 처리의 핵심)
  d.setUTCDate(d.getUTCDate() + 4 - isoDay(d));
  const year = d.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
};

/** "2026-W33" → { year, week }. 형식 위반은 즉시 실패시킨다 */
const parseKey = (key) => {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) throw new Error(`주차 키 형식이 아님: ${key}`);
  return { year: +m[1], week: +m[2] };
};

/**
 * @description 주차 키 → 그 주 월요일의 "YYYYMMDD".
 * @param {string} key - "2026-W33"
 * @returns {string} "20260810"
 */
export const weekKeyToMonday = (key) => {
  const { year, week } = parseKey(key);
  // 1월 4일은 ISO 규칙상 항상 1주차에 속한다 → 그 주 월요일이 1주차의 시작
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week1Monday = jan4.getTime() - (isoDay(jan4) - 1) * DAY_MS;
  return toYmd(new Date(week1Monday + (week - 1) * 7 * DAY_MS));
};

/**
 * @description 주차 키 → 그 주 금요일의 "YYYYMMDD". 한국 거래일이 없는 주의 라벨 폴백용.
 * @param {string} key - "2026-W33"
 * @returns {string} "20260814"
 */
export const weekKeyToFriday = (key) => addDays(weekKeyToMonday(key), 4);

/**
 * @description "YYYYMMDD"에 n일을 더한다.
 * @param {string|Date} ymd - 기준일
 * @param {number} n - 더할 일수 (음수 가능)
 * @returns {string} "YYYYMMDD"
 */
export const addDays = (ymd, n) => toYmd(new Date(toDate(ymd).getTime() + n * DAY_MS));

/**
 * @description from~to 사이의 연속된 ISO 주차 키 배열. 결손이 없어 그리드가 결정적이다.
 * @param {string} fromKey - 시작 주차 "2000-W01"
 * @param {string} toKey - 끝 주차 (포함)
 * @returns {string[]}
 */
export const weekRange = (fromKey, toKey) => {
  const end = weekKeyToMonday(toKey);
  const out = [];
  for (let t = toDate(weekKeyToMonday(fromKey)).getTime(); ; t += 7 * DAY_MS) {
    const ymd = toYmd(new Date(t));
    out.push(isoWeekKey(ymd));
    if (ymd >= end) break;
  }
  return out;
};

/**
 * @description 이 주차를 발행해도 되는가 — 그 주 토요일 12:00 KST(03:00 UTC)를 기준으로 판정한다.
 *
 * 진행 중인 주차를 발행하면 값이 매일 바뀌어 전 종목 파일이 매 실행마다 diff에 뜨고,
 * "변경 없으면 커밋 스킵" 전략이 통째로 무력화된다. 멱등성의 전제 조건.
 *
 * 기준 근거: 한국장 금 15:30 마감 / 미국장 금 16:00 ET(토 05:00 KST)
 *          / 네이버 해외 종가 확정 토 09:31 KST → 토 12:00이면 안전 마진 확보.
 * @param {string} weekKey - "2026-W33"
 * @param {Date} [now] - 현재 시각 (테스트 주입용)
 * @returns {boolean}
 */
export const isPublishable = (weekKey, now = new Date()) => {
  const saturday = addDays(weekKeyToMonday(weekKey), 5);
  const cutoff = toDate(saturday).getTime() + 3 * 3_600_000; // 12:00 KST = 03:00 UTC
  return now.getTime() >= cutoff;
};

/**
 * @description 지금 시점에서 발행 가능한 마지막 주차. 수집 상한으로 쓴다.
 * @param {Date} [now]
 * @returns {string} "2026-W32"
 */
export const latestPublishableWeek = (now = new Date()) => {
  let key = isoWeekKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  while (!isPublishable(key, now)) key = isoWeekKey(addDays(weekKeyToMonday(key), -7));
  return key;
};
