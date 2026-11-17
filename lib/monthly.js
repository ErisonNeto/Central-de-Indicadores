import {periods} from './indicators.js';
import {readDirect} from './direct.js';
import {monthlyMetrics} from './monthly-series.js';
const cache=globalThis[Symbol.for('central.monthly.cache')] ||= new Map();
export function monthlyRange(month,kind,now=new Date()){
 const today=periods(now).today;
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)||month>today.slice(0,7))throw new Error('Selecione um mês válido, até o mês atual.');
 const start=month+'-01';
 const last=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).toISOString().slice(0,10);
 const cutoff=new Date(Date.parse(today)-(kind==='1bd'||kind==='5cd'||kind==='csat'?2:1)*86400000).toISOString().slice(0,10);
 return {start,end:last<cutoff?last:cutoff,month};
}
export async function monthlyResults(kind,month,now=new Date(),query){
 if(!monthlyMetrics.some(m=>m.id===kind))throw new Error('Indicador mensal não integrado.');
 const range=monthlyRange(month,kind,now);
 if(range.end<range.start)return {kind,range,rows:[],checkedAt:now.toISOString()};
 if(query)return readDirect(kind,now,query,range);
 const key=kind+':'+month+':'+range.end;
 const hit=cache.get(key);if(hit&&(hit.pending||hit.expires>Date.now()))return hit.promise;
 for(const [k,v] of cache)if(!v.pending&&v.expires<=Date.now())cache.delete(k);
 const entry={pending:true,expires:0,promise:null};
 entry.promise=readDirect(kind,now,undefined,range).then(value=>{entry.pending=false;entry.expires=Date.now()+180000;return value;},error=>{cache.delete(key);throw error;});
 cache.set(key,entry);return entry.promise;
}
