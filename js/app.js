/* =============================================
   app.js — 메인 애플리케이션 오케스트레이터
   ============================================= */

// ─── 상태 ────────────────────────────────────────
const STATE_KEY = 'el_sisters_state';

let state = {
  currentStage: 0,
  inputs: {
    mainKeyword: '',
    subKeywords: '',
    brand: '',
    requiredGuidelines: '',
    forbiddenGuidelines: '',
    referenceDoc: '',
    emphasisPoints: '',
    homeDetail1: '',
    homeDetail2: '',
    serpData: ''
  },
  outputs: {
    1: '', // 00_stylepack.md
    2: '', // 01_serp_top5.md
    3: '', // 02_seo_brief.md
    4: '', // 08_samples.md
    5: '', // 09_dupe_report.md
    6: ''  // 10_final.md
  },
  status: {
    1: 'idle', 2: 'idle', 3: 'idle',
    4: 'idle', 5: 'idle', 6: 'idle'
  },
  sampleApproved: false,
  sampleFeedback: '',
  dupePass: false,
  gateAttempts: 0
};

// ─── 초기화 ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initSettings();
  initInputForm();
  renderAll();
  bindPipelineStart();
});

// ─── 상태 저장/복원 ────────────────────────────────
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
}

function loadState() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 기존 상태가 있으면 덮어쓰기 (안전하게 병합)
      state = { ...state, ...parsed };
      state.outputs = { ...state.outputs, ...(parsed.outputs || {}) };
      state.status  = { ...state.status,  ...(parsed.status  || {}) };
    }
  } catch (_) {}
}

// ─── 설정 모달 ────────────────────────────────────
function initSettings() {
  // 저장된 키/모델 불러오기
  document.getElementById('api-key-input').value = API.getKey() ? '••••••••' : '';
  document.getElementById('model-select').value = API.getModel();
  updateApiStatus();

  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.remove('hidden');
    const keyInput = document.getElementById('api-key-input');
    keyInput.value = API.getKey();
    keyInput.type = 'password';
  });

  document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.add('hidden');
  });

  document.getElementById('save-settings-btn').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    const model = document.getElementById('model-select').value;
    if (key && !key.startsWith('••')) API.setKey(key);
    API.setModel(model);
    document.getElementById('modal-overlay').classList.add('hidden');
    updateApiStatus();
    showToast('설정이 저장되었습니다.', 'success');
  });

  // 오버레이 클릭으로 닫기
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
      document.getElementById('modal-overlay').classList.add('hidden');
    }
  });
}

function updateApiStatus() {
  const el = document.getElementById('api-status');
  const hasKey = !!API.getKey();
  el.textContent = hasKey ? 'API 연결됨' : 'API 키 미설정';
  el.className = `api-status ${hasKey ? 'api-status--set' : 'api-status--unset'}`;
}

// ─── 입력 폼 초기화 ────────────────────────────────
function initInputForm() {
  const fieldMap = {
    'main-keyword':          'mainKeyword',
    'sub-keywords':          'subKeywords',
    'brand':                 'brand',
    'required-guidelines':   'requiredGuidelines',
    'forbidden-guidelines':  'forbiddenGuidelines',
    'reference-doc':         'referenceDoc',
    'emphasis-points':       'emphasisPoints',
    'home-detail-1':         'homeDetail1',
    'home-detail-2':         'homeDetail2',
    'serp-data':             'serpData'
  };

  for (const [id, key] of Object.entries(fieldMap)) {
    const el = document.getElementById(id);
    if (!el) continue;
    // 저장된 값 복원
    el.value = state.inputs[key] || '';
    // 변경 시 상태 업데이트
    el.addEventListener('input', () => {
      state.inputs[key] = el.value;
      saveState();
    });
  }
}

