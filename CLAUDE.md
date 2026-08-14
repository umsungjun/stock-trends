# stock-trends

npm trends 형식의 주식 비교 도구. 서비스명 **Stock Trends**(화면 서술어는 "주식 비교"), 저장소·도메인 슬러그는 `stock-trends`.

한국·미국 종목/ETF를 최대 5개까지 한 차트에 겹쳐 "그때 넣었으면 지금 얼마"를 보여준다.

## 명령어

```bash
pnpm dev / build / lint          # Next.js
pnpm test                        # vitest + node --test (94건)

pnpm data:all                    # 환율 → 시세 → 슬러그 → 검증
pnpm data:fx                     # 환율만 (증분)
pnpm data:fetch                  # 시세만
pnpm data:popular                # 사전 생성 슬러그 목록
pnpm data:verify                 # 산출물 검증 (커밋 전 필수)

pnpm requests                    # 대기 중인 종목 추가 요청 (득표순)

node scripts/universe/build.mjs      # 유니버스 재생성 (월 1회, PR로만)
node scripts/seed-etf-aliases.mjs    # 미국 ETF 한글명 시드 (1회성)
node scripts/build-brand-assets.mjs  # OG 카드·파비콘 PNG 재생성 (로고 변경 시)
```

## 핵심 설계 결정

**조회 시점에 시세 API를 부르지 않는다.** 주간 데이터라 한 달 내내 같은 배열을 반복해 읽을 뿐이라 DB가 할 일이 없다. 빌드 타임에 정적 JSON을 굽고 CDN에서 서빙한다 — 광고 수익 모델이라 사용자 증가가 서버 비용으로 이어지면 안 된다는 제약에서 나온 결정이다. Supabase는 게시판·종목요청처럼 **쓰기가 필요한 것에만** 쓴다.

**⚠️ 주봉 바의 날짜 관례가 시장마다 다르다 — 이 프로젝트 최대의 함정.**

- 한국(`siseJson`): 그 주의 **마지막 거래일** (`20260807`=금)
- 미국(`chart/foreign`): 그 주의 **일요일**, 주 시작 앵커 (`20260809`=일)

미국 `20260809`는 ISO로 W32지만 실제로 커버하는 거래주는 8/10~8/14 = **W33**이다. 그래서 미국 바는 반드시 `isoWeekKey(addDays(date, 1))`로 매핑한다. 보정을 빠뜨리면 미국 계열 전체가 한 주씩 밀린 채 차트가 "대충 맞아 보여서" 발견이 매우 늦는다. `tests/scripts/week.test.mjs`가 이 규칙을 회귀 테스트로 못 박고 있으니 **절대 지우지 말 것.**

거래일 합집합 그리드는 쓸 수 없다. 한국 금요일과 미국 일요일은 구조적으로 절대 같은 날이 아니라 매주 두 칸이 생기고 모든 계열이 계단형이 된다.

**완결된 주차만 발행한다.** 진행 중인 주차를 포함하면 값이 매일 바뀌어 매 실행마다 2,146개 파일이 diff에 뜨고 "변경 없으면 커밋 스킵"이 무력화된다. 기준은 그 주 토요일 12:00 KST — 한국장 금 15:30 마감, 미국장 금 16:00 ET(토 05:00 KST), 네이버 해외 종가 확정 토 09:31 KST.

**환율은 시점별로 적용한다.** 각 주차의 달러 가격에 그 주차 환율을 곱한다. 오늘 환율을 전 구간에 곱하면 곡선이 달러 차트와 똑같아지고 눈금만 원화가 되는데, 그건 "1억 넣었으면 얼마"의 답이 아니다. 실측 차이가 크다 — 애플 10년 1억이 시점별 **14.44억** vs 오늘 고정 **11.46억**.

**미국 종목은 달러로 저장하고 환산은 런타임에 한다.** `meta.json`의 `fx` 배열을 클라이언트가 곱한다. 원화로 미리 구우면 환율 기여분 분해가 불가능해지고, 환율 소스를 바꿀 때 미국 648개 파일이 전부 diff에 뜬다.

**유효숫자 5자리로 반올림한다.** 조정주가 재계산 시 말단 자릿수가 흔들리면 바뀐 게 없는 과거 구간까지 가짜 diff가 뜬다.

