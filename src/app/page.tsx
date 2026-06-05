import { Header } from "@/components/layout/header"
import { PostList } from "@/components/board/post-list"

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold tracking-tight">게시글 목록</h2>
        <PostList />
      </main>
    </>
  )
}
