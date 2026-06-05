"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getPost, type Post } from "@/lib/posts"
import { PostForm } from "@/components/board/post-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function PostEdit({ id }: { id: string }) {
  const [post, setPost] = useState<Post | undefined>(undefined)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const found = getPost(id)
    if (!found) setNotFound(true)
    else setPost(found)
  }, [id])

  if (notFound) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">존재하지 않는 게시글입니다.</p>
        <Button asChild variant="link" className="mt-2">
          <Link href="/">목록으로</Link>
        </Button>
      </div>
    )
  }

  if (!post) return null

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href={`/posts/${id}`}>
          <ArrowLeft />
          돌아가기
        </Link>
      </Button>
      <h1 className="text-2xl font-bold tracking-tight">게시글 수정</h1>
      <PostForm mode="edit" post={post} />
    </div>
  )
}
