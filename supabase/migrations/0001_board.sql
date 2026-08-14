-- 게시판 · 종목 추가 요청 스키마
--
-- Supabase 대시보드 → SQL Editor에 붙여넣어 실행합니다.
--
-- 설계 전제: 모든 읽기·쓰기가 Next.js 서버 라우트(service_role)를 통한다.
-- anon 키로 도달하는 경로가 없으므로 RLS는 전면 차단해 두고, 키가 유출돼도
-- 아무것도 못 하게 하는 심층 방어로만 쓴다.
-- IP 해시 레이트리밋·토큰 검증은 서버에서만 가능하고, 응답 캐시로 DB 읽기를 줄이려는 목적도 있다.

create extension if not exists pgcrypto;


-- ══════════════════════════════════════════════════════════════
-- 게시글
-- ══════════════════════════════════════════════════════════════
create table if not exists posts (
  id              uuid primary key default gen_random_uuid(),

  -- 종목 게시판. null이면 전체 게시판.
  -- public/data/tickers.json의 c 값과 같은 네임스페이스지만 FK는 없다 (시세는 정적 파일이라 DB에 없음)
  ticker_code     text,

  -- 서버가 seed로부터 결정론적으로 만든다. 클라이언트가 보낸 문자열은 신뢰하지 않는다
  nickname        text    not null check (char_length(nickname) between 1 and 40),
  nickname_seed   integer not null,

  body            text    not null check (char_length(body) between 2 and 2000),

  -- 소유권: 작성 시 발급한 난수 토큰의 sha256. 평문은 응답 한 번에만 준다.
  -- IP로 소유권을 판정하면 안 된다 — 국내 모바일 캐리어 NAT에서 수천 명이 같은 공인 IP를 쓰므로
  -- 남의 글을 지울 수 있고, LTE↔WiFi 전환만으로 자기 글을 못 지운다
  edit_token_hash text    not null,

  -- 레이트리밋·어뷰징 추적 전용. 인가에는 절대 쓰지 않는다
  ip_hash         text    not null,
  -- sha256(정규화된 본문) — 같은 글 도배 탐지
  content_hash    text    not null,

  -- 작성자에게만 보이게 한다. 차단당한 걸 모르면 IP를 바꿔 재시도하지 않는다
  shadowbanned    boolean not null default false,
  report_count    smallint not null default 0,
  deleted_at      timestamptz,
  edited_at       timestamptz,
  created_at      timestamptz not null default now()
);

-- 목록 조회. 부분 인덱스로 크기를 줄인다
create index if not exists idx_posts_feed
  on posts (created_at desc)
  where deleted_at is null and shadowbanned = false;

-- 종목별 게시판 — 롱테일 SEO 페이지의 주 쿼리
create index if not exists idx_posts_ticker
  on posts (ticker_code, created_at desc)
  where deleted_at is null and shadowbanned = false and ticker_code is not null;

create index if not exists idx_posts_ip on posts (ip_hash, created_at desc);
create index if not exists idx_posts_content_hash on posts (content_hash, created_at desc);


-- ══════════════════════════════════════════════════════════════
-- 신고 — 서로 다른 3명이 신고하면 자동으로 숨긴다
-- ══════════════════════════════════════════════════════════════
create table if not exists post_reports (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  reason     text not null check (reason in ('spam', 'abuse', 'ad', 'etc')),
  ip_hash    text not null,
  created_at timestamptz not null default now(),
  unique (post_id, ip_hash)
);

create index if not exists idx_reports_post on post_reports (post_id);

create or replace function auto_hide_on_reports() returns trigger
language plpgsql security definer set search_path = public as $$
declare n smallint;
begin
  select count(*) into n from post_reports where post_id = new.post_id;
  update posts
     set report_count = n,
         shadowbanned = (n >= 3) or shadowbanned
   where id = new.post_id;
  return null;
end $$;

