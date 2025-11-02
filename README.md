# 📸 Instagram 댓글 생성기

AI 기반 Instagram 게시물 댓글 자동 생성 웹 애플리케이션입니다.

## ✨ 주요 기능

- 🔗 Instagram 게시물 URL 입력
- 📝 자동 캡션 추출
- 🤖 AI 기반 자연스러운 댓글 생성
- 📋 생성된 댓글 복사 기능
- 🎨 반응형 UI 디자인

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고, OpenAI API 키를 입력하세요.

```bash
cp .env.example .env
```

`.env` 파일:
```
OPENAI_API_KEY=your_openai_api_key_here
```

**OpenAI API 키 발급 방법:**
1. [OpenAI Platform](https://platform.openai.com/)에 가입
2. [API Keys 페이지](https://platform.openai.com/api-keys)에서 새 키 생성
3. 생성된 키를 복사하여 `.env` 파일에 붙여넣기

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📦 배포하기

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 연결
3. 환경 변수 설정:
   - `OPENAI_API_KEY`: OpenAI API 키
4. 배포 버튼 클릭

또는 Vercel CLI 사용:

```bash
npm install -g vercel
vercel
```

배포 후 Vercel 대시보드에서 환경 변수를 설정하세요.

## 🛠️ 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini
- **스크래핑**: Axios + Cheerio

## 💡 사용 방법

1. Instagram 게시물 URL 입력 (예: `https://www.instagram.com/p/ABC123/`)
2. 생성할 댓글 개수 선택 (1-20개)
3. "댓글 생성하기" 버튼 클릭
4. 생성된 댓글 확인 및 복사

## ⚠️ 주의사항

- OpenAI API 사용에는 비용이 발생할 수 있습니다
- Instagram의 이용 약관을 준수하여 사용하세요
- 과도한 요청은 차단될 수 있습니다

## 📄 라이선스

ISC

## 🤝 기여

이슈 및 풀 리퀘스트를 환영합니다!