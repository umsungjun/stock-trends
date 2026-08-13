/**
 * 파일 입출력 — 내용이 같으면 쓰지 않는다.
 *
 * 매 실행마다 무조건 쓰면 mtime만 바뀐 파일이 생기고, 그게 git status에는 안 잡혀도
 * 빌드 캐시와 워크플로 판정을 흐린다. writeIfChanged가 "변경 없으면 커밋 스킵"의 1차 방어선이다.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** 스크립트들이 `new URL(..., import.meta.url)`을 쓰므로 URL·문자열을 모두 받는다 */
const toPath = (p) => (p instanceof URL ? fileURLToPath(p) : String(p));

/** @description 부모 디렉터리까지 만든다 */
export const ensureDir = async (filePath) => {
  await mkdir(dirname(toPath(filePath)), { recursive: true });
};

/**
 * @description 기존 내용과 다를 때만 쓴다.
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<boolean>} 실제로 썼으면 true
 */
export const writeIfChanged = async (filePath, content) => {
  const path = toPath(filePath);
  try {
    if ((await readFile(path, "utf8")) === content) return false;
  } catch {
    // 파일이 없으면 그냥 쓴다
  }
  await ensureDir(path);
  await writeFile(path, content);
  return true;
};

/** @description JSON을 쓴다. 키 순서가 고정되어야 diff가 안정적이므로 호출부에서 순서를 관리한다 */
export const writeJsonIfChanged = (filePath, value, { pretty = false } = {}) =>
  writeIfChanged(filePath, pretty ? `${JSON.stringify(value, null, 2)}\n` : JSON.stringify(value));

/** @description 없으면 fallback을 돌려준다. 캐시·이전 산출물 읽기에 쓴다 */
export const readJsonIfExists = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await readFile(toPath(filePath), "utf8"));
  } catch {
    return fallback;
  }
};

/**
 * @description NDJSON을 배열로 읽는다. 깨진 줄은 건너뛴다 — append-only 캐시가 중간에 끊겨도 살아남게.
 * @param {string} filePath
 * @returns {Promise<object[]>}
 */
export const readNdjson = async (filePath) => {
  let raw;
  try {
    raw = await readFile(toPath(filePath), "utf8");
  } catch {
    return [];
  }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // 깨진 줄 무시
    }
  }
  return out;
};

/** @description 객체 배열을 NDJSON으로 쓴다 (내용 동일하면 스킵) */
export const writeNdjsonIfChanged = (filePath, rows) =>
  writeIfChanged(filePath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
