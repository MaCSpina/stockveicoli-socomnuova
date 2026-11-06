/* Ricostruzione PDF dai due CSV: nessun nuovo file archiviato. */
(function(){
'use strict';
function parseCSV(text){
  const out=[];let row=[],cell='',quoted=false;
  text=String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===';'&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);out.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);out.push(row);}
  return out;
}
function csvObject(text){const rows=parseCSV(text);return Object.fromEntries((rows[0]||[]).map((k,i)=>[k,(rows[1]||[])[i]??'']));}
function number(v){const s=String(v??'').replace(/[€\s]/g,'').replace(/\./g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null;}
function reconstruct(summary,detail){
  const s=csvObject(summary), rows=parseCSV(detail), headers=rows.shift()||[];
  const records=rows.filter(r=>r.length>1).map(r=>Object.fromEntries(headers.map((k,i)=>[k,r[i]||''])));
  const get=(field,base)=>Object.prototype.hasOwnProperty.call(s,'contratto_'+field)?s['contratto_'+field]:(s[base]||'');
  const q=get('Propone a SOCOM NUOVA SRL ordine per n veicoli','quantita');
  const qty=Number(q);
  const total=number(s.prezzo_totale_netto);
  if(!s.numero_offerta||!Number.isInteger(qty)||qty<1||total===null)throw Error('Dati insufficienti nel CSV: numero offerta, quantità o prezzo netto mancanti');
  const groups=[];const optChapters=[];const costs=[];
  for(const r of records){
    if(r.tipo==='pacchetto'){
      let group=groups.find(g=>g.groupname===r.gruppo);
      if(!group){group={groupname:r.gruppo,carList:[]};groups.push(group);}
      group.carList.push({status:r.stato,codiceUnivoco:r.codice,descrizioneCustom:r.descrizione});
    }else if(r.tipo==='optional'){
      let ch=optChapters.find(c=>c.descrizione===r.gruppo);
      if(!ch){ch={descrizione:r.gruppo,sottoCapitoloList:[{caratteristiche:[]}]};optChapters.push(ch);}
      ch.sottoCapitoloList[0].caratteristiche.push({status:r.stato,codiceUnivoco:r.codice,descrizioneCustom:r.descrizione});
    }else if(r.tipo==='lavorazione'){
      costs.push({name:r.gruppo,descrizione:r.descrizione,abilitato:true,showItem:true});
    }
  }
  const overrides={};
  for(const [key,value] of Object.entries(s))if(key.startsWith('contratto_'))overrides[key.slice(9)]=value;
  const data={
    welcome:{numeroOfferta:s.numero_offerta,quantita:qty,modello:get('Modello','modello'),today:get('Napoli lì','data_offerta'),responsabile:get('Venditore','venditore'),contatto:{nome:get('Il cliente','cliente'),indirizzo:get('Sede Legale','indirizzo'),citta:get('Città','citta'),cap:get('CAP','cap'),vatValue:get('Partita IVA','partita_iva'),telefono:get('Telefono','telefono'),altroTelefono:get('Cellulare','cellulare'),email:get('Email','email')}},
    detailsPrintList:{fcp:{group:[{carList:[{idCaratteristica:'WB',descrizioneCustom:get('Passo','passo')}]}]},colore:{group:[{carList:[{descrizioneCustom:get('Colore','colore')}]}]},pack:{group:groups},fcsuserselected:{fcsCar:{capitoloList:optChapters}}},
    pricing:{prezzoTotaleDaPagareNetValue:total,otherCosts:costs},
    __contractOverrides:overrides,__contractNotes:s.note_aggiuntive||'',__archivePreview:true
  };
  return data;
}
window.dealupArchivePDF=async function(summary,detail,tab){
  const data=reconstruct(summary,detail);
  if(!tab)throw Error('Scheda PDF non disponibile');
  tab.document.write('<title>Preparazione contratto</title><p>Generazione PDF in corso...</p>');
  try{
    const blob=await window.dealupCreateContract(data);
    const url=URL.createObjectURL(blob);
    tab.location.replace(url);
    setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(e){tab.close();throw e;}
};
})();
