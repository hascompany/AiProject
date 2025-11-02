# 🚀 배포 가이드

이 앱은 **서버 기능(API 라우트)** 이 필요하므로 GitHub Pages에서는 작동하지 않습니다.

## ✅ Vercel 배포 (권장)

### 1. Vercel 계정 만들기
1. [vercel.com](https://vercel.com) 접속
2. "Sign Up" 클릭
3. GitHub 계정으로 로그인

### 2. 프로젝트 배포
1. Vercel 대시보드에서 "Add New..." → "Project" 클릭
2. GitHub 저장소 선택 (hascompany/AiProject)
3. "Import" 클릭
4. **환경 변수 설정**:
   - Name: `OPENAI_API_KEY`
   - Value: [OpenAI API 키](https://platform.openai.com/api-keys)
5. "Deploy" 클릭

### 3. 배포 완료!
- 2-3분 후 자동으로 URL 생성됨 (예: `https://your-project.vercel.app`)
- 이후 Git Push 시 자동 재배포

## 🔑 OpenAI API 키 발급

1. [OpenAI Platform](https://platform.openai.com/) 가입
2. [API Keys](https://platform.openai.com/api-keys) 페이지
3. "Create new secret key" 클릭
4. 키 복사 (sk-proj-...)
5. Vercel 환경 변수에 추가

## 💰 비용

- **Vercel**: 무료 (취미 프로젝트)
- **OpenAI API**: 사용량 기준 과금
  - GPT-4o-mini: 매우 저렴 (~$0.15/1M 토큰)
  - 댓글 1개 생성 ≈ $0.001

## 🔄 업데이트 방법

Git Push만 하면 자동 배포:
```bash
git add .
git commit -m "Update"
git push
```

## ⚠️ 주의사항

- **GitHub Pages는 사용 불가** (정적 사이트만 지원)
- 반드시 `OPENAI_API_KEY` 환경 변수 설정 필요
- API 키는 절대 Git에 커밋하지 마세요
