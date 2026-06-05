import { Header } from "@/components/layout/header"
import { PostEdit } from "@/components/board/post-edit"

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <PostEdit id={id} />
      </main>
    </>
  )
}
