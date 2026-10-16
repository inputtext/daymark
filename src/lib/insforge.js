import { createClient } from '@insforge/sdk'

export const INSFORGE_CONFIGURED = Boolean(
  import.meta.env.VITE_INSFORGE_URL && import.meta.env.VITE_INSFORGE_ANON_KEY,
)

// The anon key is explicitly public; never put the full-access API key in a VITE_ variable.
export const insforge = INSFORGE_CONFIGURED
  ? createClient({
      baseUrl: import.meta.env.VITE_INSFORGE_URL,
      anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
    })
  : null
