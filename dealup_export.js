/* DealUp: anteprima, esportazione locale CSV/JSON, senza invio dati al server. */
(()=>{'use strict';
const sectionItems=s=>(s?.group||[]).flatMap(g=>g.carList||[]);
const sectionValue=s=>{const v=sectionItems(s).find(x=>x.descrizioneCustom||x.valore||x.codiceUnivoco);return v?.descrizioneCustom||v?.valore||v?.codiceUnivoco||''};
const passoValue=d=>{const v=sectionItems(d.detailsPrintList?.fcp).find(x=>String(x.idCaratteristica)==='WB');return v?.descrizioneCustom||v?.valore||v?.codiceUnivoco||''};
const specs=[
 ['Napoli lì','Data contratto',d=>d.welcome?.today],
 ['Referente','Referente',d=>d.welcome?.contatto?.referente],
 ['Il cliente','Ragione sociale / cliente',d=>d.welcome?.contatto?.nome],
 ['Sede Legale','Sede legale',d=>d.welcome?.contatto?.indirizzo],
 ['Città','Città sede legale',d=>d.welcome?.contatto?.citta],
 ['CAP','CAP sede legale',d=>d.welcome?.contatto?.cap],
 ['Sede Operativa','Sede operativa',d=>d.welcome?.contatto?.indirizzoOperativo],
 ['Città_2','Città sede operativa',d=>d.welcome?.contatto?.cittaOperativa],
 ['CAP_2','CAP sede operativa',d=>d.welcome?.contatto?.capOperativo],
 ['Partita IVA','Partita IVA',d=>d.welcome?.contatto?.vatValue],
 ['Codice SDI','Codice SDI',d=>d.welcome?.contatto?.codiceSdi],
 ['Pec','PEC',d=>d.welcome?.contatto?.pec],
 ['Telefono','Telefono',d=>d.welcome?.contatto?.telefono],
 ['Cellulare','Cellulare',d=>d.welcome?.contatto?.altroTelefono],
 ['Email','Email',d=>d.welcome?.contatto?.email],
 ['Propone a SOCOM NUOVA SRL ordine per n veicoli','Quantità',d=>d.welcome?.quantita],
 ['Modello','Modello',d=>d.welcome?.modello],
 ['Passo','Passo',passoValue],
 ['Colore','Colore',d=>sectionValue(d.detailsPrintList?.colore)],
 ['Allestimento 1','Allestimento 1',()=>'',true],
 ['Allestimento 2','Allestimento 2',()=>'',true],
 ['Venditore','Venditore',d=>d.welcome?.responsabile],
 ['Dropdown6','Modalità di pagamento',()=> ''],
 ['Deposito cauzionale iva esclusa €','Deposito cauzionale (IVA esclusa)',()=> ''],
 ['Termine indicativo di consegna','Consegna indicativa',()=> ''],
 ['Ritiro usato Marca','Permuta: marca',()=> ''],
 ['Modello_2','Permuta: modello',()=> ''],
 ['Stato duso del','Permuta: stato d’uso',()=> ''],
 ['Targa','Permuta: targa',()=> ''],
 ['Telaio','Permuta: telaio',()=> ''],
 ['1 immatricolazione','Permuta: prima immatricolazione',()=> ''],
 ['Prezzo concordato permuta iva esclusa €','Permuta: prezzo concordato (IVA esclusa)',()=> '']
];
let original=null;
const sections=[
 {title:'ANAGRAFICA CLIENTE',fields:['Napoli lì','Il cliente','Referente','Sede Legale','Città','CAP','Sede Operativa','Città_2','CAP_2','Partita IVA','Codice SDI','Pec','Telefono','Cellulare','Email']},
 {title:'ORDINE VEICOLO',fields:['Propone a SOCOM NUOVA SRL ordine per n veicoli','Modello','Passo','Colore','Allestimento 1','Allestimento 2']},
 {title:'PERMUTA',fields:['Ritiro usato Marca','Modello_2','Stato duso del','Targa','Telaio','1 immatricolazione','Prezzo concordato permuta iva esclusa €']},
 {title:'REGOLAMENTO E CONSEGNA',fields:['Dropdown6','Deposito cauzionale iva esclusa €','Venditore','Termine indicativo di consegna']}
];
const spanFor=key=>{
 if(['Il cliente','Sede Legale','Sede Operativa','Allestimento 1','Allestimento 2'].includes(key))return 'span6';
 if(['Napoli lì','Referente','Modello','Colore','Ritiro usato Marca','Modello_2','Stato duso del','Targa','Telaio','1 immatricolazione','Venditore','Termine indicativo di consegna'].includes(key))return 'span3';
 if(['Propone a SOCOM NUOVA SRL ordine per n veicoli','Passo','Città','CAP','Città_2','CAP_2','Partita IVA','Codice SDI','Pec','Telefono','Cellulare','Email'].includes(key))return 'span2';
 return 'span3';
};
function init(d){
 original=d;const box=document.getElementById('editfields');box.replaceChildren();
 const byKey=new Map(specs.map(s=>[s[0],s]));
 for(const section of sections){
  const group=document.createElement('section');group.className='form-section';
  const title=document.createElement('h3');title.textContent=section.title;group.append(title);
  const grid=document.createElement('div');grid.className='form-grid';
  for(const key of section.fields){
   const spec=byKey.get(key);if(!spec)continue;
   const [,label,fn]=spec;const el=document.createElement('label');el.className=spanFor(key);el.textContent=label;
   const input=document.createElement(key==='Dropdown6'?'select':'input');input.dataset.field=key;
   if(key==='Dropdown6'){for(const value of ['', 'Contanti','Leasing (propria banca)','Leasing Iveco Capital','Altro (specificare in Note)']){const opt=document.createElement('option');opt.value=value;opt.textContent=value||'Seleziona modalità di pagamento';input.append(opt)}}else input.value=String(fn(d)??'');
   if(!input.value.trim()){if(key!=='Dropdown6')input.placeholder='Da compilare, se applicabile';input.classList.add('missing')}else input.classList.add('filled');
   input.addEventListener('input',()=>{input.classList.toggle('missing',!input.value.trim())});input.addEventListener('change',()=>input.classList.toggle('missing',!input.value.trim()));
   el.append(input);grid.append(el);
  }
  group.append(grid);box.append(group);
 }
 const group=document.createElement('section');group.className='form-section';
 const h=document.createElement('h3');h.textContent='NOTE E COMMENTI';group.append(h);
 const grid=document.createElement('div');grid.className='form-grid';
 const label=document.createElement('label');label.className='span6';label.textContent='Note aggiuntive del venditore (si sommano alle lavorazioni DealUp)';
 const t=document.createElement('textarea');t.rows=4;t.dataset.notes='1';t.placeholder='Accordi particolari, annotazioni e altre lavorazioni';label.append(t);grid.append(label);group.append(grid);box.append(group);
}
function prepared(){if(!original)throw Error('Seleziona un’offerta');const d=structuredClone(original),o={};for(const e of document.querySelectorAll('#editfields [data-field]')){if(e.value.trim())o[e.dataset.field]=e.value.trim()}d.__contractOverrides=o;d.__contractNotes=document.querySelector('#editfields [data-notes]')?.value.trim()||'';return d}
function csvEscape(v){let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function csv(rows){return '\ufeff'+rows.map(row=>row.map(csvEscape).join(';')).join('\r\n')+'\r\n'}
function flat(obj,prefix='',out={},depth=0){if(depth>18)return out;if(obj===null||typeof obj!=='object'){out[prefix]=obj??'';return out}if(Array.isArray(obj)){obj.forEach((v,i)=>flat(v,prefix+'['+i+']',out,depth+1));return out}for(const [k,v] of Object.entries(obj)){if(k==='__contractOverrides'||k==='__contractNotes')continue;flat(v,prefix?prefix+'.'+k:k,out,depth+1)}return out}

function valoreFinale(d, campo, originale) {
    const modificato = d.__contractOverrides?.[campo];
    return modificato !== undefined ? modificato : (originale ?? '');
}


function summary(d) {

    const w = d.welcome || {};
    const c = w.contatto || {};
    const p = d.pricing || {};
    const overrides = d.__contractOverrides || {};

    // Conserva lo stato delle caselle del PDF, usando la stessa regola
    // adottata dal generatore del contratto originale.
    const vehicleExtras = d.pricing?.printOutPriceCalculation?.vehicleExtras || [];
    const extraById = Object.fromEntries(
        vehicleExtras.filter(x => x && typeof x === 'object').map(x => [x.itemId, x])
    );
    function prezzoExtra(v) {
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        let str = String(v ?? '').replace(/[€\s]/g, '');
        if (str.includes(',') && str.includes('.')) {
            str = str.lastIndexOf(',') > str.lastIndexOf('.')
                ? str.replace(/\./g, '').replace(',', '.')
                : str.replace(/,/g, '');
        } else if (str.includes(',')) str = str.replace(',', '.');
        const n = Number(str);
        return Number.isFinite(n) ? n : 0;
    }
    const trasportoSpuntato = prezzoExtra(extraById.transport?.customerFinalPrice) > 0;
    const immatricolazioneSpuntata = prezzoExtra(extraById.registration?.customerFinalPrice) > 0;

    // Restituisce il valore definitivo utilizzato nel contratto.
    // Rispetta anche i campi svuotati intenzionalmente.
    function finale(campo, originale = '') {
        return Object.prototype.hasOwnProperty.call(overrides, campo)
            ? overrides[campo]
            : (originale ?? '');
    }

    const base = {

        numero_offerta: w.numeroOfferta || '',
        numero_opportunita: w.numeroOpportunita || '',
        numero_ordine: w.numeroOrdine || '',

        // ANAGRAFICA DEFINITIVA
        cliente: finale('Il cliente', c.nome),
        partita_iva: finale('Partita IVA', c.vatValue),
        indirizzo: finale('Sede Legale', c.indirizzo),
        citta: finale('Città', c.citta),
        cap: finale('CAP', c.cap),
        telefono: finale('Telefono', c.telefono),
        cellulare: finale('Cellulare', c.altroTelefono),
        email: finale('Email', c.email),

        // VEICOLO DEFINITIVO
        modello: finale('Modello', w.modello),
        van: d.van || '',
        passo: finale('Passo', passoValue(d)),
        colore: finale(
            'Colore',
            sectionValue(d.detailsPrintList?.colore)
        ),
        quantita: finale(
            'Propone a SOCOM NUOVA SRL ordine per n veicoli',
            w.quantita
        ),

        // VENDITORE E DATA DEFINITIVI
        venditore: finale('Venditore', w.responsabile),
        data_offerta: finale('Napoli lì', w.today),

        // PREZZI ORIGINALI DELL'OFFERTA
        prezzo_totale_netto: p.prezzoTotaleDaPagareNetValue ?? '',
        prezzo_totale_lordo: p.prezzoTotaleDaPagareGrossValue ?? '',

        // NOTE DEFINITIVE
        note_aggiuntive: d.__contractNotes || '',

        // 1 = casella spuntata, 0 = casella non spuntata.
        // Le colonne restano nel CSV anche quando le caselle sono vuote.
        trasporto_spuntato: trasportoSpuntato ? '1' : '0',
        immatricolazione_spuntata: immatricolazioneSpuntata ? '1' : '0'
    };

    // Conserva anche tutti i campi della maschera,
    // compresi pagamento, permuta, consegna, ecc.
    for (const [campo, valore] of Object.entries(overrides)) {
        base['contratto_' + campo] = valore;
    }

    return csv([
        Object.keys(base),
        Object.values(base)
    ]);
}

function details(d){const rows=[['numero_offerta','tipo','gruppo','codice','descrizione','prezzo_lordo','prezzo_netto','stato']];const num=d.welcome?.numeroOfferta||'';const dp=d.detailsPrintList||{};for(const group of dp.pack?.group||[])for(const x of group.carList||[])rows.push([num,'pacchetto',group.groupname||group.group||'',x.codiceUnivoco||x.codice||'',x.descrizioneCustom||x.valore||'',x.prezzoLordo||'',x.prezzoNetto||'',x.status||'']);for(const chapter of dp.fcsuserselected?.fcsCar?.capitoloList||[])for(const sub of chapter.sottoCapitoloList||[])for(const x of sub.caratteristiche||[])rows.push([num,'optional',chapter.descrizione||'',x.codiceUnivoco||x.codice||'',x.descrizioneCustom||x.valore||'',x.prezzoLordo||'',x.prezzoNetto||'',x.status||'']);for(const x of d.pricing?.otherCosts||[])rows.push([num,'lavorazione',x.name||'',x.id||'',x.descrizione||'',x.listPrice??'',x.customerFinalPrice??'',x.status||'']);if(d.__contractNotes)rows.push([num,'nota_venditore','','',d.__contractNotes,'','','']);return csv(rows)}
function full(d){const w=d.welcome||{};return JSON.stringify({schema:'dealup-contract-min-v2',exportedAt:new Date().toISOString(),numeroOfferta:w.numeroOfferta||'',numeroOpportunita:w.numeroOpportunita||'',cliente:w.contatto?.nome||'',modello:w.modello||'',van:d.van||'',venditore:w.responsabile||'',contratto:{campi:d.__contractOverrides||{},noteAggiuntive:d.__contractNotes||''}})}
function save(name,content,mime){const blob=new Blob([content],{type:mime});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),15000)}
function name(d){return String(d.welcome?.numeroOfferta||'dealup').replace(/[^a-zA-Z0-9_-]/g,'_')}
window.dealupPreviewInit=init;window.dealupPreparedOffer=prepared;

// Sessione autenticata dal Worker: nessuna chiave richiesta all'agente.
const DEALUP_UPLOAD_URL='https://dealup-upload.massy-spina.workers.dev/upload';
async function uploadArchive(d){
  const token=sessionStorage.getItem('dealupSessionToken');
  if(!token)throw Error('Sessione DealUp assente: esci e rientra dal portale');
  const payload={offerId:name(d),files:{'riepilogo.csv':summary(d),'dettaglio.csv':details(d)}};
  let response;
  try{
    response=await fetch(DEALUP_UPLOAD_URL,{
      method:'POST',mode:'cors',cache:'no-store',
      headers:{'Content-Type':'application/json;charset=utf-8','Authorization':'Bearer '+token},
      body:JSON.stringify(payload)
    });
  }catch(e){throw Error('Worker non raggiungibile: '+e.message)}
  let result;
  try{result=await response.json()}catch{throw Error('Risposta Worker non valida (HTTP '+response.status+')')}
  if(!response.ok||result?.ok!==true){
    if(response.status===401){sessionStorage.removeItem('dealupSessionToken');throw Error('Sessione scaduta: esci e rientra dal portale')}
    throw Error('Archivio GitHub non salvato: '+(result?.error||result?.errore||'HTTP '+response.status));
  }
  if(!Array.isArray(result.files)||result.files.length!==2)throw Error('Conferma GitHub incompleta');
  return result;
}

document.getElementById('bundle').onclick=async()=>{
  const b=document.getElementById('bundle');b.disabled=true;
  let d=null;
  try{
    d=prepared();
    await window.dealupCreateContract(d);
    window.dealupLog?.('Generazione PDF contratto - download avviato','OK',d);
    document.getElementById('status').textContent='PDF avviato. Invio archivio a GitHub in corso...';
    let uploaded;
    try{
      uploaded=await uploadArchive(d);
      window.dealupLog?.('Archivio CSV su GitHub confermato','OK',d);
    }catch(uploadError){
      console.error('DealUp: archiviazione fallita',uploadError);
      window.dealupLog?.('Archivio CSV su GitHub','ERRORE',d,uploadError.message);
      document.getElementById('status').textContent='PDF generato, ma archiviazione NON riuscita: '+uploadError.message+'. Riprova dal pulsante Genera contratto.';
      return;
    }
    let statoAggiornato=false;
    try{
      if(typeof window.dealupMarkGenerated!=='function')throw Error('Funzione aggiornamento stato non disponibile');
      await window.dealupMarkGenerated(d);statoAggiornato=true;
    }catch(markError){
      console.error('DealUp: archivio salvato, ma stato non aggiornato',markError);
      window.dealupLog?.('Aggiornamento stato contratto','ERRORE',d,markError.message);
    }
    document.getElementById('status').textContent='PDF scaricato; CSV archiviati (ID: '+uploaded.uploadId+'). '+(statoAggiornato?'Stato aggiornato.':'ATTENZIONE: stato offerta non aggiornato.');
  }catch(e){
    document.getElementById('status').textContent='Errore generazione contratto: '+e.message;
    window.dealupLog?.('Generazione contratto','ERRORE',d,e.message);
  }finally{b.disabled=false;}
};
})();
