# Stock Trends — 주식 비교

npm trends의 주식 버전. **"그때 넣었으면 지금 얼마"** 를 한국·미국 종목/ETF 최대 5개까지 한 차트에서 겹쳐 비교합니다.

## 주요 기능

- **동일 투자금 정규화** — 선택한 시점에 같은 금액을 넣었다고 가정하고 평가액 곡선을 겹칩니다
- **한국·미국 동시 비교** — 미국 종목은 각 시점의 환율로 원화 환산해 같은 축에 놓습니다
- **기간·투자금 세그먼트** — 1년/3년/5년/10년/전체, 1천만/5천만/1억/직접입력
- **최대 5종목**, 종목명 해시로 색을 고정 — 같은 조합이면 항상 같은 색
- **초성 검색** — `ㅅㅅㅈㅈ`, `ㅇㅂㄷㅇ`
- **상장일 자동 정렬** — 상장일이 다르면 공통 구간으로 축소하고 안내합니다
- **MDD·CAGR·환율 기여분** 비교표, 원금 기준선, 크로스헤어 툴팁
- **공유 URL** — `stock-trends.vercel.app/삼성전자-vs-애플`

## 구조

```
stock-trends/
├── data/                       빌드 입력 (커밋, 배포 제외)
│   ├── universe.json           2,148종목 — 사람이 읽고 편집하는 진실의 원천
│   ├── us-etf-aliases.json     미국 ETF 한글명
│   └── cache/
│       ├── fx-daily.ndjson     일별 환율 원본
│       └── resolve.json        미국 심볼 해석 캐시
├── public/data/                산출물 (커밋 + CDN 배포)
│   ├── meta.json               주차 그리드 + 환율
│   ├── tickers.json            검색 목록
│   ├── aliases.json            슬러그 별칭
│   ├── kr/{종목코드}.json        원화 주간 종가
│   └── us/{티커}.json           달러 주간 종가
├── scripts/
│   ├── lib/                    week · http · io · num
│   ├── sources/                naver-domestic · naver-foreign · naver-listing · naver-fx · ecos-fx
│   ├── universe/               build · rules · resolve · seed-us-etf
│   ├── fetch-fx.mjs
│   ├── fetch.mjs
│   ├── verify.mjs
│   └── seed-etf-aliases.mjs
└── index.html                  프로토타입 (Next.js 이전 전까지)
```

## 실행

```bash
node scripts/fetch-fx.mjs     # 환율 (증분)
node scripts/fetch.mjs        # 시세 2,148종목 — 약 7초
node scripts/verify.mjs       # 검증
npx serve .                   # file:// 로는 시세 파일을 못 읽습니다
```

테스트: `node --test scripts/lib/*.test.mjs`

## 데이터

| 항목 | 내용 |
|---|---|
| 시세 | 네이버 금융 (국내 `siseJson` / 해외 `chart/foreign`) |
| 환율 | 네이버 매매기준율 — 2004년부터 5,538건. API 키 불필요 |
| 해상도 | 주봉 (월봉은 중간 저점이 사라져 MDD가 얕게 나옴) |
| 범위 | 한국 2000년~, 미국 대체로 2010년~ |
| 수정주가 | 액면분할·증자 **보정됨** (삼성전자 50:1, NVDA 4:1+10:1 소급 확인) |
| 배당 | **미반영** — 국내 수정주가 표준 |
| 갱신 | 주 1회, 완결된 주차만 |

**조회 시점에는 외부 API를 호출하지 않습니다.** 빌드 타임에 생성한 정적 JSON만 읽고, 기간·투자금 조작은 전부 클라이언트 계산입니다. 전송량은 첫 로드 약 6KB + 종목당 2.5KB(gzip).

### 유니버스 2,148종목

| 구분 | 개수 |
|---|---|
| 한국 주식 | 1,155 |
| 한국 우선주 | 27 |
| 한국 리츠 | 18 |
| 한국 ETF | 300 |
| 미국 주식 | 550 (**S&P 500 전 종목 포함**) |
| 미국 ETF | 98 |

없는 종목은 검색 결과에서 추가 요청할 수 있고, 요청 즉시 수신 가능 여부를 검증해 답합니다. 승인되면 다음 주간 수집에 반영됩니다.

## 남은 일

- [ ] Next.js 이전 — SEO 롱테일 페이지 사전 생성, OG 이미지
- [ ] 건의사항 게시판 (Supabase + 랜덤 닉네임)
- [ ] GitHub Actions 주간 자동 갱신
- [ ] 배당 데이터 결합 (총수익률 기준 전환)
