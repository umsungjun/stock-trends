/**
 * 랜덤 닉네임 — 수식어 + 종목명 + 동물.
 *
 * lets-ko의 "수식어 + 고정 이름" 방식을 주식 도메인으로 확장했다.
 * seed에서 결정론적으로 만들어지므로 클라이언트 미리보기와 서버 저장값이 항상 같다.
 * 서버는 클라이언트가 보낸 닉네임 문자열을 신뢰하지 않고 seed로 다시 만든다 —
 * 임의 문자열(사칭·욕설)이 닉네임 자리에 들어오는 걸 구조적으로 막는다.
 */

const MODIFIERS = [
  "존버하는",
  "물타는",
  "익절한",
  "손절한",
  "풀매수한",
  "반토막난",
  "우상향 믿는",
  "배당 기다리는",
  "차트 보는",
  "물린",
  "떡상 기원하는",
  "분할매수하는",
  "손이 빠른",
  "존버 실패한",
  "적립식으로 사는",
  "고점에 산",
  "저점에 판",
  "관망하는",
  "몰빵한",
  "달러 사는",
  "리밸런싱하는",
  "매수 버튼 누른",
  "호가창 보는",
  "장 마감 기다리는",
  "연금저축 넣는",
  "밤새 미장 보는",
  "환전하는",
  "복리 믿는",
];

const TICKERS = [
  "삼성전자",
  "하이닉스",
  "애플",
  "엔비디아",
  "테슬라",
  "카카오",
  "네이버",
  "현대차",
  "구글",
  "마소",
  "아마존",
  "코스피",
  "나스닥",
  "S&P500",
  "비트코인",
  "금",
  "국채",
  "배당주",
];

const ANIMALS = [
  "수달",
  "카피바라",
  "너구리",
  "다람쥐",
  "알파카",
  "판다",
  "햄스터",
  "고슴도치",
  "펭귄",
  "코알라",
  "라쿤",
  "왈라비",
  "미어캣",
  "친칠라",
  "해달",
  "북극곰",
  "돌고래",
  "부엉이",
];

/** seed에서 서로 독립적인 인덱스를 뽑기 위한 선형 합동 계열 스크램블 */
const scramble = (seed: number, salt: number): number => {
  let h = (seed ^ (salt * 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

export const MAX_SEED = 2 ** 31 - 1;

/**
 * @description seed에서 닉네임을 결정론적으로 만든다.
 * @param seed - 0 ~ 2^31-1
 * @returns "존버하는 삼성전자 수달"
 */
export const deriveNickname = (seed: number): string => {
  const s = Math.abs(Math.trunc(seed)) % (MAX_SEED + 1);
  const m = MODIFIERS[scramble(s, 1) % MODIFIERS.length];
  const t = TICKERS[scramble(s, 2) % TICKERS.length];
  const a = ANIMALS[scramble(s, 3) % ANIMALS.length];
  return `${m} ${t} ${a}`;
};

/** @description 새 seed. 사용자가 리롤할 때마다 부른다 */
export const randomSeed = (): number =>
  Math.floor(Math.random() * (MAX_SEED + 1));

/** @description 입력값이 유효한 seed인지 — API가 받은 값을 검증한다 */
export const isValidSeed = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_SEED;
