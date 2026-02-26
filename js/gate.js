/* =============================================
   gate.js — 출고 게이트 자동 검사기
   10_final.md 가 출고 기준을 충족하는지 검사합니다.
   ============================================= */

const Gate = (() => {

  // ── 금지 표현 패턴 ────────────────────────────────
  const FORBIDDEN_PATTERNS = [
    /최고의?\s*제품/,
    /강력\s*추천/,
    /무조건\s*추천/,
    /무조건\s*사야/,
    /꼭\s*사세요/,
    /꼭\s*써보세요/,
    /완벽한?\s*제품/,
    /최고급/,
    /압도적/,
    /넘사벽/,
    /혁명적/,
    /기적의/,
    /신의\s*한\s*수/,
    /인생\s*제품/,
    /후회\s*없는?\s*선택/,
    /100%\s*추천/,
    /강추합니다/,
    /강추!/
  ];

  // ── 페르소나 키워드 ────────────────────────────────
  const PERSONA_KEYWORDS = [
    '첫째', '둘째', '2020년생', '2023년생',
    '큰애', '작은애', '큰아이', '작은아이',
    '언니', '동생', '4살', '5살', '1살', '2살',
    '우리 딸', '두 딸', '두 아이', '언니랑', '동생이',
    '유아', '영아', '4세', '5세', '1세', '2세'
  ];

  // ── 첫 문장 패턴 ────────────────────────────────
  const OPENING_PATTERNS = [
    /^샬롬/m,
    /^행복한\s*엘자매네/m,
    /안녕하세요.*엘자매네/m,
    /엘자매네.*입니다/m,
    /반갑습니다.*엘자매네/m
  ];

  /**
   * 출고 게이트 검사
   * @param {string} text - 최종 본문
   * @param {boolean} dupePass - dupe_report 통과 여부
   * @returns {{ passed: boolean, checks: Object, violations: string[] }}
   */
  function check(text, dupePass = false) {
    if (!text || text.trim().length < 100) {
      return {
        passed: false,
        checks: {
          opening: false,
          persona: false,
          tone: false,
          dupe: false,
          length: false
        },
        violations: ['본문 내용이 너무 짧거나 비어 있습니다.']
      };
    }

    const violations = [];
    const checks = {};

    // ① 첫 문장 형식 검사
    const trimmed = text.trim();
    const firstLine = trimmed.split('\n').find(l => l.trim().length > 0) || '';
    checks.opening = OPENING_PATTERNS.some(p => p.test(firstLine) || p.test(trimmed.slice(0, 200)));
    if (!checks.opening) {
      violations.push('첫 문장이 "샬롬! 행복한 엘자매네입니다." 형식이 아닙니다. 첫 문장을 수정해 주세요.');
    }

    // ② 페르소나 삽입 검사
    const personaHits = PERSONA_KEYWORDS.filter(kw => text.includes(kw));
    checks.persona = personaHits.length >= 1;
    if (!checks.persona) {
      violations.push('첫째(2020년생)/둘째(2023년생) 관련 표현이 본문에 없습니다. 자연스럽게 1~2회 삽입해 주세요.');
    }

    // ③ 과장/광고 톤 검사
    const forbiddenHits = FORBIDDEN_PATTERNS.filter(p => p.test(text));
    checks.tone = forbiddenHits.length === 0;
    if (!checks.tone) {
      violations.push(`과장/광고 표현이 발견되었습니다: ${forbiddenHits.map(p => p.source).join(', ')} — 경험담 톤으로 수정해 주세요.`);
    }

    // ④ 유사문서 기준 (dupe_report 연동)
    checks.dupe = dupePass !== false;
    if (!checks.dupe) {
      violations.push('유사문서 검사(dupe_report)가 FAIL 또는 미완료 상태입니다. 위반 구간을 재작성 후 재검사하세요.');
    }

    // ⑤ 분량/구조 검사 (최소 800자, H2 소제목 1개 이상)
    const charCount = text.replace(/\s/g, '').length;
    const hasHeadings = /^#{1,3}\s/m.test(text);
    checks.length = charCount >= 800 && hasHeadings;
    if (!checks.length) {
      if (charCount < 800) violations.push(`본문이 너무 짧습니다 (현재 ${charCount}자). 최소 800자 이상 작성해 주세요.`);
      if (!hasHeadings) violations.push('소제목(H2/H3)이 없습니다. SEO 브리프 목차 구조를 반영해 주세요.');
    }

    const passed = violations.length === 0;

    return { passed, checks, violations };
  }

  /**
   * UI에 게이트 결과 반영
   * @param {{ passed: boolean, checks: Object, violations: string[] }} result
   * @param {boolean} dupePass
   */
  function renderGateUI(result, dupePass) {
    const iconMap = { pass: '✅', fail: '❌', pending: '⏳' };

    const items = {
      'gate-opening': result.checks.opening,
      'gate-persona':  result.checks.persona,
      'gate-tone':     result.checks.tone,
      'gate-dupe':     result.checks.dupe,
      'gate-length':   result.checks.length
    };

    for (const [id, passed] of Object.entries(items)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.classList.remove('pass', 'fail');
      el.classList.add(passed ? 'pass' : 'fail');
      const iconEl = el.querySelector('.gate-icon');
      if (iconEl) iconEl.textContent = passed ? iconMap.pass : iconMap.fail;
    }

    // 전체 결과
    const resultEl = document.getElementById('gate-result');
    if (resultEl) {
      resultEl.classList.remove('hidden', 'pass', 'fail');
      if (result.passed) {
        resultEl.classList.add('pass');
        resultEl.innerHTML = '✅ 출고 게이트 통과 — 최종 출고 확정';
      } else {
        resultEl.classList.add('fail');
        resultEl.innerHTML = `❌ 출고 게이트 실패 — 자동 반려<br><ul style="margin-top:8px;padding-left:20px">${
          result.violations.map(v => `<li style="font-size:13px;font-weight:400;margin-top:4px">${v}</li>`).join('')
        }</ul>`;
      }
    }
  }

  /**
   * dupe_report 본문에서 PASS/FAIL 판정 추출
   * @param {string} dupeText
   * @returns {boolean}
   */
  function parseDupePass(dupeText) {
    if (!dupeText) return false;
    const upperText = dupeText.toUpperCase();
    if (upperText.includes('PASS') && !upperText.includes('FAIL')) return true;
    if (/판정:\s*PASS/i.test(dupeText)) return true;
    if (/위반.*0건/i.test(dupeText)) return true;
    if (/발견된 위반.*0/i.test(dupeText)) return true;
    return false;
  }

  return { check, renderGateUI, parseDupePass };
})();
