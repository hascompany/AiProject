import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

// Instagram 캡션 추출 함수
async function getInstagramCaption(url: string): Promise<string> {
  try {
    // Instagram URL 검증
    if (!url.includes('instagram.com')) {
      throw new Error('유효한 Instagram URL이 아닙니다.')
    }

    // Instagram 페이지 가져오기
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    const html = response.data
    const $ = cheerio.load(html)

    // Instagram의 메타 태그에서 설명 추출
    let caption = $('meta[property="og:description"]').attr('content') || ''

    if (!caption) {
      caption = $('meta[name="description"]').attr('content') || ''
    }

    // JSON-LD 데이터에서 추출 시도
    if (!caption) {
      const scriptTags = $('script[type="application/ld+json"]')
      scriptTags.each((_, element) => {
        try {
          const jsonData = JSON.parse($(element).html() || '{}')
          if (jsonData.articleBody) {
            caption = jsonData.articleBody
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      })
    }

    // 캡션 정제 (Instagram 특유의 텍스트 제거)
    if (caption) {
      // "Likes, X Comments" 같은 패턴 제거
      caption = caption.replace(/^\d+\s*(Likes|Comments|likes|comments).*/i, '')
      caption = caption.replace(/^.*?on Instagram:?\s*/i, '')
      caption = caption.trim()
    }

    if (!caption) {
      throw new Error('캡션을 찾을 수 없습니다. URL을 확인해주세요.')
    }

    return caption
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error('Instagram 페이지를 불러올 수 없습니다. URL을 확인해주세요.')
    }
    throw error
  }
}

// AI 댓글 생성 함수
async function generateComments(caption: string, count: number): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OpenAI API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.')
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  })

  const prompt = `다음은 Instagram 게시물의 캡션입니다:

"${caption}"

이 게시물에 어울리는 자연스럽고 긍정적인 댓글을 ${count}개 생성해주세요. 각 댓글은:
- 한국어로 작성
- 진심 어린 톤
- 이모지 적절히 사용
- 각각 다른 스타일과 관점
- 게시물 내용과 관련성 있게
- 너무 길지 않게 (1-2문장)

댓글만 생성하고, 번호나 다른 설명 없이 각 댓글을 새로운 줄에 작성해주세요.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 Instagram 댓글을 작성하는 전문가입니다. 자연스럽고 진정성 있는 댓글을 작성합니다.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1000,
    })

    const result = completion.choices[0]?.message?.content || ''

    // 생성된 댓글을 줄 단위로 분리하고 정제
    const comments = result
      .split('\n')
      .map(comment => comment.trim())
      .filter(comment => comment.length > 0 && !comment.match(/^\d+\.|^-/)) // 번호나 불릿 제거
      .slice(0, count)

    if (comments.length === 0) {
      throw new Error('댓글 생성에 실패했습니다.')
    }

    return comments
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`AI 댓글 생성 실패: ${error.message}`)
    }
    throw new Error('AI 댓글 생성 중 알 수 없는 오류가 발생했습니다.')
  }
}

// API 라우트 핸들러
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instagramUrl, commentCount } = body

    // 입력 검증
    if (!instagramUrl || typeof instagramUrl !== 'string') {
      return NextResponse.json(
        { error: 'Instagram URL을 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!commentCount || typeof commentCount !== 'number' || commentCount < 1 || commentCount > 20) {
      return NextResponse.json(
        { error: '댓글 개수는 1-20 사이여야 합니다.' },
        { status: 400 }
      )
    }

    // 1. Instagram 캡션 가져오기
    const caption = await getInstagramCaption(instagramUrl)

    // 2. AI 댓글 생성
    const comments = await generateComments(caption, commentCount)

    return NextResponse.json({
      success: true,
      caption,
      comments,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}
