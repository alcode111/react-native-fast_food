import { supabase } from '@/lib/supabase'
import { Profile } from '@/type'
import { create } from 'zustand'

type AuthState = {
    isAuthenticated: boolean
    user: Profile | null
    isLoading: boolean

    setIsAuthenticated: (value: boolean) => void
    setUser: (user: Profile | null) => void
    setLoading: (loading: boolean) => void

    fetchAuthenticatedUser: () => Promise<void>
}

const useAuthStore = create<AuthState>((set) => ({
    isAuthenticated: false,
    user: null,
    isLoading: true,

    setIsAuthenticated: (value) => set({ isAuthenticated: value }),
    setUser: (user) => set({ user }),
    setLoading: (value) => set({ isLoading: value }),

    fetchAuthenticatedUser: async () => {
        set({ isLoading: true })

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            if (sessionError) throw sessionError
            if (!session) {
                set({ isAuthenticated: false, user: null })
                return
            }

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("id, name, avatar, created_at")
                .eq("id", session.user.id)
                .single()

            if (profileError) throw profileError

            set({
                isAuthenticated: true,
                user: profile
            })
        } catch (error) {
            console.log("fetchAuthenticatedUser error", error)
            set({ isAuthenticated: false, user: null })
        } finally {
            set({ isLoading: false })
        }
    }
}))

export default useAuthStore