drop trigger if exists trg_auto_hide on post_reports;
create trigger trg_auto_hide after insert on post_reports
  for each row execute function auto_hide_on_reports();


-- ══════════════════════════════════════════════════════════════
-- 종목 추가 요청
--
-- 중복 요청을 행으로 쌓지 않고 votes로 집계한다. 결과가 곧 "가장 원하는 종목" 랭킹이 되어
-- universe 큐레이션에 그대로 투입된다 — 접수함이 아니라 로드맵 입력이다.
-- ══════════════════════════════════════════════════════════════
create table if not exists ticker_requests (
  id            uuid primary key default gen_random_uuid(),

  raw_query     text not null check (char_length(raw_query) between 1 and 60),
  -- 소문자화 + 공백·특수문자 제거. "삼성 전자"와 "삼성전자"를 한 행으로 모은다
  norm_query    text not null unique,

  votes         integer not null default 1,

  -- 요청 즉시 네이버에서 수신 가능 여부를 검증해 사용자에게 바로 답한다.
  -- 지원 불가 종목을 일주일 기다린 끝에 알게 되는 게 최악이다
  status        text not null default 'queued'
                check (status in ('queued', 'added', 'rejected', 'unsupported')),
  resolved_code text,
  note          text,

  first_ip_hash text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_requests_rank
  on ticker_requests (votes desc, created_at)
  where status = 'queued';

-- 같은 IP가 같은 종목을 반복 투표하지 못하게 한다
create table if not exists ticker_request_votes (
  request_id uuid not null references ticker_requests(id) on delete cascade,
  ip_hash    text not null,
  created_at timestamptz not null default now(),
  primary key (request_id, ip_hash)
);


-- ══════════════════════════════════════════════════════════════
-- 금칙어 — 코드가 아니라 테이블에 둔다.
-- 스팸 문구는 주 단위로 바뀌므로 배포 없이 대시보드에서 한 줄 추가로 대응해야 한다.
-- ══════════════════════════════════════════════════════════════
create table if not exists blocked_terms (
  term       text primary key,
  severity   text not null default 'block' check (severity in ('block', 'review')),
  created_at timestamptz not null default now()
);

insert into blocked_terms (term) values
  ('리딩방'), ('단톡방'), ('수익인증'), ('무료체험'), ('급등주'),
  ('카톡id'), ('오픈채팅'), ('투자문의'), ('원금보장'), ('선착순마감')
on conflict (term) do nothing;

-- 재범 차단
create table if not exists banned_ip_hashes (
  ip_hash    text primary key,
  reason     text,
  until      timestamptz,   -- null이면 영구
  created_at timestamptz not null default now()
);


-- ══════════════════════════════════════════════════════════════
-- RLS — 정책을 하나도 만들지 않는다 = anon은 아무것도 못 한다.
-- service_role은 RLS를 우회하므로 서버 라우트 동작에는 영향이 없다.
-- ══════════════════════════════════════════════════════════════
alter table posts                enable row level security;
alter table post_reports         enable row level security;
alter table ticker_requests      enable row level security;
alter table ticker_request_votes enable row level security;
alter table blocked_terms        enable row level security;
alter table banned_ip_hashes     enable row level security;

-- anon·authenticated는 명시적으로 회수한다
revoke all on posts, post_reports, ticker_requests,
              ticker_request_votes, blocked_terms, banned_ip_hashes
  from anon, authenticated;

-- ⚠️ service_role에는 반드시 명시적으로 부여해야 한다.
-- 프로젝트 생성 시 "Automatically expose new tables"를 끄면 service_role에도 기본 권한이 가지 않아
-- 서버 라우트가 "permission denied for table posts"로 전부 실패한다.
grant usage on schema public to service_role;
grant all on posts, post_reports, ticker_requests,
             ticker_request_votes, blocked_terms, banned_ip_hashes
  to service_role;

-- 앞으로 추가할 테이블에도 같은 권한이 가도록
alter default privileges in schema public grant all on tables to service_role;