// ─── 파이프라인 시작 버튼 ──────────────────────────
function bindPipelineStart() {
  document.getElementById('start-pipeline-btn').addEventListener('click', async () => {
    // 유효성 검사
    const mainKw = document.getElementById('main-keyword').value.trim();
    const required = document.getElementById('required-guidelines').value.trim();
    if (!mainKw) {
      showToast('메인 키워드를 입력해 주세요.', 'error'); return;
    }
    if (!required) {
      showToast('필수 포함 사항을 입력해 주세요.', 'error'); return;
    }
    if (!API.getKey()) {
      showToast('API 키를 먼저 설정해 주세요. 우측 상단 [설정] 버튼을 클릭하세요.', 'error'); return;
    }

    // 입력 최신화
    state.inputs.mainKeyword         = mainKw;
    state.inputs.requiredGuidelines  = required;
    state.sampleApproved             = false;
    saveState();

    // 1→2→3→4 순차 자동 생성
    await runAutoStages();
  });
}

// ─── 자동 순차 실행 (1→2→3→4) ─────────────────────
async function runAutoStages() {
  for (const stageNum of [1, 2, 3, 4]) {
    goToStage(stageNum);
    const ok = await generateStage(stageNum);
    if (!ok) return; // 오류 발생 시 중단
    if (stageNum < 4) await delay(500); // 단계 사이 잠깐 대기
  }
  // 샘플 승인 대기 (Panel 4 에 자동 포커스)
  showApprovalSection();
}

// ─── 단계 이동 ────────────────────────────────────
function goToStage(num) {
  state.currentStage = num;
  saveState();
  renderStageTracker();
  renderPanels();
}

// ─── 스테이지 트래커 렌더 ──────────────────────────
function renderStageTracker() {
  for (let i = 0; i <= 6; i++) {
    const el = document.getElementById(`st-${i}`);
    if (!el) continue;
    el.classList.remove('active', 'complete');
    if (i === state.currentStage) el.classList.add('active');
    else if (i < state.currentStage) el.classList.add('complete');
  }
  for (let i = 0; i <= 5; i++) {
    const con = document.getElementById(`sc-${i}`);
    if (!con) continue;
    con.classList.toggle('complete', i < state.currentStage);
  }
}

// ─── 패널 렌더 ────────────────────────────────────
function renderPanels() {
  for (let i = 0; i <= 6; i++) {
    const el = document.getElementById(`panel-${i}`);
    if (!el) continue;
    el.classList.toggle('hidden', i !== state.currentStage);
  }
  // 현재 패널에 저장된 출력물 렌더링
  if (state.currentStage >= 1 && state.currentStage <= 6) {
    const out = state.outputs[state.currentStage];
    if (out) renderOutput(state.currentStage, out);
  }
}

// ─── 전체 UI 렌더 ────────────────────────────────
function renderAll() {
  renderStageTracker();
  renderPanels();
  // 저장된 출력물 모두 렌더링
  for (let i = 1; i <= 6; i++) {
    if (state.outputs[i]) {
      renderOutput(i, state.outputs[i]);
      setBadge(i, state.status[i] === 'complete' ? '완료' : '대기중');
    }
  }
  // 샘플 승인 섹션 상태 복원
  if (state.currentStage === 4 && state.status[4] === 'complete') {
    showApprovalSection();
  }
}

// ─── 출력물 렌더링 ────────────────────────────────
function renderOutput(stageNum, text) {
  const el = document.getElementById(`output-${stageNum}`);
  if (!el) return;
  el.innerHTML = marked.parse(text);
}

// ─── 배지 업데이트 ────────────────────────────────
function setBadge(stageNum, label) {
  const el = document.getElementById(`badge-${stageNum}`);
  if (!el) return;
  el.textContent = label;
  el.setAttribute('data-status', label);
}

