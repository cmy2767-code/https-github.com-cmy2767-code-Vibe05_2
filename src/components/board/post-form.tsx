"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPost, updatePost, type Post } from "@/lib/posts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LoaderCircle } from "lucide-react"

interface PostFormProps {
  mode: "create" | "edit"
  post?: Post
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  )
}

export function PostForm({ mode, post }: PostFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(post?.title ?? "")
  const [author, setAuthor] = useState(post?.author ?? "")
  const [content, setContent] = useState(post?.content ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "제목을 입력해주세요."
    if (!author.trim()) e.author = "작성자를 입력해주세요."
    if (!content.trim()) e.content = "내용을 입력해주세요."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      if (mode === "create") {
        await createPost({ title: title.trim(), author: author.trim(), content: content.trim() })
        router.push("/")
      } else if (post) {
        await updatePost(post.id, { title: title.trim(), author: author.trim(), content: content.trim() })
        router.push(`/posts/${post.id}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-1.5">
          <FieldLabel htmlFor="title">제목</FieldLabel>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            disabled={submitting}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="author">작성자</FieldLabel>
          <Input
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="이름을 입력하세요"
            disabled={submitting}
          />
          {errors.author && <p className="text-xs text-destructive">{errors.author}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="content">내용</FieldLabel>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          rows={14}
          className="resize-none"
          disabled={submitting}
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <LoaderCircle className="animate-spin" />}
          {mode === "create" ? "등록" : "저장"}
        </Button>
      </div>
    </form>
  )
}
