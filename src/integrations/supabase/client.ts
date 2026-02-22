// This is a temporary structural mock of Supabase to allow the dev server to compile
// Since the package @supabase/supabase-js was removed, this mock provides empty functions
// until the remaining ~15 components are refactored to use standard Axios / apis.

export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({ data: { user: null }, error: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        order: () => ({ limit: async () => ({ data: [], error: null }) })
      }),
      order: () => ({ limit: async () => ({ data: [], error: null }) }),
      or: () => ({ limit: async () => ({ data: [], error: null }) })
    }),
    insert: async () => ({ data: null, error: null, select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
    delete: () => ({ eq: async () => ({ data: null, error: null }) }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    })
  },
  channel: () => ({
    on: () => ({ subscribe: () => { } }),
  }),
  removeChannel: () => { },
};