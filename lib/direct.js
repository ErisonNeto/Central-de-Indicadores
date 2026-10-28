import {periods} from './indicators.js';
import {aggregate,mergePeriods} from './sc.js';

const tables={sla:'entregas',t0:'t0_diario',capotamento:'capotamento_diario'};
const dates={sla:'data_sla',t0:'data',capotamento:'data'};
const key=Symbol.for('central.direct.cache');
const cache=globalThis[key] ||= new Map();

export async function readDirect(kind,now=new Date(),query) {
 if(!['sla','t0','capotamento','shipping'].includes(kind))throw new Error('Indicador inválido');
 if(!query) query=(await import('./database.js')).query;
 const p=periods(now), start=p.start<=p.end?p.start:p.yesterday;
 const reference=kind==='shipping'?'sla':kind;
 const table=tables[reference],date=dates[reference];
 // Identifiers above are fixed allowlists; all variable values are parameters.
 const owners=await query(reference,`SELECT DISTINCT rm FROM ${table} WHERE ${date} BETWEEN $1::date AND $2::date AND rm ~* $3`,[start,p.end,'\\mOrlean\\M']);
 if(owners.length!==1)throw new Error(owners.length?'Mais de um RM Orlean encontrado no período.':'RM Orlean não encontrado no Supabase para este período.');
 const owner=owners[0].rm;
 const params=[start,p.end,owner];
 let rows,mapping=[];
 if(kind==='sla') rows=await query(kind,`SELECT data_sla::text AS data,coordenador,supervisor,COUNT(*)::float8 AS pedidos,AVG(CASE WHEN no_prazo THEN 1.0 ELSE 0.0 END)::float8 AS sla FROM entregas WHERE data_sla BETWEEN $1::date AND $2::date AND rm=$3 GROUP BY data_sla,coordenador,supervisor`,params);
 if(kind==='t0') rows=await query(kind,`SELECT data::text AS data,sc,SUM(total_pedidos)::float8 AS total,SUM(t0_ok)::float8 AS ok FROM t0_diario WHERE data BETWEEN $1::date AND $2::date AND rm=$3 GROUP BY data,sc`,params);
 if(kind==='capotamento') rows=await query(kind,`SELECT data::text AS data,coordenador,supervisor,status_risco FROM capotamento_diario WHERE data BETWEEN $1::date AND $2::date AND rm=$3`,params);
 if(kind==='shipping') {
  mapping=await query('sla',`SELECT DISTINCT data_sla::text AS data,codigo_base::text FROM entregas WHERE data_sla BETWEEN $1::date AND $2::date AND rm=$3 AND codigo_base IS NOT NULL`,params);
  const codes=[...new Set(mapping.map(r=>String(r.codigo_base).trim()))];
  if(!codes.length)throw new Error('Sem bases do Orlean no SLA para cruzar este período.');
  rows=await query(kind,`SELECT data::text AS data,codigo_base::text,sc,SUM(pacotes)::float8 AS pacotes,SUM((COALESCE(etapa_6_h,0)+COALESCE(etapa_7_h,0)+COALESCE(etapa_8_h,0))*COALESCE(pacotes,0))::float8 AS weighted FROM shipping_time_diario WHERE data BETWEEN $1::date AND $2::date AND codigo_base::text=ANY($3::text[]) GROUP BY data,codigo_base,sc`,[start,p.end,codes]);
  rows=rows.map(r=>({...r,total:Number(r.pacotes)?Number(r.weighted)/Number(r.pacotes):0}));
 }
 function period(from,to,monthly){
  if(from>to)return {rows:[],summary:{value:null,message:'Mês ainda sem dia fechado'}};
  let selected=rows.filter(r=>r.data>=from&&r.data<=to);
  if(kind==='shipping'){
   const codes=new Set(mapping.filter(r=>r.data>=from&&r.data<=to).map(r=>String(r.codigo_base).trim()));
   if(!codes.size)return {rows:[],summary:{value:null,message:'Sem bases do Orlean no SLA para cruzar este período.'}};
   selected=selected.filter(r=>codes.has(String(r.codigo_base).trim()));
  }
  const goal=kind==='sla'?(monthly?97:95):kind==='t0'?70:kind==='capotamento'?0:null;
  let groups,count=0,numerator=0;
  if(kind==='t0'){
   const map=new Map();
   for(const r of selected){
    count+=Number(r.total);numerator+=Number(r.ok)*100;
    const name=String(r.sc||'').trim();if(!name||name==='—')continue;
    const g=map.get(name)||{name,role:'S/C',count:0,numerator:0};
    g.count+=Number(r.total);g.numerator+=Number(r.ok)*100;map.set(name,g);
   }
   groups=[...map.values()].map(g=>({...g,value:g.count?g.numerator/g.count:null}));
  }else{
   groups=aggregate(selected,kind);
   for(const r of selected){const n=kind==='sla'?Number(r.pedidos):kind==='shipping'?Number(r.pacotes):1;
    count+=n;numerator+=kind==='sla'?Number(r.sla)*n*100:kind==='shipping'?Number(r.weighted):['ALERTA','CAPOTADA'].includes(String(r.status_risco||'').trim().toUpperCase())?100:0;}
  }
  const summary={value:count?numerator/count:null,count,goal};
  if(kind==='shipping')summary.info='Tempo médio · menor é melhor';
  if(kind==='capotamento')Object.assign(summary,{
   cap:selected.filter(r=>String(r.status_risco).trim().toUpperCase()==='CAPOTADA').length,
   alerts:selected.filter(r=>String(r.status_risco).trim().toUpperCase()==='ALERTA').length,
   available:new Set(selected.map(r=>r.data)).size,
   expected:Math.round((Date.parse(to)-Date.parse(from))/86400000)+1});
  return {rows:groups,summary,goal};
 }
 const day=period(p.yesterday,p.yesterday,false),month=period(p.start,p.end,true);
 const checkedAt=new Date().toISOString();
 return {indicator:{kind,owner,periods:p,day:day.summary,month:month.summary,checkedAt},
  sc:{kind,owner,periods:p,day,month,rows:mergePeriods(day,month,kind),checkedAt}};
}

export async function directResults(kind,now=new Date(),loader=readDirect){
 const p=periods(now),key=kind+':'+p.today;
 const hit=cache.get(key);if(hit&&(hit.pending||hit.expires>Date.now()))return hit.promise;
 for(const [k,v] of cache)if(!v.pending&&v.expires<=Date.now())cache.delete(k);
 const entry={pending:true,expires:0,promise:null};
 entry.promise=loader(kind,now).then(value=>{entry.pending=false;entry.expires=Date.now()+180000;return value;},error=>{cache.delete(key);throw error;});
 cache.set(key,entry);return entry.promise;
}
