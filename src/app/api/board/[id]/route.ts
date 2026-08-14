import { NextRequest, NextResponse } from "next/server";

import { verifyEditToken } from "@/lib/board/identity";
import { createServerClient, isBoardEnabled } from "@/lib/supabase/server";

/**
 * 글 삭제 — 소유권은 작성 시 발급한 토큰으로만 판정한다.
 *
 * IP로 판정하면 국내 모바일 캐리어 NAT에서 남의 글을 지울 수 있고,
 * LTE↔WiFi 전환만으로 자기 글을 못 지운다.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isBoardEnabled()) {
    return NextResponse.json(
      { error: "게시판이 아직 설정되지 않았습니다" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const token = request.headers.get("x-edit-token");
  if (!token) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from("posts")
    .select("id, edit_token_hash, deleted_at")
    .eq("id", id)
    .maybeSingle();

  // 존재 여부를 알려주지 않는다 — 없는 글과 남의 글을 구분할 수 있으면 탐색에 쓰인다
  if (
    !data ||
    data.deleted_at ||
    !verifyEditToken(token, data.edit_token_hash)
  ) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  // 소프트 삭제 — 신고·어뷰징 추적 기록을 남긴다
  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "삭제하지 못했습니다" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
