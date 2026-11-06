/* DealUp: compilazione AcroForm nel browser. PDF-Lib 1.17.1. */
(()=>{
const $=id=>document.getElementById(id);
function items(section){return (section?.group||[]).flatMap(g=>g.carList||[])}
function parseMoney(v){if(typeof v==='number')return v;if(v==null)return null;let s=String(v).replace(/[€\s]/g,'');if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');let n=Number(s);return Number.isFinite(n)?n:null}
function money(v){return v==null?'':new Intl.NumberFormat('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}).format(v)}
function opts(data){
  const out=[];
  // Pacchetti: riportare il nome commerciale del pacchetto, non ogni componente interno.
  for(const group of data.detailsPrintList?.pack?.group||[]){
    const name=String(group.groupname||group.group||'').trim();
    if(name && (group.carList||[]).some(v=>!['DEFAULT_HIDE','REMOVED'].includes(v.status)))out.push('PACCHETTO '+name);
  }
  for(const c of data.detailsPrintList?.fcsuserselected?.fcsCar?.capitoloList||[])
    for(const s of c.sottoCapitoloList||[])
      for(const v of s.caratteristiche||[]){
        if(['DEFAULT_HIDE','REMOVED'].includes(v.status))continue;
        const d=String(v.descrizioneCustom||v.valore||'').trim();
        const code=String(v.codiceUnivoco||v.codice||'').trim();
        if(d)out.push((code+' '+d).trim());
      }
  return [...new Set(out)];
}
function optionLines(options,number,font){
  // I pacchetti hanno priorità assoluta: non devono sparire se gli optional sono numerosi.
  const widths=[470,505,315], lines=['','',''];
  const packs=options.filter(v=>v.startsWith('PACCHETTO '));
  const others=options.filter(v=>!v.startsWith('PACCHETTO '));
  let omitted=0;
  function add(value){
    for(let i=0;i<3;i++){
      const candidate=lines[i]?lines[i]+'; '+value:value;
      if(font.widthOfTextAtSize(candidate,7.5)<=widths[i]){lines[i]=candidate;return true;}
    }
    return false;
  }
  for(const pack of packs)if(!add(pack))throw Error('Troppi pacchetti per i campi Optional del contratto');
  for(const value of others)if(!add(value))omitted++;
  if(omitted){
    const notice='Altri optional: vedere offerta DealUp '+number;
    if(!add(notice)){
      // Riserva spazio all'avviso senza cancellare i pacchetti già inseriti.
      for(let i=2;i>=0;i--){
        if(lines[i] && !lines[i].includes('PACCHETTO ')){lines[i]=notice;break;}
      }
    }
  }
  return lines;
}
function extraNote(data){
  const costs=Array.isArray(data.pricing?.otherCosts)?data.pricing.otherCosts:[];
  const rows=[];
  for(const cost of costs){
    if(!cost||cost.abilitato===false||cost.showItem===false)continue;
    const description=String(cost.descrizione||'').trim();
    if(!description)continue;
    const heading=String(cost.name||'Lavorazioni aggiuntive').trim();
    rows.push(heading.toUpperCase()+': '+description.replace(/\r\n?/g,'\n').split('\n').map(x=>x.trim()).filter(Boolean).join('; '));
  }
  return rows;
}
function noteLines(data,font){
  const rows=extraNote(data);if(data.__contractNotes)rows.push("NOTE AGGIUNTIVE: "+String(data.__contractNotes).replace(/\r\n?/g,"\n").split("\n").map(x=>x.trim()).filter(Boolean).join("; "));const widths=[440,515,515,515],lines=['','','',''];
  let index=0;
  for(const row of rows){
    // Ripartisce il testo su quattro campi, senza troncare le parole.
    const words=row.split(/\s+/).filter(Boolean);
    for(const word of words){
      let placed=false;
      while(index<4){
        const candidate=lines[index]?lines[index]+' '+word:word;
        if(font.widthOfTextAtSize(candidate,8)<=widths[index]){lines[index]=candidate;placed=true;break;}
        index++;
      }
      if(!placed)throw Error('Le lavorazioni aggiuntive superano lo spazio Note e commenti del contratto');
    }
    index=Math.min(index+1,4);
  }
  return lines;
}
async function createContract(data){if(!window.PDFLib)throw Error('Libreria PDF non caricata. Verifica la connessione Internet o scarica pdf-lib.min.js in locale.');const response=await fetch('Modello_Contratto.pdf');if(!response.ok)throw Error('Modello_Contratto.pdf non trovato accanto a dealup.html');const doc=await PDFLib.PDFDocument.load(await response.arrayBuffer());const form=doc.getForm(),font=await doc.embedFont(PDFLib.StandardFonts.Helvetica);const w=data.welcome||{},client=w.contatto||{},details=data.detailsPrintList||{},pricing=data.pricing||{},calc=pricing.printOutPriceCalculation||{};const number=String(w.numeroOfferta||'').trim();if(!number)throw Error('Numero offerta mancante');const qty=Number(w.quantita||1);if(!Number.isInteger(qty)||qty<1)throw Error('Quantità non valida');let total=parseMoney(pricing.prezzoTotaleDaPagareNetValue);if(total===null)total=parseMoney(calc.summaryTotalOfferQuote?.customerFinalPrice);if(total===null)throw Error('Prezzo netto totale mancante: verifica l’offerta');const unit=total/qty;const fcp=Object.fromEntries(items(details.fcp).map(v=>[String(v.idCaratteristica),v]));const first=section=>items(section).find(v=>v.descrizioneCustom||v.valore)||{};const passo=fcp.WB||{};const citta=(client.citta||'').trim(),prov=(client.provincia||'').trim();const city=prov.length===2&&!citta.toUpperCase().includes(prov.toUpperCase())?citta+' ('+prov.toUpperCase()+')':citta;const lines=optionLines(opts(data),number,font);const notes=noteLines(data,font);const values={
'Napoli lì':w.today||'','Il cliente':client.nome||'','Sede Legale':client.indirizzo||'','Città':city,'CAP':client.cap||'','Partita IVA':client.vatValue||'','Telefono':client.telefono||'','Cellulare':client.altroTelefono||'','Email':client.email||'',
'Propone a SOCOM NUOVA SRL ordine per n veicoli':String(qty),'Modello':w.modello||'','Passo':passo.descrizioneCustom||passo.valore||passo.codiceUnivoco||'','Colore':first(details.colore).descrizioneCustom||first(details.colore).valore||'','Allestimento 1':first(details.dealerbodies).descrizioneCustom||first(details.dealerbodies).valore||'','Optional 1':lines[0],'Optional 2':lines[1],'Optional 3':lines[2],'Configurazione CRM n':number,'Prezzo per veicolo iva esclusa €':money(unit),'Prezzo totale fornitura iva esclusa €':money(total),'Venditore':w.responsabile||'','Note e commenti 1':notes[0],'Note e commenti 2':notes[1],'Note e commenti 3':notes[2],'Note e commenti 4':notes[3]};
Object.assign(values,data.__contractOverrides||{});
const payment=String(values.Dropdown6??values._Dropdown6??'').trim();delete values.Dropdown6;delete values._Dropdown6;
if(payment){const paymentField=form.getDropdown('Dropdown6');paymentField.select(payment);paymentField.updateAppearances(font);}

// Risolve i nomi dei campi del CSV contro quelli realmente presenti nel modello.
// I CSV storici possono contenere un underscore iniziale aggiuntivo.
const pdfFieldNames=new Set(form.getFields().map(f=>f.getName()));
for(const [rawName,value] of Object.entries(values)){
  let name=rawName;
  if(!pdfFieldNames.has(name)){
    const normalized=name.replace(/^_+/, '');
    if(pdfFieldNames.has(normalized))name=normalized;
    else if(String(value??'').trim())throw Error('Campo non presente nel modello PDF: '+rawName);
    else continue;
  }
  if(name==='Dropdown6'){
    const paymentValue=String(value??'').trim();
    if(paymentValue){const dropdown=form.getDropdown(name);dropdown.select(paymentValue);dropdown.updateAppearances(font);}
    continue;
  }
  const field=form.getTextField(name);const s=String(value??'');field.acroField.setDefaultAppearance('/Helv 9 Tf 0 g');if(/^(Optional [123]|Note e commenti [1234])$/.test(name))field.setMaxLength(undefined);field.setText(s);const widget=field.acroField.getWidgets()[0];const rect=widget.getRectangle();let size=Math.min(10,(rect.height-3)*.72);while(size>4&&font.widthOfTextAtSize(s,size)>rect.width-5)size-=.25;if(font.widthOfTextAtSize(s,size)>rect.width-5)throw Error('Testo troppo lungo per il campo '+name);field.setFontSize(size);field.updateAppearances(font)}
const extras=Object.fromEntries((calc.vehicleExtras||[]).filter(v=>v&&typeof v==='object').map(v=>[v.itemId,v]));if((parseMoney(extras.transport?.customerFinalPrice)||0)>0)form.getCheckBox('Check Box2').check();if((parseMoney(extras.registration?.customerFinalPrice)||0)>0)form.getCheckBox('Check Box3').check();
const bytes=await doc.save();const blob=new Blob([bytes],{type:'application/pdf'});if(data.__archivePreview)return blob;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Contratto_'+number.replace(/[^\w-]/g,'_')+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
window.dealupCreateContract=createContract;
})();
