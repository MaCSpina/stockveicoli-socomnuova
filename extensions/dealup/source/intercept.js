
 // Eseguito nel contesto MAIN della scheda DealUp; nessun debugger.
(() => {
  if (window.__dealupInterceptInstalled) return;
  Object.defineProperty(window, '__dealupInterceptInstalled', {value:true});

  const target = 'getComputeSection';

  // VAN come testo: conserva gli zeri iniziali.
  const readVan = () => {
    for (const el of document.querySelectorAll(
      'app-label.recap-right ion-text.body-s-strong'
    )) {
      const value = (
        el.getAttribute('title') || el.textContent || ''
      ).trim();

      if (/^\d{10}$/.test(value)) return value;
    }
    return '';
  };

  const waitForVan = (timeoutMs = 4000) => new Promise(resolve => {
    const current = readVan();
    if (current) {
      resolve(current);
      return;
    }

    const started = Date.now();
    const timer = setInterval(() => {
      const van = readVan();

      if (van || Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        resolve(van);
      }
    }, 150);
  });

  const publish = async (url, body) => {
    if (!String(url || '').includes(target) || typeof body !== 'string') return;

    try {
      const data = JSON.parse(body);
      if (!data || typeof data !== 'object' || !data.welcome?.numeroOfferta) return;

      data.van = await waitForVan();

      window.postMessage({
        channel: 'DEALUP_CAPTURE_V1',
        data
      }, window.location.origin);

    } catch (_) {
      // Risposta JSON non valida
    }
  };

  const originalFetch = window.fetch;

  if (typeof originalFetch === 'function') {
    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      const result = originalFetch.apply(this, args);

      if (String(url || '').includes(target)) {
        result.then(response => {
          if (response.ok) {
            response.clone().text()
              .then(body => publish(url, body))
              .catch(() => {});
          }
        }).catch(() => {});
      }
      return result;
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this.__dealupUrl = String(url || '');
    return originalOpen.call(this, method, url, ...args);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (this.__dealupUrl?.includes(target)) {
      this.addEventListener('load', () => {
        if (this.status !== 200) return;

        try {
          if (this.responseType === '' || this.responseType === 'text') {
            publish(this.__dealupUrl, this.responseText);
          } else if (this.responseType === 'json' && this.response) {
            publish(this.__dealupUrl, JSON.stringify(this.response));
          }
        } catch (_) {}
      }, {once:true});
    }

    return originalSend.apply(this, args);
  };
})();
