import { toast } from "sonner";

/**
 * @description 종목 추가 요청을 보내고 결과를 토스트로 알린다.
 *
 * 서버가 요청 즉시 수신 가능 여부를 확인해 답을 준다 — 지원하지 않는 종목을
 * 일주일 기다린 끝에 알게 되는 게 최악이라서다.
 * @param query - 사용자가 검색한 문자열
 */
export const requestTicker = async (query: string): Promise<void> => {
  const q = query.trim();
  if (!q) return;

  try {
    const res = await fetch("/api/ticker-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "요청을 보내지 못했습니다");
      return;
    }
    if (data.status === "unsupported") {
      toast.warning(`“${q}”`, { description: data.message });
      return;
    }
    toast.success(`“${q}” 요청을 접수했어요`, { description: data.message });
  } catch {
    toast.error("네트워크 오류가 발생했습니다");
  }
};