// ─── 단계 생성 ────────────────────────────────────
async function generateStage(stageNum, extraOpts = {}) {
  state.status[stageNum] = 'generating';
  setBadge(stageNum, '생성중');
  saveState();

  const roleKey = stageNum === 4 ? 'SAMPLES' :
                  stageNum === 5 ? 'DUPE'    :
                  stageNum === 6 ? 'FINAL'   :
                  stageNum === 1 ? 'STYLEPACK' :
                  stageNum === 2 ? 'SERP'    : 'SEO';

  const role = ROLES[roleKey];
  const systemPrompt = role.system;

  // 입력 데이터 빌드
  const promptInputs = buildPromptInputs(stageNum, extraOpts);
  const userMessage  = role.prompt(promptInputs);

  // 생성 오버레이 표시
  const roleLabels = {
    1: 'stylepack_generator — 스타일팩 생성 중',
    2: 'serp_analyst — SERP 상위 5개 분석 중',
    3: 'seo_lead — SEO 브리프 설계 중',
    4: 'writer — 샘플 문단 작성 중',
    5: 'dupe_scanner — 유사문서 검사 중',
    6: 'writer — 최종 본문 작성 중'
  };
  showOverlay(roleLabels[stageNum] || '생성 중');

  const outputEl = document.getElementById(`output-${stageNum}`);
  if (outputEl) { outputEl.innerHTML = ''; outputEl.classList.add('streaming'); }

  let result = '';
  try {
    result = await API.call(systemPrompt, userMessage, (chunk, fullText) => {
      if (outputEl) outputEl.innerHTML = marked.parse(fullText);
    });

    state.outputs[stageNum] = result;
    state.status[stageNum]  = 'complete';
    setBadge(stageNum, '완료');
    saveState();

    if (outputEl) outputEl.classList.remove('streaming');
    hideOverlay();

    // 단계별 후처리
    if (stageNum === 5) {
      state.dupePass = Gate.parseDupePass(result);
      saveState();
    }
    if (stageNum === 6) {
      runGateCheck();
    }

    return true;

  } catch (err) {
    state.status[stageNum] = 'error';
    setBadge(stageNum, '오류');
    saveState();
    if (outputEl) { outputEl.classList.remove('streaming'); outputEl.innerHTML = `<div style="color:var(--error);padding:20px">⚠️ 오류: ${err.message}</div>`; }
    hideOverlay();
    showToast(`생성 오류: ${err.message}`, 'error');
    return false;
  }
}

// ─── 프롬프트 입력 빌드 ───────────────────────────
function buildPromptInputs(stageNum, extraOpts = {}) {
  const base = { ...state.inputs, ...extraOpts };

  // 이전 단계 출력물 연결
  if (stageNum >= 2) base.stylepackContent = state.outputs[1] || '';
  if (stageNum >= 3) {
    base.serpContent = state.outputs[2] || '';
    base.stylepackSummary = extractFirstLines(state.outputs[1], 30);
  }
  if (stageNum >= 4) {
    base.serpSummary    = extractFirstLines(state.outputs[2], 20);
    base.seoBriefContent = state.outputs[3] || '';
  }
  if (stageNum === 4 && state.sampleFeedback) {
    base.rejectionFeedback = state.sampleFeedback;
  }
  if (stageNum >= 5) {
    base.samplesContent = state.outputs[4] || '';
  }
  if (stageNum === 6) {
    base.dupeContent    = state.outputs[5] || '';
    base.gateViolations = extraOpts.gateViolations || '';
  }
  return base;
}

// ─── 샘플 승인 섹션 표시 ──────────────────────────
function showApprovalSection() {
  const sec = document.getElementById('approval-section');
  if (sec) sec.style.display = 'block';
}

// ─── 샘플 승인 ────────────────────────────────────
async function approveSamples() {
  state.sampleApproved = true;
  state.sampleFeedback = '';
  const approvalSec = document.getElementById('approval-section');
  if (approvalSec) approvalSec.style.display = 'none';
  showToast('✅ 샘플 승인! 중복 검사 및 최종 본문 작성을 시작합니다.', 'success');
  saveState();

  goToStage(5);
  const ok5 = await generateStage(5);
  if (!ok5) return;

  await delay(500);
  goToStage(6);
  await generateStage(6);
}

// ─── 샘플 반려 ────────────────────────────────────
async function rejectSamples() {
  const feedback = document.getElementById('sample-feedback').value.trim();
  state.sampleApproved = false;
  state.sampleFeedback = feedback || '전반적으로 다시 작성해 주세요.';
  showToast('❌ 반려 — 피드백을 반영하여 샘플을 재작성합니다.', 'warn');
  saveState();

  await generateStage(4);
  showApprovalSection();
}

