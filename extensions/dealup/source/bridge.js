// Ponte limitato al portale aziendale. Nessun invio a server.
window.addEventListener('message',async event=>{
 if(event.source!==window||!['https://stockveicoli.socomnuova.com','http://127.0.0.1:5500','http://localhost:5500'].includes(event.origin))return;
 const msg=event.data;
 if(!msg||msg.channel!=='DEALUP_PORTAL_REQUEST'||!['LIST_OFFERS','GET_OFFER','MARK_GENERATED'].includes(msg.type))return;
 try{const result=await chrome.runtime.sendMessage({type:msg.type,id:msg.id});window.postMessage({channel:'DEALUP_PORTAL_RESPONSE',requestId:msg.requestId,result},event.origin);}
 catch(e){window.postMessage({channel:'DEALUP_PORTAL_RESPONSE',requestId:msg.requestId,result:{error:String(e)}},event.origin);}
});
