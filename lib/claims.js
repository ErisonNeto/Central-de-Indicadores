import {periods} from './indicators.js';
export const claimTypes={avaria:'Avaria',extravio:'Extravio',pnr:'PNR'};
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim().replace(/\s+/g,' ');
export async function claimsResults(kind,now,query){
 const p=periods(now),shift=(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10);
 const monday=shift(p.today,-((new Date(p.today+'T00:00:00Z').getUTCDay()+6)%7));
 const sunday=shift(monday,6),priorStart=shift(monday,-7),priorEnd=shift(monday,-1),priorDay=shift(p.yesterday,-7);
 const start=[p.start,priorStart,priorDay].sort()[0];
 const date="LEFT(COALESCE(NULLIF(fechada_em::text,''),NULLIF(declarada_em::text,''),data::text),10)";
 const records=await query(kind,`SELECT ${date} AS data,coordenador,supervisor,status,COUNT(*)::float8 AS count,SUM(COALESCE(valor_centavos,0))::text AS cents FROM public.jt_arbitragem_ocorrencias WHERE tipo=$1 AND POSITION('ORLEAN' IN UPPER(COALESCE(rm,'')))>0 AND ${date} BETWEEN $2 AND $3 GROUP BY ${date},coordenador,supervisor,status`,[claimTypes[kind],start,p.today]);
 for(const r of records){r.count=Number(r.count);r.cents=Number(r.cents);if(!Number.isSafeInteger(r.cents)||!Number.isSafeInteger(r.count))throw new Error('Valor ou quantidade inválida no indicador de arbitragem.');r.final=['PROCESSO ENCERRADO','ARBITRAGEM FINALIZADA'].includes(normalize(r.status));}
 const people=new Map();
 for(const r of records)for(const [field,role] of [['coordenador','Coordenador'],['supervisor','Supervisor']]){const name=String(r[field]||'').trim();if(name)people.set(JSON.stringify([name,role]),{name,role,field});}
 function period(from,to,person){
  const all=records.filter(r=>r.data>=from&&r.data<=to&&(!person||String(r[person.field]||'').trim()===person.name));
  const finalized=all.filter(r=>r.final),review=all.filter(r=>!r.final);
  const sum=(xs,key)=>xs.reduce((s,r)=>s+r[key],0);
  const count=sum(finalized,'count'),cents=sum(finalized,'cents');
  if(!Number.isSafeInteger(cents))throw new Error('Total financeiro fora do limite suportado.');
  return {from,to,value:all.length?cents/100:null,count:all.length?count:null,reviewCount:sum(review,'count'),reviewValue:sum(review,'cents')/100};
 }
 const comparison={previousDay:period(priorDay,priorDay),week:period(monday,sunday),previousWeek:period(priorStart,priorEnd)};
 const rows=[...people.values()].map(g=>({name:g.name,role:g.role,day:period(p.yesterday,p.yesterday,g),month:period(p.start,p.today,g),previousDay:period(priorDay,priorDay,g),previousWeek:period(priorStart,priorEnd,g),week:period(monday,sunday,g)}));
 rows.sort((a,b)=>{for(const k of ['week','month']){const x=a[k].value,y=b[k].value;if(x==null&&y!=null)return 1;if(y==null&&x!=null)return -1;if(x!==y&&x!=null&&y!=null)return y-x;}return a.name.localeCompare(b.name,'pt-BR');});
 const common={kind,periods:{...p,end:p.today},comparison,checkedAt:new Date().toISOString()};
 return {indicator:{...common,day:period(p.yesterday,p.yesterday),month:period(p.start,p.today)},sc:{...common,rows}};
}
