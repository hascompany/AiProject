'use client'

import { useState } from 'react'

export default function Home() {
  const [instagramUrl, setInstagramUrl] = useState('')
  const [commentCount, setCommentCount] = useState(5)
  const [comments, setComments] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [caption, setCaption] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setComments([])
    setCaption('')

    try {
      const response = await fetch('/api/generate-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instagramUrl,
          commentCount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '댓글 생성에 실패했습니다.')
      }

      setCaption(data.caption)
      setComments(data.comments)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('댓글이 클립보드에 복사되었습니다!')
  }

  const copyAllComments = () => {
    const allComments = comments.join('\n\n')
    navigator.clipboard.writeText(allComments)
    alert('모든 댓글이 클립보드에 복사되었습니다!')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            📸 Instagram 댓글 생성기
          </h1>
          <p className="text-gray-600 text-lg">
            인스타그램 게시물 링크를 넣으면 AI가 자동으로 관련 댓글을 생성합니다
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Instagram 게시물 URL
              </label>
              <input
                id="url"
                type="text"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-gray-800"
                required
              />
            </div>

            <div>
              <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-2">
                생성할 댓글 개수
              </label>
              <input
                id="count"
                type="number"
                min="1"
                max="20"
                value={commentCount}
                onChange={(e) => setCommentCount(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition text-gray-800"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:scale-105"
            >
              {loading ? '생성 중...' : '댓글 생성하기'}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-medium">오류</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        {caption && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 게시물 캡션</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{caption}</p>
            </div>
          </div>
        )}

        {comments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">💬 생성된 댓글</h2>
              <button
                onClick={copyAllComments}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                모두 복사
              </button>
            </div>
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-gray-800 flex-1">{comment}</p>
                    <button
                      onClick={() => copyToClipboard(comment)}
                      className="ml-4 px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600 transition flex-shrink-0"
                    >
                      복사
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
