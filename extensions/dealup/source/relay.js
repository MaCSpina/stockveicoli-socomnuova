// Eseguito in ISOLATED world. Inoltra solo acquisizioni della scheda autorizzata.
(() => {
  if (window.__dealupRelayInstalled) return;
  window.__dealupRelayInstalled = true;
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const msg = event.data;
    if (msg?.channel !== 'DEALUP_CAPTURE_V1' || !msg.data?.welcome?.numeroOfferta) return;
    window.postMessage({channel:'DEALUP_CONFIRM_READY',data:msg.data},location.origin);
  });
})();
