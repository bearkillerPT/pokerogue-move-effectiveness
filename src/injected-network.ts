import type { SavedSession } from './types';

const TAG = '[PME injected-net]';

export function setupNetworkHooks(onSession: (s: SavedSession | null) => void): void {
  // Intercept fetch
  try {
    const origFetch = window.fetch.bind(window);
    const newFetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const response = await origFetch(...args);
      try {
        const url = response && response.url ? response.url : '';
        if (
          url.includes('api.pokerogue.net/savedata/session') ||
          url.includes('api.pokerogue.net/savedata/update') ||
          url.includes('api.pokerogue.net/savedata/updateall')
        ) {
          response.clone().json().then((data: any) => {
            const hasSession = data && typeof data === 'object' && 'session' in data;
            const session = hasSession ? (data as any & { session?: any }).session ?? (data as any) : (data as any);
            try {
              onSession(session as SavedSession | null);
            } catch (e) {
              console.error(`${TAG} onSession error`, e);
            }
          }).catch(() => { /* ignore non-json responses */ });
        }
      } catch (e) {
        // ignore
      }
      return response;
    };

    Object.defineProperty(window, 'fetch', { value: newFetch, configurable: true, writable: true });
  } catch (e) {
    console.warn(`${TAG} could not override fetch`, e);
  }

  // Intercept XHR
  try {
    const XHRProto = XMLHttpRequest.prototype as any;
    const origOpen = XHRProto.open as (this: XMLHttpRequest, method: string, url: string, async?: boolean, user?: string | null, password?: string | null) => void;
    const origSend = XHRProto.send as (this: XMLHttpRequest, body?: Document | BodyInit | null) => void;

    XHRProto.open = function (this: XMLHttpRequest, method: string, url: string, async?: boolean, user?: string | null, password?: string | null) {
      try {
        (this as any)._pme_url = url;
      } catch (e) {
        // noop
      }
      return origOpen.call(this, method, url, async, user, password);
    };

    XHRProto.send = function (this: XMLHttpRequest, body?: Document | BodyInit | null) {
      try {
        this.addEventListener('load', function (this: XMLHttpRequest) {
          try {
            const u = (this as any)._pme_url || this.responseURL || '';
            if (
              u &&
              (u.includes('api.pokerogue.net/savedata/session') || u.includes('api.pokerogue.net/savedata/update') || u.includes('api.pokerogue.net/savedata/updateall'))
            ) {
              try {
                const data = JSON.parse(this.responseText || '{}') as any;
                console.log(data)
                const hasSession = data && typeof data === 'object' && 'session' in data;
                const session = hasSession ? (data as any & { session?: any }).session ?? (data as any) : (data as any);
                onSession(session as SavedSession | null);
              } catch (e) {
                // ignore parse errors
              }
            }
          } catch (e) {
            // swallow
          }
        });
      } catch (e) {
        // noop
      }
      return origSend.call(this, body);
    };
  } catch (e) {
    console.warn(`${TAG} could not override XHR`, e);
  }
}
