"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDate, getPosts, type Post } from "@/lib/posts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, LoaderCircle } from "lucide-react"

export function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setError("게시글을 불러오지 못했습니다."))
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? posts.filter((p) => p.title.includes(query) || p.author.includes(query))
    : posts

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="제목 또는 작성자 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">전체 {posts.length}개</Badge>
        {query && <Badge variant="outline">검색결과 {filtered.length}개</Badge>}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16 text-center">번호</TableHead>
              <TableHead>제목</TableHead>
              <TableHead className="w-24 text-center">작성자</TableHead>
              <TableHead className="w-28 text-center">날짜</TableHead>
              <TableHead className="w-16 text-center">조회</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                  <LoaderCircle className="mx-auto mb-2 size-5 animate-spin" />
                  불러오는 중...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center text-sm text-destructive">
                  {error}
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                  {query ? "검색 결과가 없습니다." : "아직 게시글이 없습니다. 첫 글을 작성해보세요!"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post) => (
                <TableRow key={post.id} className="hover:bg-muted/40">
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {posts.indexOf(post) + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/posts/${post.id}`}
                      className="font-medium text-foreground hover:underline hover:underline-offset-4"
                    >
                      {post.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {post.author}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {formatDate(post.created_at)}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {post.views}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
