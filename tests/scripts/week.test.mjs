/**
 * week.mjs 회귀 테스트 — node --test scripts/lib/week.test.mjs
 *
 * 특히 "미국 바 +1일" 규칙을 못 박는다. 이게 틀리면 미국 계열이 한 주씩 밀린 채
 * 차트가 대충 맞아 보여서 발견이 매우 늦는다.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addDays,
  isPublishable,
  isoWeekKey,
  latestPublishableWeek,
  weekKeyToFriday,
  weekKeyToMonday,
  weekRange,
} from "../../scripts/lib/week.mjs";

describe("isoWeekKey", () => {
  it("한국 바(마지막 거래일)를 그대로 매핑한다", () => {
    assert.equal(isoWeekKey("20260807"), "2026-W32"); // 금
    assert.equal(isoWeekKey("20260813"), "2026-W33"); // 목
    assert.equal(isoWeekKey("20160805"), "2016-W31"); // 금
  });

  it("연말·연초 경계를 ISO 규칙대로 처리한다", () => {
    assert.equal(isoWeekKey("20251226"), "2025-W52"); // 금
    assert.equal(isoWeekKey("20260102"), "2026-W01"); // 금
    assert.equal(isoWeekKey("20260101"), "2026-W01"); // 목 — 1주차는 첫 목요일이 속한 주
    assert.equal(isoWeekKey("20201231"), "2020-W53"); // 53주차가 있는 해
    assert.equal(isoWeekKey("20210101"), "2020-W53"); // 금이지만 전년도 53주차 소속
  });
});

describe("미국 바 +1일 보정 — 이 프로젝트 최대의 함정", () => {
  it("미국 일요일 앵커가 한국 바와 같은 주차로 맞춰진다", () => {
    // 미국 20260809(일)가 커버하는 거래주는 8/10~8/14 → 한국 20260813(목)과 같은 주
    assert.equal(isoWeekKey("20260809"), "2026-W32", "보정 전에는 한 주 앞선다");
    assert.equal(isoWeekKey(addDays("20260809", 1)), "2026-W33", "보정 후 한국과 일치");
    assert.equal(isoWeekKey(addDays("20260809", 1)), isoWeekKey("20260813"));
  });

  it("직전 주도 동일하게 맞는다", () => {
    // 미국 20260802(일) → 8/3~8/7 커버 → 한국 20260807(금)
    assert.equal(isoWeekKey(addDays("20260802", 1)), isoWeekKey("20260807"));
    assert.equal(isoWeekKey(addDays("20260802", 1)), "2026-W32");
  });

  it("2016년 구간에서도 맞는다", () => {
    // 미국 20160807(일) → 8/8~8/12 커버 → 한국 20160812(금)
    assert.equal(isoWeekKey(addDays("20160807", 1)), isoWeekKey("20160812"));
  });

  it("연말 경계에서도 맞는다", () => {
    assert.equal(isoWeekKey(addDays("20251228", 1)), "2026-W01");
  });
});

describe("weekKeyToMonday / weekKeyToFriday", () => {
  it("주차 키를 월·금요일로 되돌린다", () => {
    assert.equal(weekKeyToMonday("2026-W33"), "20260810");
    assert.equal(weekKeyToFriday("2026-W33"), "20260814");
    assert.equal(weekKeyToMonday("2026-W01"), "20251229");
    assert.equal(weekKeyToMonday("2020-W53"), "20201228");
  });

  it("isoWeekKey와 왕복한다", () => {
    for (const key of ["2000-W01", "2016-W31", "2020-W53", "2026-W01", "2026-W33"]) {
      assert.equal(isoWeekKey(weekKeyToMonday(key)), key);
      assert.equal(isoWeekKey(weekKeyToFriday(key)), key);
    }
  });
});

describe("weekRange", () => {
  it("연속·무결손 그리드를 만든다", () => {
    const r = weekRange("2026-W01", "2026-W05");
    assert.deepEqual(r, ["2026-W01", "2026-W02", "2026-W03", "2026-W04", "2026-W05"]);
  });

  it("53주차가 있는 해의 경계를 건너뛰지 않는다", () => {
    const r = weekRange("2020-W52", "2021-W02");
    assert.deepEqual(r, ["2020-W52", "2020-W53", "2021-W01", "2021-W02"]);
  });

  it("26년치 그리드에 빠진 주가 없다", () => {
    const r = weekRange("2000-W01", "2026-W33");
    assert.ok(r.length > 1380 && r.length < 1400, `주차 수가 예상 밖: ${r.length}`);
    assert.equal(new Set(r).size, r.length, "중복 주차가 있다");
  });
});

describe("isPublishable — 완결 주차만 발행", () => {
  const at = (iso) => new Date(iso);

  it("그 주 토요일 12:00 KST 이전에는 발행하지 않는다", () => {
    // 2026-W33 토요일 = 20260815, 12:00 KST = 03:00 UTC
    assert.equal(isPublishable("2026-W33", at("2026-08-13T00:00:00Z")), false, "목요일");
    assert.equal(isPublishable("2026-W33", at("2026-08-15T02:59:00Z")), false, "토 11:59 KST");
    assert.equal(isPublishable("2026-W33", at("2026-08-15T03:00:00Z")), true, "토 12:00 KST");
    assert.equal(isPublishable("2026-W32", at("2026-08-13T00:00:00Z")), true, "지난 주는 발행 가능");
  });

  it("latestPublishableWeek이 진행 중인 주를 제외한다", () => {
    assert.equal(latestPublishableWeek(at("2026-08-13T00:00:00Z")), "2026-W32");
    assert.equal(latestPublishableWeek(at("2026-08-15T03:00:00Z")), "2026-W33");
  });
});

describe("addDays", () => {
  it("월·연 경계를 넘는다", () => {
    assert.equal(addDays("20260813", 1), "20260814");
    assert.equal(addDays("20260831", 1), "20260901");
    assert.equal(addDays("20251231", 1), "20260101");
    assert.equal(addDays("20260101", -1), "20251231");
    assert.equal(addDays("20240228", 1), "20240229", "윤년");
  });
});
