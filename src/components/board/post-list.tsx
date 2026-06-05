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
import { Search } from "lucide-react"

export function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    setPosts(getPosts())
  }, [])

  const filtered = query.trim()
    ? posts.filter(
        (p) =>
          p.title.includes(query) ||
          p.author.includes(query)
      )
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
        {query && (
          <Badge variant="outline">검색결과 {filtered.length}개</Badge>
        )}
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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                  {query ? "검색 결과가 없습니다." : "아직 게시글이 없습니다. 첫 글을 작성해보세요!"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post, i) => (
                <TableRow key={post.id} className="hover:bg-muted/40">
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {posts.length - posts.indexOf(post)}
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
                    {formatDate(post.createdAt)}
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
