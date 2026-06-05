import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PenLine } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          DemoBoard
        </Link>
        <Button asChild size="sm">
          <Link href="/posts/new">
            <PenLine />
            글쓰기
          </Link>
        </Button>
      </div>
    </header>
  )
}
