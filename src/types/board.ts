/** 목록·상세에 내려가는 게시글. 비밀 컬럼(토큰·IP 해시)은 절대 포함하지 않는다 */
export interface BoardPost {
  id: string;
  nickname: string;
  body: string;
  tickerCode: string | null;
  createdAt: string;
  editedAt: string | null;
  /** 요청자가 작성자일 때만 true — localStorage의 토큰과 대조해 클라이언트가 채운다 */
  mine?: boolean;
}

export interface BoardListResponse {
  posts: BoardPost[];
  /** 다음 페이지 커서 (createdAt). null이면 끝 */
  nextCursor: string | null;
}

export interface CreatePostRequest {
  body: string;
  nicknameSeed: number;
  tickerCode?: string | null;
  /** 폼을 연 시각으로부터 경과 ms — 봇 판별에 쓴다 */
  elapsedMs: number;
  /** 봇만 채우는 숨은 필드 */
  website?: string;
}

export interface CreatePostResponse {
  post: BoardPost;
  /** 수정·삭제용 토큰. 이 응답에서 한 번만 내려간다 */
  editToken: string;
}

export interface TickerRequestResponse {
  status: "queued" | "added" | "unsupported";
  message: string;
  votes: number;
}
