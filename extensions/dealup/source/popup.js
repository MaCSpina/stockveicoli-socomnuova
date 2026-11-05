const status = document.getElementById('status');
const download = document.getElementById('download');
async function refresh() {
  try {
    const r = await chrome.runtime.sendMessage({type:'STATUS'});
    status.textContent = r.message || 'Pronto';
    download.checked = !!r.downloadEnabled;
  } catch(e) { status.textContent=String(e); }
}
download.onchange = async () => {
  download.disabled = true;
  try {
    const r = await chrome.runtime.sendMessage({type:'SET_DOWNLOAD',enabled:download.checked});
    if (r.message?.startsWith('ERRORE')) throw new Error(r.message);
    status.textContent = r.message;
    download.checked = !!r.downloadEnabled;
  } catch(e) {status.textContent=String(e);await refresh();}
  finally {download.disabled=false;}
};
document.getElementById('start').onclick=async()=>{
  status.textContent='Attivazione...';
  try {const r=await chrome.runtime.sendMessage({type:'START'});status.textContent=r.message;}
  catch(e){status.textContent=String(e)}
};
refresh();
