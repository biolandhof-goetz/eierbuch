'use strict';
const LOSS_REASONS=['Raubtier','Greifvogel','Krankheit','Unbekannt','Vermisst'];
const LOSS_HEADER=['Datum','Mobil','Anzahl','Grund','Notiz'];
function normalizeLoss(row,line=null){
 const prefix=line===null?'':' in Zeile '+line;
 const date=parseDate(row?.date);
 if(!date)throw Error('Ung\u00fcltiges Datum'+prefix+': "'+String(row?.date??'')+'"');
 const mobile=Number(row.mobile),count=Number(row.count);
 if(![1,2].includes(mobile))throw Error('Ung\u00fcltiges Mobil'+prefix+': "'+String(row.mobile??'')+'"');
 if(!Number.isInteger(count)||count<1||count>99999)throw Error('Ung\u00fcltige Anzahl'+prefix+': "'+String(row.count??'')+'"');
 const reason=LOSS_REASONS.find(r=>r.toLowerCase()===String(row.reason??'').trim().toLowerCase());
 if(!reason)throw Error('Ung\u00fcltiger Grund'+prefix+': "'+String(row.reason??'')+'"');
 const note=String(row.note??'').trim().slice(0,120);
 return {id:typeof row.id==='string'&&row.id?row.id:null,date,mobile,count,reason,note};
}
function lossCsvEscape(value){const text=String(value??'');return /[;"\r\n]/.test(text)?'"'+text.replaceAll('"','""')+'"':text}
function toLossCSV(rows){return '\uFEFF'+[LOSS_HEADER.join(';'),...rows.map(r=>[r.date,r.mobile,r.count,r.reason,r.note].map(lossCsvEscape).join(';'))].join('\r\n')+'\r\n'}
function parseLossCSV(text){
 const rows=[];let cells=[],field='',quoted=false,line=1,rowLine=1;
 const addRow=()=>{cells.push(field);if(cells.some(x=>x!==''))rows.push({cells,line:rowLine});cells=[];field='';rowLine=line+1};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
  else if(c===';'&&!quoted){cells.push(field);field=''}
  else if(c==='\n'||c==='\r'){
   if(c==='\r'&&text[i+1]==='\n')i++;
   if(quoted){field+='\n';line++}else{addRow();line++}
  }else field+=c;
 }
 if(quoted)throw Error('CSV enth\u00e4lt ein nicht geschlossenes Anf\u00fchrungszeichen.');
 cells.push(field);if(cells.some(x=>x!==''))rows.push({cells,line:rowLine});
 if(!rows.length||rows[0].cells[0].replace(/^\uFEFF/,'')!=='Datum'||[rows[0].cells[0].replace(/^\uFEFF/,''),...rows[0].cells.slice(1)].join(';')!==LOSS_HEADER.join(';'))throw Error('Abg\u00e4nge-CSV-Format nicht erkannt.');
 return rows.slice(1).map(({cells,line})=>{if(cells.length!==5)throw Error('Abg\u00e4nge-CSV in Zeile '+line+': 5 Spalten erwartet.');return normalizeLoss({date:cells[0],mobile:cells[1],count:cells[2],reason:cells[3],note:cells[4]},line)});
}
function summariseLosses(rows,start,end){
 const filtered=rows.filter(r=>r.date>=start&&r.date<=end),total=filtered.reduce((n,r)=>n+r.count,0);
 return {total,byReason:LOSS_REASONS.map(reason=>{const count=filtered.filter(r=>r.reason===reason).reduce((n,r)=>n+r.count,0);return {reason,count,percent:total?count/total*100:0}}),byMobile:[1,2].map(mobile=>({mobile,count:filtered.filter(r=>r.mobile===mobile).reduce((n,r)=>n+r.count,0)})),events:filtered.length};
}
function parseBackup(input){
 if(Array.isArray(input))return {records:input,losses:null};
 if(![1,2].includes(input?.version)||!Array.isArray(input.records))throw Error('Backup-Format nicht erkannt.');
 if(input.losses!==undefined&&!Array.isArray(input.losses))throw Error('Ung\u00fcltige Abg\u00e4nge im Backup.');
 return {records:input.records,losses:input.losses===undefined?null:input.losses.map((row,i)=>normalizeLoss(row,i+1))};
}
globalThis.LossLogic={LOSS_REASONS,normalizeLoss,toLossCSV,parseLossCSV,summariseLosses,parseBackup};
