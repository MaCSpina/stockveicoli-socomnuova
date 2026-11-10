// Conferma solo dopo getComputeSection. Per offerte esistenti, chiede conferma
// esclusivamente quando i dati contrattuali sono cambiati.
(() => {
  if (window.__dealupConfirmInstalled) return;
  window.__dealupConfirmInstalled = true;
  const handled = new Map();
  const queue = [];
  let active = false;

  // Esclude solo metadati volatili non contrattuali. Gli altri dati vengono confrontati.
  const volatile = /^(?:capturedAt|generatedAt|lastUpdated|lastAccessed|timestamp|requestId|correlationId|sessionId)$/i;
  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        if (!volatile.test(key)) out[key] = stable(value[key]);
      }
      return out;
    }
    return value;
  }
  const signature = data => JSON.stringify(stable(data));

  window.addEventListener('message', e => {
    if (e.source !== window || e.origin !== location.origin || e.data?.channel !== 'DEALUP_CONFIRM_READY') return;
    const data = e.data.data;
    const id = data?.welcome?.numeroOfferta;
    if (!id || !data.detailsPrintList) return;
    const sig = signature(data);
    if (handled.get(id) === sig) return;
    handled.set(id, sig);
    queue.push({data, id, sig});
    next();
  });

  async function next() {
    if (active || !queue.length) return;
    active = true;
    const {data, id, sig} = queue.shift();
    let root;
    try {
      const {offers=[]} = await chrome.storage.local.get('offers');
      const previous = offers.find(x => x.id === id);
      const changed = !!previous && signature(previous.data) !== sig;
      if (previous && !changed) return;

      root = document.createElement('div');
      root.dataset.dealupConfirm = '1';
      root.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;width:min(380px,calc(100vw - 36px));background:#fff;color:#1a2b40;border:1px solid #b8c9dc;border-radius:12px;box-shadow:0 8px 36px #0004;padding:18px;font:14px Arial,sans-serif';
      const heading = document.createElement('div');
      heading.style.cssText = 'font-weight:700;font-size:17px;margin-bottom:9px';
      heading.textContent = changed ? 'Offerta modificata' : 'Preparare il contratto?';
      root.append(heading);
      const desc = document.createElement('div');
      desc.style.cssText = 'line-height:1.5;overflow-wrap:anywhere;margin-bottom:14px;white-space:pre-line';
      desc.textContent = changed
        ? `Sono state rilevate modifiche all'offerta ${id}. Vuoi aggiornare i dati del contratto?\n${data.welcome.modello || ''}`
        : `Offerta ${id} — ${data.welcome.modello || ''}\n${data.welcome.contatto?.nome || ''}`;
      root.append(desc);
      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex;gap:9px;justify-content:flex-end';
      root.append(bar);
      function btn(t, primary) {
        const b = document.createElement('button');
        b.textContent = t;
        b.style.cssText = `border:0;border-radius:6px;padding:10px 12px;cursor:pointer;background:${primary ? '#15549a' : '#e7ecf2'};color:${primary ? 'white' : '#1a2b40'};font-weight:600`;
        bar.append(b);
        return b;
      }
      const no = btn(changed ? 'Mantieni precedente' : 'Non ora', false);
      const yes = btn(changed ? 'Aggiorna contratto' : 'Prepara contratto', true);
      const note = document.createElement('div');
      note.style.cssText = 'font-size:12px;margin-top:10px;color:#a22';
      root.append(note);
      document.documentElement.append(root);
      no.onclick = () => {
        // Il rinvio vale solo per questa acquisizione, non per le stampe future.
        if (handled.get(id) === sig) handled.delete(id);
        root.remove(); active = false; next();
      };
      yes.onclick = async () => {
        no.disabled = yes.disabled = true;
        try {
          const r = await chrome.runtime.sendMessage({type: changed ? 'UPDATE_OFFER' : 'CONFIRM_OFFER', data});
          if (!r || r.error) throw Error(r?.error || 'Nessuna risposta dall’estensione');
          root.remove(); active = false; next();
        } catch (e) {
          note.textContent = String(e);
          no.disabled = yes.disabled = false;
        }
      };
    } catch (e) {
      console.warn('DealUp: conferma non disponibile', e);
    } finally {
      if (!root || !root.isConnected) {
        active = false;
        if (queue.length) next();
      }
    }
  }
})();
