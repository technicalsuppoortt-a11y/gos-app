import { useEffect, useState } from 'react'
import { api, type Channel, type MetaPage } from './api'
import { metaConnectWindow, type MetaConfig } from './metaSdk'

type MetaChannel = 'messenger' | 'instagram' | 'whatsapp'

const CARDS: { id: MetaChannel; title: string; icon: string; text: string; button: string }[] = [
  { id: 'messenger', title: 'Facebook Messenger', icon: 'm', text: 'Reply to messages sent to your Facebook Page.', button: 'Connect Facebook' },
  { id: 'instagram', title: 'Instagram', icon: 'ig', text: 'Reply to Instagram DMs. The account must be a professional account linked to a Facebook Page.', button: 'Connect Instagram' },
  { id: 'whatsapp', title: 'WhatsApp', icon: 'wa', text: 'Reply on your WhatsApp Business number.', button: 'Connect WhatsApp' },
]

const EMPTY_MANUAL = { external_id: '', access_token: '', app_secret: '' }

/**
 * One click per channel, like ManyChat: Meta's popup → (pick a Page) → done.
 * These are the same channels the AI replies on; live flows answer first, the AI answers the rest.
 */
export function Channels() {
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [config, setConfig] = useState<MetaConfig | null>(null)
  const [picking, setPicking] = useState<{ channel: 'messenger' | 'instagram'; pages: MetaPage[] } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState<typeof EMPTY_MANUAL | null>(null)

  useEffect(() => {
    api.channels().then(setChannels).catch(e => setError(e.message))
    api.metaConfig().then(setConfig).catch(e => setError(e.message))
  }, [])

  const update = (c?: Channel) => {
    if (!c) { api.channels().then(setChannels).catch(e => setError(e.message)); return }
    setChannels(list => list?.map(x => (x.channel === c.channel ? c : x)) ?? [c])
  }
  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key); setError(null)
    try { await task() } catch (e) { setError((e as Error).message) }
    setBusy(null)
  }

  const connect = (channel: MetaChannel) => run(channel, async () => {
    if (!config?.channels[channel]) throw new Error('This channel is not available yet. Please contact your provider.')
    const popup = window.open('about:blank', 'meta-connect', 'width=640,height=760')
    if (!popup) throw new Error('Your browser blocked the Facebook window. Allow popups, then try again.')
    let claim: string
    try {
      claim = await metaConnectWindow(popup, await api.metaLoginUrl(channel))
    } catch (e) {
      popup.close()
      throw e
    }
    const result = await api.metaClaim(claim)
    if (result.channel) { update(result.channel); return }
    if (channel === 'whatsapp') return
    const pages = result.pages ?? []
    setPicking({ channel, pages: channel === 'instagram' ? pages.filter(p => p.instagram) : pages })
  })

  const connectManual = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manual) return
    run('whatsapp', async () => {
      update(await api.whatsappManual(manual))
      setManual(null)
    })
  }

  const pick = (page: MetaPage) => picking && run(page.id, async () => {
    update(await api.metaConnect(picking.channel, page.id))
    setPicking(null)
  })

  const disconnect = (c: Channel, title: string) => {
    if (!confirm(`Disconnect ${c.name ?? title}? Automations and the AI will stop replying there.`)) return
    run(c.channel, async () => update(await api.disconnect(c.channel)))
  }

  return (
    <main className="fb-list-page">
      <h1>Channels</h1>
      {error && <p className="fb-error" role="alert">{error}</p>}

      {CARDS.map(card => {
        const c = channels?.find(x => x.channel === card.id)
        const connected = c?.status === 'connected'
        return (
          <section key={card.id} className="fb-channel" aria-labelledby={`ch-${card.id}`}>
            <div className="fb-channel-head">
              <span className="fb-channel-icon" aria-hidden="true">{card.icon}</span>
              <div>
                <h2 id={`ch-${card.id}`}>{card.title}</h2>
                <p className="fb-muted">{card.text}</p>
              </div>
              {connected
                ? <button type="button" className="fb-btn fb-btn-ghost" onClick={() => disconnect(c!, card.title)} disabled={busy !== null}>{busy === card.id ? 'Disconnecting…' : 'Disconnect'}</button>
                : <button type="button" className="fb-btn fb-btn-primary" onClick={() => connect(card.id)} disabled={busy !== null || channels === null}>{busy === card.id ? 'Opening Meta…' : card.button}</button>}
            </div>

            {card.id === 'whatsapp' && !connected && !manual && (
              <button type="button" className="fb-btn fb-btn-ghost fb-self-start" onClick={() => setManual(EMPTY_MANUAL)}>Use my own Meta app instead</button>
            )}

            {card.id === 'whatsapp' && !connected && manual && (
              <form className="fb-channel-block fb-manual" onSubmit={connectManual}>
                <h3>Connect with your own Meta app</h3>
                <p className="fb-muted">First add this webhook to your app in Meta, and subscribe to the messages field.</p>
                <label className="fb-field">Callback URL<input readOnly value={config?.webhook_url ?? ''} /></label>
                <label className="fb-field">Verify token<input readOnly value={config?.verify_token ?? ''} /></label>
                <label className="fb-field">Phone number ID<input required inputMode="numeric" value={manual.external_id} onChange={e => setManual({ ...manual, external_id: e.target.value })} /></label>
                <label className="fb-field">Permanent access token<input required type="password" autoComplete="off" value={manual.access_token} onChange={e => setManual({ ...manual, access_token: e.target.value })} /></label>
                <label className="fb-field">App Secret<input required type="password" autoComplete="off" value={manual.app_secret} onChange={e => setManual({ ...manual, app_secret: e.target.value })} /></label>
                <div className="fb-create">
                  <button type="submit" className="fb-btn fb-btn-primary" disabled={busy !== null}>{busy === 'whatsapp' ? 'Connecting…' : 'Connect'}</button>
                  <button type="button" className="fb-btn fb-btn-ghost" onClick={() => setManual(null)}>Cancel</button>
                </div>
              </form>
            )}

            {connected && (
              <ul className="fb-page-list">
                <li className="fb-page-row">
                  <span className="fb-page-avatar" aria-hidden="true">{(c!.name ?? card.title)[0]}</span>
                  <span dir="auto">{c!.name ?? c!.external_id}</span>
                  <span className="fb-badge badge-live">CONNECTED</span>
                </li>
              </ul>
            )}

            {picking?.channel === card.id && (
              <div className="fb-channel-block">
                <h3>{card.id === 'instagram' ? 'Choose an Instagram account' : 'Choose a page'}</h3>
                {picking.pages.length === 0 && (
                  <p className="fb-muted">
                    {card.id === 'instagram'
                      ? 'No Instagram account found. Link a professional Instagram account to your Facebook Page, then allow it in the Meta window.'
                      : 'No pages found. You need to manage the page, and allow it in the Meta window.'}
                  </p>
                )}
                <ul className="fb-page-list">
                  {picking.pages.map(p => (
                    <li key={p.id} className="fb-page-row">
                      <span className="fb-page-avatar" aria-hidden="true">{p.name[0]}</span>
                      <span dir="auto">{card.id === 'instagram' ? `@${p.instagram?.username} · ${p.name}` : p.name}</span>
                      <button type="button" className="fb-btn fb-btn-soft" onClick={() => pick(p)} disabled={busy !== null}>{busy === p.id ? 'Connecting…' : 'Connect'}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </main>
  )
}
