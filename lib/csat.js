import {buildMonthly} from './monthly-series.js';
import {periods} from './indicators.js';
import {teamScope} from './team-scope.js';
const ORLEAN='ORLEAN DA SILVA DO NASCIMENTO';
const shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const validWeek=/^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/;
function monday(id){
 const [year,week]=id.split('-W').map(Number),j=new Date(Date.UTC(year,0,4));
 return new Date(Date.UTC(year,0,4)-((j.getUTCDay()+6)%7)*86400000+(week-1)*604800000).toISOString().slice(0,10);
}
function previousWeek(id){
 const [y,w]=id.split('-W').map(Number);
 if(w>1)return y+'-W'+String(w-1).padStart(2,'0');
 const last=Math.round((Date.parse(monday(y+'-W01'))-Date.parse(monday((y-1)+'-W01')))/604800000);
 return (y-1)+'-W'+String(last).padStart(2,'0');
}
export async function csatResults(now,query,monthlyRange=null){
 const today=periods(now).today,ref=monthlyRange?.end||shift(today,-2);
 const start=monthlyRange?.start||ref.slice(0,7)+'-01';
 const from=monthlyRange?start:[start,shift(ref,-28)].sort()[0];
 const p={today,yesterday:ref,reference:ref,start,end:ref};
 // Query aggregated counts only: never transmit ticket, tracking or customer IDs.
 const rows=await query('csat',`SELECT data_avaliacao AS data,semana_id,
   COALESCE(NULLIF(TRIM(sc),''),'Sem S/C identificado') AS name,
   COALESCE(NULLIF(TRIM(tipo_sc),''),'S/C') AS role,
   COUNT(*)::float8 AS total,COALESCE(SUM(avaliacao),0)::float8 AS positives
   FROM public.jt_csat_registros
   WHERE rm=$1 AND data_avaliacao >= $2 AND data_avaliacao <= $3
     AND ${teamScope('coordenador','supervisor','sc')}
   GROUP BY data_avaliacao,semana_id,sc,tipo_sc`,[ORLEAN,from,ref]);
 const names=[...new Map(rows.filter(r=>r.name&&r.name!=='Sem S/C identificado')
  .map(r=>[JSON.stringify([r.name,r.role]),{name:r.name,role:r.role}])).values()];
 const stats=items=>{
  const count=items.reduce((a,r)=>a+Number(r.total),0);
  const positives=items.reduce((a,r)=>a+Number(r.positives),0);
  return {value:count?100*positives/count:null,count,positives,negatives:count-positives,
   goal:null,days:new Set(items.map(r=>r.data)).size,
   info:'Avaliações positivas / total de avaliações · sem meta definida',countLabel:'avaliações'};
 };
 const dateRows=(a,b)=>rows.filter(r=>r.data>=a&&r.data<=b);
 const weekRows=id=>id?rows.filter(r=>r.semana_id===id):[];
 const period=(items,a,b)=>({from:a,to:b,summary:stats(items),rows:names.map(g=>({
   ...g,...stats(items.filter(r=>r.name===g.name&&r.role===g.role))}))});
 if(monthlyRange)return buildMonthly('csat',monthlyRange,(a,b)=>period(dateRows(a,b),a,b).rows);
 const weekIds=[...new Set(rows.map(r=>String(r.semana_id||'')))].filter(s=>validWeek.test(s)).sort();
 const weekId=weekIds.at(-1)||null,prevId=weekId?previousWeek(weekId):null;
 const previousDay=shift(ref,-7),day=period(dateRows(ref,ref),ref,ref);
 const month=period(dateRows(start,ref),start,ref);
 const lastDay=period(dateRows(previousDay,previousDay),previousDay,previousDay);
 const official=period(weekRows(weekId),weekId?monday(weekId):ref,weekId?shift(monday(weekId),6):ref);
 const prior=period(weekRows(prevId),prevId?monday(prevId):ref,prevId?shift(monday(prevId),6):ref);
 const sample=(x,id=null)=>({from:x.from,to:x.to,value:x.summary.value,count:x.summary.count,days:x.summary.days,
   ...(id?{weekId:id}:{})});
 const comparison={previousDay:sample(lastDay),week:sample(official,weekId),previousWeek:sample(prior,prevId)};
 const people=names.map((g,i)=>({...g,day:day.rows[i],month:month.rows[i],
  previousDay:lastDay.rows[i],previousWeek:prior.rows[i]}));
 people.sort((a,b)=>{for(const k of ['day','month']){
  const x=a[k].value,y=b[k].value;
  if(x==null&&y!=null)return 1;if(y==null&&x!=null)return -1;
  if(x!=null&&y!=null&&x!==y)return x-y;
 }return a.name.localeCompare(b.name,'pt-BR');});
 const common={kind:'csat',owner:ORLEAN,periods:p,comparison,officialWeek:weekId,checkedAt:new Date().toISOString()};
 return {indicator:{...common,day:day.summary,month:month.summary},
  sc:{...common,day,month,rows:people}};
}
