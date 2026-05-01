import { createBeam } from '@/beam'

// Singleton — one Beam per browser tab. The public key (pk_prod_*) is
// safe to embed; access rules on the SemiLayer side gate what it can do.
//
// The service URL is overridable for local dogfooding against
// http://localhost:3001 — leave it unset in prod and it defaults to the
// hosted API.

const apiKey = import.meta.env.NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY as string | undefined
const baseUrl =
  (import.meta.env.NEXT_PUBLIC_SEMILAYER_SERVICE_URL as string | undefined) ??
  'https://api.semilayer.com'

if (!apiKey) {
  // Surfacing this loudly beats a confusing 401 later.
  console.warn(
    'NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY is unset. Searches will fail until you ' +
      'put a pk_* key in .env at the repo root.',
  )
}

export const beam = createBeam({
  apiKey: apiKey ?? '',
  baseUrl,
})
