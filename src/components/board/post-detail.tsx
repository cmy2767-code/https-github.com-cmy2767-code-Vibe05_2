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
import { ArrowLeft, Eye, LoaderCircle, Pencil, Trash2, User } from "lucide-react"

export function PostDetail({ id }: { id: string }) {
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const found = await getPost(id)
      if (!found) {
        setNotFound(true)
        setLoading(false)
        return
      }
      await incrementViews(id)
      setPost({ ...found, views: found.views + 1 })
      setLoading(false)
    }
    load()
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    await deletePost(id)
    router.push("/")
  }

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
    <article className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/"><ArrowLeft />목록</Link>
      </Button>

      <h1 className="text-2xl font-bold leading-snug tracking-tight">{post.title}</h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><User className="size-3.5" />{post.author}</span>
        <span>{formatDate(post.created_at)}</span>
        <span className="flex items-center gap-1"><Eye className="size-3.5" />{post.views}</span>
      </div>

      <Separator />

      <div className="min-h-48 whitespace-pre-wrap text-sm leading-7 text-foreground">
        {post.content}
      </div>

      <Separator />

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/posts/${id}/edit`}><Pencil />수정</Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={deleting}>
              <Trash2 />삭제
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>게시글을 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>삭제된 게시글은 복구할 수 없습니다.</AlertDialogDescription>
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
