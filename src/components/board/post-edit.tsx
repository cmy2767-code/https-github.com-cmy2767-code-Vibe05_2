"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getPost, type Post } from "@/lib/posts"
import { PostForm } from "@/components/board/post-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LoaderCircle } from "lucide-react"

export function PostEdit({ id }: { id: string }) {
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    getPost(id).then((found) => {
      if (!found) setNotFound(true)
      else setPost(found)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <LoaderCircle className="mr-2 size-5 animate-spin" />
        불러오는 중...
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">존재하지 않는 게시글입니다.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/">목록으로</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href={`/posts/${id}`}><ArrowLeft />돌아가기</Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">게시글 수정</h1>
      <PostForm mode="edit" post={post} />
    </div>
  )
}
