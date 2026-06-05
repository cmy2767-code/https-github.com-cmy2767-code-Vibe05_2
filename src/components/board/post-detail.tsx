"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { deletePost, formatDate, getPost, incrementViews, type Post } from "@/lib/posts"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Eye, Pencil, Trash2, User } from "lucide-react"

export function PostDetail({ id }: { id: string }) {
  const router = useRouter()
  const [post, setPost] = useState<Post | undefined>(undefined)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const found = getPost(id)
    if (!found) {
      setNotFound(true)
      return
    }
    incrementViews(id)
    setPost({ ...found, views: found.views + 1 })
  }, [id])

  function handleDelete() {
    deletePost(id)
    router.push("/")
  }

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
    <article className="space-y-6">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/">
          <ArrowLeft />
          목록
        </Link>
      </Button>

      {/* Title */}
      <h1 className="text-2xl font-bold leading-snug tracking-tight">{post.title}</h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="size-3.5" />
          {post.author}
        </span>
        <span>{formatDate(post.createdAt)}</span>
        <span className="flex items-center gap-1">
          <Eye className="size-3.5" />
          {post.views}
        </span>
      </div>

      <Separator />

      {/* Content */}
      <div className="min-h-48 whitespace-pre-wrap text-sm leading-7 text-foreground">
        {post.content}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/posts/${id}/edit`}>
            <Pencil />
            수정
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 />
              삭제
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>게시글을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                삭제된 게시글은 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  )
}
