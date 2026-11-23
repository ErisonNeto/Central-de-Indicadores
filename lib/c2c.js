import {buildMonthly} from './monthly-series.js';
import {periods} from './indicators.js';
import {mergePeriods} from './sc.js';
import {teamScope} from './team-scope.js';
const OWNER='ORLEAN DA SILVA DO NASCIMENTO';
const shift=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function c2cDays(from,to){
 let days=0;
 for(let d=from;d<=to;d=shift(d,1))if(Number(d.slice(-2))<=30)days++;
 return days;
}
export async function c2cResults(now,query,range=null){
 const p={...periods(now),...(range?{...range,yesterday:range.end}:{})};
 const offset=(new Date(p.today+'T00:00:00Z').getUTCDay()+6)%7;
 const monday=shift(p.today,-offset),previousSunday=shift(monday,-1),previousMonday=shift(monday,-7);
 const previousDay=shift(p.yesterday,-7),from=range?p.start:[p.start,previousMonday,previousDay].sort()[0];
 const bases=await query('c2c',`SELECT codigo_base::text AS code,COALESCE(NULLIF(TRIM(sc),''),'Sem S/C identificado') AS name
 FROM public.c2c_bases WHERE UPPER(TRIM(rm))=$1 AND ativo=TRUE AND ${teamScope('sc')}`,[OWNER]);
 if(!bases.length)throw new Error('Sem bases ativas de C2C para o time do Orlean.');
 // Deduplicate shipments on the server; browser receives aggregated counts only.
 const rows=await query('c2c',`WITH unique_shipments AS (
 SELECT DISTINCT ON (TRIM(r.remessa)) TRIM(r.remessa) AS remessa,r.data_envio::date AS data,r.base_key::text AS code
 FROM public.c2c_remessas r JOIN public.c2c_bases b ON b.codigo_base=r.base_key
 WHERE UPPER(TRIM(b.rm))=$1 AND b.ativo=TRUE AND ${teamScope('b.sc')}
 AND r.data_envio >= $2::date AND r.data_envio < ($3::date+1)
 AND NULLIF(TRIM(r.remessa),'') IS NOT NULL
 ORDER BY TRIM(r.remessa),r.data_envio DESC,r.base_key
 ) SELECT data::text,code,COUNT(*)::float8 AS count FROM unique_shipments GROUP BY data,code`,[OWNER,from,p.end]);
 const groups=new Map();
 for(const b of bases){const codes=groups.get(b.name)||new Set();codes.add(b.code);groups.set(b.name,codes);}
 const allCodes=new Set(bases.map(b=>b.code));
 function period(a,b,monthly=false){
  const selected=rows.filter(r=>r.data>=a&&r.data<=b);
  // No import manifest exists: an entirely empty period is unknown, not proven zero.
  const available=selected.length>0;
  const stats=codes=>{
   const items=selected.filter(r=>codes.has(r.code)),count=items.reduce((s,r)=>s+Number(r.count),0);
   const target=codes.size*(monthly?30:c2cDays(a,b));
   return {value:available&&target?100*count/target:null,count,bases:codes.size,target,goal:100,
    countLabel:'pacotes C2C',days:new Set(items.map(r=>r.data)).size};
  };
  return {from:a,to:b,goal:100,summary:stats(allCodes),rows:[...groups].map(([name,codes])=>({name,role:'S/C',...stats(codes)}))};
 }
 if(range)return buildMonthly('c2c',range,(a,b)=>period(a,b,true).rows);
 const day=period(p.yesterday,p.yesterday),month=period(p.start,p.end,true);
 const priorDay=period(previousDay,previousDay),priorWeek=period(previousMonday,previousSunday);
 const sample=x=>({from:x.from,to:x.to,...x.summary});
 const comparison={previousDay:sample(priorDay),week:sample(period(monday,p.end)),previousWeek:sample(priorWeek)};
 const common={kind:'c2c',owner:OWNER,periods:p,comparison,checkedAt:new Date().toISOString()};
 return {indicator:{...common,day:day.summary,month:month.summary},
 sc:{...common,day,month,rows:mergePeriods(day,month,'c2c',{previousDay:priorDay,previousWeek:priorWeek})}};
}
