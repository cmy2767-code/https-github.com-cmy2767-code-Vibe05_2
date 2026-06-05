import { Header } from "@/components/layout/header"
import { PostForm } from "@/components/board/post-form"

export default function NewPostPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h2 className="mb-6 text-xl font-semibold tracking-tight">새 글 작성</h2>
        <PostForm mode="create" />
      </main>
    </>
  )
}
