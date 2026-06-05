import { supabase } from "./supabase"

export interface Post {
  id: string
  title: string
  content: string
  author: string
  created_at: string
  views: number
}

export async function getPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single()

  if (error) return null
  return data
}

export async function createPost(
  input: Pick<Post, "title" | "content" | "author">
): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePost(
  id: string,
  input: Partial<Pick<Post, "title" | "content" | "author">>
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) return null
  return data
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", id)
  if (error) throw error
}

export async function incrementViews(id: string): Promise<void> {
  await supabase.rpc("increment_views", { post_id: id })
}

export function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}
