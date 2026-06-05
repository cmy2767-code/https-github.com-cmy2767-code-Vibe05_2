export interface Post {
  id: string
  title: string
  content: string
  author: string
  createdAt: number
  views: number
}

const STORAGE_KEY = "demoboard_posts"

const SEED_POSTS: Post[] = [
  {
    id: "1",
    title: "DemoBoard에 오신 것을 환영합니다!",
    content: "안녕하세요. 이 게시판은 Next.js + TypeScript + shadcn으로 제작된 데모 게시판입니다.\n\n자유롭게 글을 작성하고 수정하며 삭제해보세요.",
    author: "관리자",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    views: 128,
  },
  {
    id: "2",
    title: "게시판 이용 안내",
    content: "1. 글쓰기 버튼을 눌러 새 글을 작성할 수 있습니다.\n2. 제목을 클릭하면 상세 내용을 볼 수 있습니다.\n3. 상세 페이지에서 수정 및 삭제가 가능합니다.\n4. 작성된 글은 브라우저에 저장되어 새로고침 후에도 유지됩니다.",
    author: "관리자",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    views: 87,
  },
  {
    id: "3",
    title: "Next.js App Router 사용 후기",
    content: "App Router를 사용해보니 서버 컴포넌트와 클라이언트 컴포넌트를 명확하게 분리할 수 있어서 좋았습니다.\n\n특히 layouts.tsx를 활용한 공통 레이아웃 관리가 매우 편리했습니다.",
    author: "홍길동",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    views: 42,
  },
  {
    id: "4",
    title: "shadcn/ui 컴포넌트 라이브러리 추천",
    content: "shadcn/ui는 Radix UI를 기반으로 한 컴포넌트 라이브러리로, Tailwind CSS와 함께 사용하기 매우 좋습니다.\n\n컴포넌트를 직접 복사해서 사용하기 때문에 커스터마이징이 자유롭습니다.",
    author: "김철수",
    createdAt: Date.now() - 1000 * 60 * 30,
    views: 19,
  },
]

export function getPosts(): Post[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Post[]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSTS))
    return SEED_POSTS
  } catch {
    return []
  }
}

export function getPost(id: string): Post | undefined {
  return getPosts().find((p) => p.id === id)
}

export function createPost(data: Omit<Post, "id" | "createdAt" | "views">): Post {
  const posts = getPosts()
  const post: Post = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    views: 0,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([post, ...posts]))
  return post
}

export function updatePost(id: string, data: Partial<Pick<Post, "title" | "content" | "author">>): Post | undefined {
  const posts = getPosts()
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) return undefined
  posts[index] = { ...posts[index], ...data }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
  return posts[index]
}

export function deletePost(id: string): void {
  const posts = getPosts().filter((p) => p.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export function incrementViews(id: string): void {
  const posts = getPosts()
  const index = posts.findIndex((p) => p.id === id)
  if (index === -1) return
  posts[index].views += 1
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}
