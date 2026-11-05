import {periods} from './indicators.js';

// Quality reports close at D-2. Calendar weeks are anchored to that reporting day.
export async function qualityResults(kind, now, query) {
 const today=periods(now).today;
 const shift=(date,n)=>new Date(Date.parse(date)+n*86400000).toISOString().slice(0,10);
 const ref=shift(today,-2), monday=shift(ref,-((new Date(ref+'T00:00:00Z').getUTCDay()+6)%7));
 const previousDay=shift(ref,-7), previousWeekStart=shift(monday,-7), previousSunday=shift(monday,-1);
 const p={today,yesterday:ref,reference:ref,start:ref.slice(0,7)+'-01',end:ref};
 const start=[p.start,previousDay,previousWeekStart].sort()[0];
 const one=kind==='1bd', table=one?'jt_1bd_registros':'jt_5cd_registros', date=one?'data_avaliacao':'data_relatorio';
 const rows=await query(kind,`SELECT r.${date}::text AS data,COALESCE(NULLIF(TRIM(g.sc),''),'Sem S/C identificado') AS name,COALESCE(NULLIF(TRIM(g.tipo_sc),''),'S/C') AS role,COUNT(*)::float8 AS total,${one?'SUM(r.entregue)::float8':'0::float8'} AS ok FROM ${table} r JOIN jt_1bd_gestao g ON g.base_chave=r.base_chave WHERE r.${date} >= $1 AND r.${date} <= $2 AND g.rm=$3 GROUP BY r.${date},g.sc,g.tipo_sc`,[start,ref,'ORLEAN DA SILVA DO NASCIMENTO']);
 const names=new Map(rows.map(r=>[JSON.stringify([r.name,r.role]),{name:r.name,role:r.role}]));
 function period(from,to){
  const selected=rows.filter(r=>r.data>=from&&r.data<=to);
  const days=new Set(selected.map(r=>r.data)).size;
  function calc(list){
   const count=list.reduce((s,r)=>s+Number(r.total),0), ok=list.reduce((s,r)=>s+Number(r.ok),0);
   return {value:one?(count?100*ok/count:null):(days?count/days:null),count,days,goal:one?80:null,info:one?'Avaliações de entrega':'Remessas em aberto · menor é melhor',countLabel:one?'avaliações':'registros diários'};
  }
  return {from,to,goal:one?80:null,summary:calc(selected),rows:[...names.values()].map(g=>({...g,...calc(selected.filter(r=>r.name===g.name&&r.role===g.role))}))};
 }
 const day=period(ref,ref),month=period(p.start,ref),priorDay=period(previousDay,previousDay),priorWeek=period(previousWeekStart,previousSunday),week=period(monday,ref);
 const sample=r=>({from:r.from,to:r.to,value:r.summary.value,days:r.summary.days});
 const comparison={previousDay:sample(priorDay),previousWeek:sample(priorWeek),week:{...sample(week),elapsed:Math.round((Date.parse(ref)-Date.parse(monday))/86400000)+1}};
 const ranked=[...names.values()].map((g,i)=>({...g,day:day.rows[i],month:month.rows[i],previousDay:priorDay.rows[i],previousWeek:priorWeek.rows[i]}));
 ranked.sort((a,b)=>{for(const k of ['day','month']){const av=a[k].value,bv=b[k].value;if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;if(av!=null&&bv!=null&&av!==bv)return one?av-bv:bv-av;}return a.name.localeCompare(b.name,'pt-BR');});
 const checkedAt=new Date().toISOString(),common={kind,owner:'ORLEAN DA SILVA DO NASCIMENTO',periods:p,comparison,checkedAt};
 return {indicator:{...common,day:day.summary,month:month.summary},sc:{...common,day,month,rows:ranked}};
}
