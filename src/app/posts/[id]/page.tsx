import { Header } from "@/components/layout/header"
import { PostDetail } from "@/components/board/post-detail"

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <PostDetail id={id} />
      </main>
    </>
  )
}