**슬러그는 빌드 타임에 확정한다.** `universe/rules.mjs`가 정규화·충돌해소·예약어 검사를 하고 결과를 굽는다. 런타임에 다시 계산하지 않으므로 파싱과 역파싱이 항상 대칭이다.

## 데이터 흐름

```
universe/build.mjs  →  data/universe.json     (월 1회, PR 승인)
fetch-fx.mjs        →  data/cache/*.ndjson    (주 1회, 증분)
fetch.mjs           →  public/data/**         (주 1회)
verify.mjs          →  통과해야 커밋
```

`data/`는 빌드 입력(커밋하지만 배포엔 안 감), `public/data/`는 산출물(커밋 + CDN 배포). 둘 다 저장소 안에서 관리한다 — 런타임 외부 의존이 0이고, 값이 이상할 때 `git log`로 추적되며, 롤백이 `git revert` 한 번이다.

### 산출물 스키마

```jsonc
// meta.json — 모든 페이지가 필요, 작게 유지 (gzip 6.2KB)
{ "v": 2, "asOfWeek": "2026-W32", "asOfDate": "20260807",
  "includesDividend": false,
  "sources": { "kr": "naver-domestic", "us": "naver-foreign", "fx": "naver" },
  "weeks": ["20000107", ...],        // 그 주차의 한국장 마지막 거래일 = 축·툴팁 라벨
  "fx": { "o": 223, "v": [1150.2, ...] } }   // 원/달러, 그리드와 같은 좌표

// tickers.json — 검색 목록. 검색창 첫 포커스 시 지연 로드 (gzip 48KB)
{ "tickers": [{ "c":"005930", "n":"삼성전자", "s":"삼성전자", "k":"주식", "m":"KR", "o":0 }] }

// aliases.json — 슬러그 별칭 → 코드. 서버가 URL 해석(308)에만 사용 (gzip 18KB)
// kr/{code}.json  { "c":"005930", "o":0, "v":[...] }         원화
// us/{code}.json  { "c":"AAPL", "o":522, "cur":"USD", "v":[...] }  달러
```

`c`는 앱 전역 코드이자 파일명. 미국은 심볼의 `.`을 `-`로 바꾼 값(`BRK-B`)을 쓰고 **네이버 내부 표기(`BRKb`)는 출하하지 않는다** — 소스를 갈아끼우면 URL이 깨진다. 소스 조회용 심볼은 `universe.json`의 `src`에만 있다.

## 유니버스

2,148종목 — 한국 주식 1,155 / 우선주 27 / 리츠 18 / ETF 300, 미국 주식 550 / ETF 98.

- **S&P 500 503종목 전수 포함.** `BRK.B`·`BF.B`는 네이버에서 `BRKb`·`BRKa` 형태로 조회된다
- 미국 개별주는 거래소 목록 API가 `reutersCode`를 확정값으로 주므로 접미사 순회가 불필요하다
- **미국 ETF는 목록 API에 아예 없어서**(AMEX 316건 전부 stock) `universe/resolve.mjs`가 접미사 후보를 순회한다. 거래소 힌트는 순서 조정에만 쓰고 후보를 줄이지 않는다 — SCHD는 NASDAQ인데 심볼이 `SCHD.K`다. 결과는 음성까지 캐시한다
- 한국 목록에는 ETF와 우선주가 섞여 나온다(`KODEX 200`, `삼성전자우`). `삼성전자우`도 `stockEndType`이 `stock`이라 이름 기반 필터가 필요하다
- **한 번 발행한 종목은 삭제하지 않는다.** 순위에서 밀리면 `active:false`로만 표시 — 이미 공유된 URL을 죽이지 않기 위함

## 규칙

- 시세 수집이 유니버스를 자동 갱신하지 않는다. 시총 순위는 매주 바뀌는데 유니버스가 따라 흔들리면 경계 종목이 들락날락하고 공유된 URL이 깨진다
- `verify.mjs`가 성공률 95% 미만이면 커밋하지 않는다. 반쪽 데이터를 발행하지 않는다
- 어댑터 계약은 `fetchSeries(code, opts) → {weekKeys, closes, lastTradeDates}`. 어댑터가 자기 시장의 날짜 관례를 흡수하므로 `fetch.mjs`는 시장 차이를 몰라도 된다
- `CONCURRENCY`는 6을 유지한다. 종목이 늘어도 상대 서버를 몰아치지 않는다
- 배당 미반영을 화면에서 숨기지 않는다. 금융 정보라 출처·기준일·한계를 명시하는 것이 신뢰이자 SEO 자산이다
- 토스증권 API는 **1회성 시드 생성에만** 쓴다. 공개 문서가 없는 내부 API라 런타임 의존으로 두면 안 된다