// ─── 게이트 검사 실행 ──────────────────────────────
async function runGateCheck() {
  const finalText = state.outputs[6] || '';
  const result = Gate.check(finalText, state.dupePass);
  Gate.renderGateUI(result, state.dupePass);

  // 3줄 요약 표시
  const summaryPanel = document.getElementById('summary-panel');
  if (summaryPanel) {
    const summary = extractSummary(finalText);
    if (summary) {
      document.getElementById('summary-content').innerHTML = marked.parse(summary);
      summaryPanel.classList.remove('hidden');
    }
  }

  if (!result.passed) {
    state.gateAttempts++;
    saveState();
    if (state.gateAttempts <= 3) {
      showToast(`❌ 게이트 실패 — 자동 재작성 시작 (시도 ${state.gateAttempts}/3)`, 'warn');
      await delay(1500);
      await generateStage(6, { gateViolations: result.violations.join('\n') });
    } else {
      showToast('⚠️ 게이트 3회 실패. 대표님이 직접 수정 후 [재생성]을 눌러주세요.', 'error');
    }
  } else {
    state.gateAttempts = 0;
    saveState();
    showToast('🎉 출고 게이트 통과! 최종 출고 확정입니다.', 'success');
  }
}

// ─── 재생성 ───────────────────────────────────────
async function regenerate(stageNum) {
  state.status[stageNum] = 'idle';
  state.outputs[stageNum] = '';
  if (stageNum === 6) state.gateAttempts = 0;
  saveState();
  goToStage(stageNum);
  await generateStage(stageNum);
  if (stageNum === 4) showApprovalSection();
}

// ─── 파일 다운로드 ────────────────────────────────
function downloadFile(stageNum, filename) {
  const content = state.outputs[stageNum];
  if (!content) { showToast('아직 생성된 파일이 없습니다.', 'warn'); return; }
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast(`${filename} 다운로드 완료!`, 'success');
}

// ─── 전체 파일 다운로드 ───────────────────────────
function downloadAll() {
  const files = [
    { stageNum: 1, filename: '00_stylepack.md' },
    { stageNum: 2, filename: '01_serp_top5.md' },
    { stageNum: 3, filename: '02_seo_brief.md' },
    { stageNum: 4, filename: '08_samples.md'   },
    { stageNum: 5, filename: '09_dupe_report.md'},
    { stageNum: 6, filename: '10_final.md'     }
  ];
  let downloaded = 0;
  files.forEach((f, i) => {
    if (state.outputs[f.stageNum]) {
      setTimeout(() => downloadFile(f.stageNum, f.filename), i * 400);
      downloaded++;
    }
  });
  if (downloaded === 0) showToast('다운로드할 파일이 없습니다.', 'warn');
}

// ─── 클립보드 복사 (노션용) ───────────────────────
function copyToClipboard(stageNum) {
  const content = state.outputs[stageNum];
  if (!content) { showToast('아직 생성된 내용이 없습니다.', 'warn'); return; }
  navigator.clipboard.writeText(content)
    .then(() => showToast('📋 클립보드에 복사되었습니다. 노션에 붙여넣기 하세요!', 'success'))
    .catch(() => showToast('복사 실패. 출력 영역에서 직접 복사해 주세요.', 'error'));
}

// ─── 오버레이 ────────────────────────────────────
function showOverlay(message) {
  document.getElementById('gen-overlay').classList.remove('hidden');
  const [role, ...rest] = message.split(' — ');
  document.getElementById('gen-role').textContent = role || message;
  document.getElementById('gen-message').textContent = rest.join(' — ') || 'Claude AI가 작성하고 있습니다';
}

function hideOverlay() {
  document.getElementById('gen-overlay').classList.add('hidden');
}

// ─── 토스트 ──────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4000);
}

// ─── 유틸 ────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractFirstLines(text, maxLines) {
  if (!text) return '';
  return text.split('\n').slice(0, maxLines).join('\n');
}

function extractSummary(text) {
  const match = text.match(/#{1,3}\s*3줄\s*요약([\s\S]*?)(?=#{1,3}|$)/i);
  if (match) return match[1].trim();
  // 없으면 마지막 200자
  return text.slice(-200).trim();
}

// ─── 외부에서 호출 가능한 App 네임스페이스 ─────────
const App = {
  goToStage,
  regenerate,
  downloadFile,
  downloadAll,
  copyToClipboard,
  approveSamples,
  rejectSamples
};
