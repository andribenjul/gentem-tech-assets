"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export function useAuth() {
  const supabase = createClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) return null
      return data.user
    },
    staleTime: 1000 * 60 * 5,
  })

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  }
}

export function useSignOut() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return async () => {
    await supabase.auth.signOut()
    queryClient.invalidateQueries({ queryKey: ["auth", "user"] })
  }
}