## 앱 구조

```
src/
├── app/          / · /[slug] · /board · /privacy · sitemap · robots · opengraph-image · api/
├── components/   ui(shadcn) · layout · common · compare · board
├── lib/
│   ├── market/   compute · slug · search · constants · registry.server · series.client
│   ├── chart/    geometry(순수) · palette · og-svg
│   ├── board/    nickname · identity · moderation
│   └── supabase/ server (service_role 전용)
├── hooks/        useElementWidth · useLocation · useMounted
└── types/
tests/            lib · integration · scripts
supabase/migrations/
```

### 앱에서 반복해서 발목을 잡은 것들

- **`searchParams`를 서버에서 읽으면 정적 생성이 통째로 깨진다.** 쿼리는 `useLocation`(useSyncExternalStore)으로 클라이언트에서만 읽는다
- **마운트 판정에 값(`theme !== undefined`)을 쓰면 안 된다.** next-themes는 클라이언트 첫 렌더에 이미 저장된 테마를 갖고 있어 서버와 갈리고, 그 차이가 트리 전체의 hydration mismatch가 된다 → `useMounted`
- **Next 16에서 sitemap의 `id`는 Promise다.** await하지 않으면 빈 사이트맵이 조용히 생성된다
- **루트 `not-found.tsx`에 `export const metadata`를 두면 렌더가 조용히 실패한다.** 에러도 로그도 없다
- **satori는 CSS 변수를 못 읽고, 자식이 둘 이상인 div에 명시적 `display`를 요구한다.** 그래서 `compute`가 색을 모르고 `palette`가 cssVar/hex를 따로 준다
- **`outputFileTracingIncludes`에 없는 라우트에서 `fs`로 public/data를 읽으면 배포 후 온디맨드 생성에서만 500이 난다**
- React 19는 렌더 중 `Date.now()`·`Math.random()`과 effect 안의 `setState`를 막는다

## 게시판

로그인 없음. 모든 접근이 서버 라우트(`service_role`)를 통하고 RLS는 정책을 만들지 않아 anon으로는 아무것도 못 한다.

- **소유권은 서버가 발급한 토큰으로만 판정한다.** IP로 판정하면 국내 캐리어 NAT에서 남의 글을 지울 수 있고 LTE↔WiFi 전환만으로 자기 글을 못 지운다. `ip_hash`는 레이트리밋 전용
- **닉네임은 seed로 서버가 다시 만든다.** 클라이언트 문자열을 저장하지 않아 사칭·욕설이 구조적으로 불가능하다
- **섀도밴은 성공 응답을 준다.** 차단당한 걸 알면 IP를 바꿔 다시 온다
- 금칙어는 코드가 아니라 `blocked_terms` 테이블에 둔다 — 스팸 문구가 주 단위로 바뀐다
- ⚠️ Supabase에서 "Automatically expose new tables"를 끄면 **`service_role`에도 권한이 가지 않는다.** 마이그레이션의 명시적 `grant`를 지우지 말 것

## 자동화

```
.github/workflows/data-weekly.yml       토 13:00 KST + 일 재시도(멱등)
.github/workflows/universe-monthly.yml  매월 1일, PR로만
```

`verify.mjs`가 게이트다 — 성공률 95% 미만, 그리드 결손, 환율 구멍, 슬러그 충돌, **과거 구간 대량 재작성**(2% 초과) 중 하나라도 걸리면 커밋하지 않는다. 액면분할처럼 정당한 경우는 `ALLOW_HISTORY_REWRITE=1`.

## 상태

Phase 1~6 완료 (파이프라인 · 골격 · 순수모듈 · 비교페이지 · 게시판 · 자동화). 남은 것은 Vercel 배포와 검색엔진 등록.
계획 전문은 `~/.claude/plans/kind-jumping-tiger.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
