const MAX_OFFERS = 200;
const safeFile = s => String(s || 'SENZA_NUMERO').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/\s+/g,'_').slice(0,90);
let lastMessage = 'Acquisizione automatica attiva. Apri un’offerta DealUp.';
let saving = Promise.resolve();

async function saveOffer(data, resetStatus = false) {
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const numero = safeFile(data.welcome.numeroOfferta);
  const modello = safeFile(data.welcome.modello);
  const entry = {
    id:data.welcome.numeroOfferta, numero:data.welcome.numeroOfferta,
    modello:data.welcome.modello || '', cliente:data.welcome.contatto?.nome || '',
    capturedAt:new Date().toISOString(), status:'pending', data
  };
  const {offers=[]} = await chrome.storage.local.get('offers');
  const old = offers.find(x=>x.id===entry.id);
  if(old && !resetStatus) {entry.status=old.status||'pending'; entry.generatedAt=old.generatedAt||null;}
  await chrome.storage.local.set({offers:[entry,...offers.filter(x=>x.id!==entry.id)].slice(0,MAX_OFFERS)});
  const {downloadEnabled=false} = await chrome.storage.local.get('downloadEnabled');
  if (!downloadEnabled) {lastMessage=`Pronta per il contratto: ${numero} — ${modello}`;return;}
  const json=JSON.stringify(data,null,2);
  const bytes=new TextEncoder().encode(json);
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const dataUrl='data:application/json;charset=utf-8;base64,'+btoa(binary);
  try {await chrome.downloads.download({url:dataUrl,filename:`DealUp_Offerte/${numero}_${modello}_${stamp}.json`,saveAs:false,conflictAction:'uniquify'});lastMessage=`Pronta e scaricata: ${numero}`;}
  catch(e){lastMessage=`Pronta ${numero}, download fallito: ${e.message}`;}
}
chrome.runtime.onMessage.addListener((msg,sender,reply) => {
  (async () => {
    if (msg.type === 'LIST_OFFERS') {
      const {offers=[]} = await chrome.storage.local.get('offers');
      return {offers:offers.map(({data,...meta})=>meta)};
    }
    if (msg.type === 'GET_OFFER') {
      const {offers=[]} = await chrome.storage.local.get('offers');
      const found = offers.find(x=>x.id===msg.id);
      return found ? {offer:found} : {error:'Offerta non trovata'};
    }
    if (msg.type === 'MARK_GENERATED') {
      if (!sender.url?.startsWith('https://stockveicoli.socomnuova.com/') && !sender.url?.startsWith('http://127.0.0.1:') && !sender.url?.startsWith('http://localhost:')) throw Error('Portale non autorizzato: '+(sender.url||'URL assente'));
      const {offers=[]}=await chrome.storage.local.get('offers');
      const item=offers.find(x=>x.id===msg.id);
      if(!item)return {error:'Offerta non presente nell’archivio locale'};
      item.status='generated';item.generatedAt=new Date().toISOString();
      await chrome.storage.local.set({offers});
      return {ok:true};
    }
    if (msg.type === 'DECLINE_OFFER') {
      if (!sender.url?.startsWith('https://cpq.ivecogroup.com/')) throw Error('Sito non autorizzato');
      const {declinedOffers={}}=await chrome.storage.local.get('declinedOffers');
      declinedOffers[msg.id]=new Date().toISOString();
      await chrome.storage.local.set({declinedOffers});return {ok:true};
    }
    if (msg.type === 'CONFIRM_OFFER' || msg.type === 'UPDATE_OFFER') {
      if (!sender.url?.startsWith('https://cpq.ivecogroup.com/') || !msg.data?.welcome?.numeroOfferta)throw Error('Offerta non valida');
      const update = msg.type === 'UPDATE_OFFER';
      saving=saving.catch(()=>{}).then(async()=>{
        const {offers=[]}=await chrome.storage.local.get('offers');
        const exists=offers.some(x=>x.id===msg.data.welcome.numeroOfferta);
        if(update && !exists)throw Error('Offerta precedente non trovata');
        if(!update && exists)throw Error('Offerta già presente: aggiorna la pagina DealUp');
        await saveOffer(msg.data,update);
      });
      await saving;
      return {ok:true,message:lastMessage};
    }
    if (msg.type === 'STATUS') {
      const {downloadEnabled=false} = await chrome.storage.local.get('downloadEnabled');
      return {message:lastMessage,downloadEnabled};
    }
    if (msg.type === 'SET_DOWNLOAD') {
      if (typeof msg.enabled !== 'boolean' || !sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('Comando non autorizzato');
      await chrome.storage.local.set({downloadEnabled:msg.enabled});
      return {message:msg.enabled?'Download JSON attivato':'Download JSON disattivato',downloadEnabled:msg.enabled};
    }
    if (msg.type === 'CAPTURE_OFFER') {
      if (!sender.tab?.id || !sender.url?.startsWith('https://cpq.ivecogroup.com/') || !msg.data?.welcome?.numeroOfferta) throw new Error('Dati non validi');
      return {message:'Acquisita; in attesa della scelta dell’agente'};
    }
    if (msg.type === 'START') {
      const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
      if (!tab?.id || !tab.url?.startsWith('https://cpq.ivecogroup.com/')) throw new Error('Apri prima la scheda DealUp');
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:['relay.js'],world:'ISOLATED'});
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:['intercept.js'],world:'MAIN'});
      lastMessage = 'Acquisizione attiva sulla scheda. Apri o ricalcola un’offerta.';
      return {message:lastMessage};
    }
    return {message:'Comando sconosciuto'};
  })().then(reply).catch(e=>reply({error:e.message,message:'ERRORE: '+e.message}));
  return true;
});
