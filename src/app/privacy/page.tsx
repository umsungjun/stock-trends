import type { Metadata } from "next";
import Link from "next/link";

import PageContainer from "@/components/layout/PageContainer";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${SITE_NAME}이 수집하는 정보와 이용 목적을 안내합니다.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const UPDATED = "2026년 8월 14일";

export default function PrivacyPage() {
  return (
    <PageContainer className="max-w-[760px]">
      <h1 className="text-2xl font-bold tracking-tight">개인정보처리방침</h1>
      <p className="text-ink-muted mt-1 text-[12.5px]">최종 수정일 {UPDATED}</p>

      <div className="mt-6 flex flex-col gap-6 text-[13.5px] leading-relaxed">
        <section>
          <h2 className="text-[15px] font-semibold">1. 수집하는 정보</h2>
          <p className="text-ink-2 mt-1.5">
            {SITE_NAME}은 회원가입을 받지 않으며 이름·이메일·전화번호 등 개인을
            식별할 수 있는 정보를 수집하지 않습니다. 건의사항 게시판을 이용할
            때만 아래 정보가 저장됩니다.
          </p>
          <ul className="text-ink-2 mt-2 list-disc space-y-1 pl-5">
            <li>
              <b className="text-ink font-medium">
                작성 내용과 자동 생성 닉네임
              </b>{" "}
              — 닉네임은 무작위로 만들어지며 직접 입력할 수 없습니다.
            </li>
            <li>
              <b className="text-ink font-medium">접속 IP의 단방향 해시</b> —
              원래 주소를 복원할 수 없는 형태로 변환해 저장하며, 도배·스팸을
              막는 용도로만 사용합니다.
            </li>
            <li>
              <b className="text-ink font-medium">글 삭제용 토큰</b> — 작성자
              브라우저에만 저장됩니다. 서버에는 대조용 해시만 남습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">2. 이용 목적</h2>
          <p className="text-ink-2 mt-1.5">
            수집한 정보는 게시판 운영, 스팸·도배 차단, 서비스 개선에만
            사용합니다. 광고 목적으로 이용하거나 제3자에게 제공·판매하지
            않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">3. 보관 기간</h2>
          <p className="text-ink-2 mt-1.5">
            게시글은 작성자가 삭제하거나 운영자가 삭제할 때까지 보관합니다.
            삭제된 글은 화면에서 즉시 사라지며, 어뷰징 대응 기록으로 일정 기간
            보관한 뒤 영구 삭제합니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">
            4. 쿠키와 브라우저 저장소
          </h2>
          <p className="text-ink-2 mt-1.5">
            추적용 쿠키를 사용하지 않습니다. 다만 화면 테마 설정과 게시글 삭제
            토큰을 브라우저 저장소(localStorage)에 보관합니다. 브라우저 설정에서
            언제든 지울 수 있으며, 지우면 이전에 쓴 글을 직접 삭제할 수 없게
            됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">5. 위탁 및 국외 이전</h2>
          <p className="text-ink-2 mt-1.5">
            서비스 운영을 위해 아래 사업자를 이용합니다.
          </p>
          <ul className="text-ink-2 mt-2 list-disc space-y-1 pl-5">
            <li>Vercel Inc. — 웹사이트 호스팅</li>
            <li>Supabase Inc. — 게시판 데이터 저장</li>
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">6. 시세 데이터에 관하여</h2>
          <p className="text-ink-2 mt-1.5">
            차트에 쓰이는 시세와 환율은 네이버 금융에서 수집해 미리 가공한
            파일로 제공하며, 이용자가 종목을 조회할 때 외부에 요청을 보내지
            않습니다. 따라서 어떤 종목을 조회했는지는 서버에 기록되지 않습니다.
          </p>
          <p className="text-ink-2 mt-2">
            제공되는 수치는 수정주가 기준이며 배당과 세금은 반영되지 않았습니다.
            과거 데이터를 비교해 보여줄 뿐 투자를 권유하지 않으며, 정보의
            정확성을 보증하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">7. 문의</h2>
          <p className="text-ink-2 mt-1.5">
            개인정보 관련 문의는{" "}
            <Link
              href="/board"
              className="text-focus underline underline-offset-2"
            >
              건의사항 게시판
            </Link>
            을 이용해 주세요.
          </p>
        </section>

        <p className="text-ink-muted border-hairline border-t pt-4 text-[12px]">
          이 방침은 {new URL(SITE_URL).host} 에 적용됩니다. 내용이 바뀌면 이
          페이지에 공지합니다.
        </p>
      </div>
    </PageContainer>
  );
}
