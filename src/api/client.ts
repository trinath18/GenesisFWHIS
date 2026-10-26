const TOKEN_KEY = 'genesis.token'

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler = () => {}
export const setUnauthorizedHandler = (h: UnauthorizedHandler) => { onUnauthorized = h }

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = tokenStore.get()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const res = await fetch(path, { ...init, headers })
  if (res.status === 401 && token) onUnauthorized()
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error ?? body?.title ?? `Request failed (${res.status})`)
  }
  return res
}

export const api = {
  get: async <T>(path: string) => (await send(path)).json() as Promise<T>,
  post: async <T>(path: string, body: unknown) =>
    (await send(path, { method: 'POST', body: JSON.stringify(body) })).json() as Promise<T>,
  put: async <T>(path: string, body: unknown) =>
    (await send(path, { method: 'PUT', body: JSON.stringify(body) })).json() as Promise<T>,
  delete: async <T>(path: string) => (await send(path, { method: 'DELETE' })).json() as Promise<T>,
  blob: async (path: string) => (await send(path)).blob(),
}


