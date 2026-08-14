import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

/**
 * 소유권 토큰과 IP 해시.
 *
 * 소유권은 **토큰으로만** 판정한다. IP로 판정하면 두 방향으로 깨진다 —
 * 국내 모바일 캐리어 NAT에서 수천 명이 같은 공인 IP를 쓰므로 남의 글을 지울 수 있고,
 * LTE↔WiFi 전환만으로 자기 글을 못 지운다.
 * ip_hash는 레이트리밋과 어뷰징 추적에만 쓴다.
 */

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/**
 * @description 수정·삭제용 토큰을 발급한다. 평문은 작성 응답 한 번에만 돌려주고 저장하지 않는다.
 * @returns token(클라이언트 보관용)과 hash(DB 저장용)
 */
export const createEditToken = () => {
  const token = randomBytes(32).toString("hex");
  return { token, hash: sha256(token) };
};

/** @description 토큰 검증. 길이가 다르면 즉시 false (timingSafeEqual이 예외를 던지므로) */
export const verifyEditToken = (token: string, hash: string): boolean => {
  const a = Buffer.from(sha256(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * @description 요청 IP를 해시한다.
 *
 * IPv6는 앞 64비트 프리픽스만 잘라서 해시한다. 단말마다 하위 비트가 바뀌므로
 * 전체 주소를 해시하면 레이트리밋이 통째로 무력해진다.
 * @param request
 * @returns sha256 앞 16자
 */
export const getIpHash = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const normalized = raw.includes(":")
    ? raw.split(":").slice(0, 4).join(":") // IPv6 → /64
    : raw;

  return sha256(normalized).slice(0, 16);
};

/** @description 도배 탐지용 본문 해시. 공백·대소문자 차이를 흡수한다 */
export const contentHash = (body: string): string =>
  sha256(body.trim().toLowerCase().replace(/\s+/g, " "));
