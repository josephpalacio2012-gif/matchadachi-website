import site from '../config/site.json'

/**
 * Anonymous event tracking. Sends only the event name and quiz outcome
 * (persona, product). No names, contacts or device IDs are collected.
 * Turned off until a Umami Website ID is set in src/config/site.json.
 */
declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string>) => void }
  }
}

let loaded = false

export function initTracking() {
  if (loaded || !site.umamiWebsiteId) return
  loaded = true
  const s = document.createElement('script')
  s.defer = true
  s.src = site.umamiScriptUrl
  s.dataset.websiteId = site.umamiWebsiteId
  document.head.appendChild(s)
}

export type TrackEvent =
  | 'quiz_start'
  | 'quiz_complete'
  | 'show_barista_click'
  | 'try_another_click'
  | 'retake_click'

export function track(event: TrackEvent, data?: Record<string, string>) {
  try {
    window.umami?.track(event, data)
  } catch {
    /* tracking must never break the quiz */
  }
  if (import.meta.env.DEV) console.debug('[track]', event, data ?? {})
}
