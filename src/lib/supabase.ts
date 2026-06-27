import { createClient } from "@supabase/supabase-js"

// NEXT_PUBLIC_ 없이 서버 전용으로 유지 — 브라우저 번들에 포함되지 않음
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
