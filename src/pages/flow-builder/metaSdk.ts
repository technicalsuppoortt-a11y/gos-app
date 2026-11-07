export type MetaConfig = { app_id: string | null; graph_version: string; login_config_id: string | null; whatsapp_config_id: string | null; ready: boolean; channels: Record<'messenger' | 'instagram' | 'whatsapp', boolean>; webhook_url: string; verify_token: string | null }

/**
 * Runs Meta's connect window, which lives on our API's domain so white-label domains need no
 * setup in Meta. Pass the window opened during the click, or browsers block it. Resolves with a
 * one-time claim. Tokens never reach the browser.
 */
export function metaConnectWindow(popup: Window, url: string): Promise<string> {
  popup.location.href = url
  return new Promise((resolve, reject) => {
    const finish = (error: string | null, claim?: string) => {
      window.removeEventListener('message', onMessage)
      clearInterval(timer)
      if (error || !claim) reject(new Error(error ?? 'Facebook did not finish connecting. Please try again.'))
      else resolve(claim)
    }
    const onMessage = (e: MessageEvent) => {
      if (e.source !== popup || e.data?.type !== 'meta-connect') return
      finish(e.data.ok === true ? null : 'Facebook did not finish connecting. Please try again.', e.data.claim)
    }
    const timer = setInterval(() => {
      if (popup.closed) finish('The Facebook window was closed before finishing.')
    }, 500)
    window.addEventListener('message', onMessage)
  })
}
