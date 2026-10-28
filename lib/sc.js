import {sources,periods,owner} from './indicators.js';
export function aggregate(rows, kind){
 const groups=new Map();
 for(const r of rows){
  const names=kind==='shipping'?[[r.sc,'S/C']]:[[r.coordenador,'Coordenador'],[r.supervisor,'Supervisor']];
  for(const [raw,role] of names){
   const name=String(raw||'').trim();if(!name||name==='—')continue;
   const key=role+':'+name;const g=groups.get(key)||{name,role,count:0,numerator:0};
   const count=kind==='sla'?Number(r.pedidos):kind==='shipping'?Number(r.pacotes):1;
   const numerator=kind==='sla'?Number(r.sla)*count*100:kind==='shipping'?Number(r.total)*count:['ALERTA','CAPOTADA'].includes(String(r.status_risco||'').trim().toUpperCase())?100:0;
   if(kind==='capotamento'){const status=String(r.status_risco||'').trim().toUpperCase();g.alerts=(g.alerts||0)+(status==='ALERTA'?1:0);g.cap=(g.cap||0)+(status==='CAPOTADA'?1:0);}
   g.count+=count;g.numerator+=numerator;groups.set(key,g);
  }
 }
 return [...groups.values()].map(g=>({...g,value:g.count?g.numerator/g.count:null}));
}
export function mergePeriods(day,month,kind='sla'){
 const rows=new Map();
 for(const [period,result] of [['day',day],['month',month]])for(const item of result.rows||[]){
  const key=item.role+':'+item.name;const r=rows.get(key)||{name:item.name,role:item.role};r[period]=item;rows.set(key,r);
 }
 const direction = kind==='shipping'||kind==='capotamento' ? -1 : 1;
 return [...rows.values()].sort((a,b)=>{
  for(const period of ['day','month']){
   const av=a[period]?.value,bv=b[period]?.value;
   const hasA=typeof av==='number'&&Number.isFinite(av),hasB=typeof bv==='number'&&Number.isFinite(bv);
   if(hasA!==hasB)return hasA?-1:1;
   if(hasA&&av!==bv)return (av-bv)*direction;
  }
  return a.name.localeCompare(b.name,'pt-BR')||a.role.localeCompare(b.role);
 });
}
export async function scResults(kind,now=new Date(),fetcher=fetch){
 if(!Object.hasOwn(sources,kind))throw new Error('Indicador inválido');
 const p=periods(now);
 async function get(source,path,params={}){
  let r;try{r=await fetcher(sources[source]+path+'?'+new URLSearchParams(params),{signal:AbortSignal.timeout(25000)});}catch{throw new Error('Não foi possível conectar ao painel de origem.');}
  if(!r.ok)throw new Error(r.status===404?'Sem dados no período.':'O painel de origem está indisponível.');
  return r.json();
 }
 const reference=kind==='shipping'?'sla':kind;
 const filters=await get(reference,'/api/filtros',kind==='capotamento'?{data:p.yesterday}:{});
 const manager=owner(filters,reference);
 const filter={[manager.param]:manager.value};
 async function read(start,end,monthly){
  if(start>end)return {rows:[],message:'Mês ainda sem dia fechado'};
  if(kind==='sla')return {rows:aggregate(await get(kind,'/api/ranking-bases',{...filter,data_inicio:start,data_fim:end}),kind),goal:monthly?97:95};
  if(kind==='t0'){
   const d=await get(kind,'/api/dashboard',{...filter,data_ini:start,data_fim:end});
   return {rows:(d.sc||[]).filter(r=>r.nome&&r.nome!=='—').map(r=>({name:r.nome,role:'S/C',value:r.total?r.ok/r.total*100:null,count:r.total})),goal:d.meta};
  }
  if(kind==='shipping'){
   const mapping=await get('sla','/api/ranking-bases',{...filter,data_inicio:start,data_fim:end});
   const codes=new Set(mapping.map(r=>String(r.codigo_base??'').trim()).filter(Boolean));
   if(!codes.size)throw new Error('Sem cadastro de bases do Orlean no SLA para cruzar este período.');
   const stages=await Promise.all([6,7,8].map(etapa=>get(kind,'/api/piores-bases',{data_inicial:start,data_final:end,etapa,limite:0})));
   const key=r=>JSON.stringify([r.codigo_base,r.base,r.sc,r.cidade]);
   const maps=stages.map(rows=>new Map(rows.map(r=>[key(r),r])));
   const rows=stages[0].filter(r=>codes.has(String(r.codigo_base??'').trim())).map(r=>{
    const parts=maps.map(m=>m.get(key(r)));
    if(parts.some(x=>!x||x.pacotes!==r.pacotes))throw new Error('As etapas do Shipping Time possuem bases diferentes. Atualize a origem.');
    return {...r,total:parts.reduce((sum,x)=>sum+Number(x.horas),0)};
   });
   const count=rows.reduce((sum,r)=>sum+Number(r.pacotes),0);
   const value=count?rows.reduce((sum,r)=>sum+r.total*Number(r.pacotes),0)/count:null;
   return {rows:aggregate(rows,kind),summary:{count,value},goal:null,note:'Somente códigos de bases vinculados ao Orlean no SLA do mesmo período. Média ponderada; valores de origem arredondados.'};
  }
  const rows=[];let available=0,expected=0;
  const days=[];for(let d=new Date(start+'T12:00:00Z');d.toISOString().slice(0,10)<=end;d.setUTCDate(d.getUTCDate()+1))days.push(d.toISOString().slice(0,10));
  for(let i=0;i<days.length;i+=4){
   const batches=await Promise.all(days.slice(i,i+4).map(data=>get(kind,'/api/ranking',{...filter,data,limit:500})));
   for(const b of batches){if(b.total>b.rows.length)throw new Error('A origem limitou a lista de bases. Não é possível calcular o resultado completo.');rows.push(...b.rows);expected++;if(b.rows.length)available++;}
  }
  return {rows:aggregate(rows,kind),goal:0,note:available+'/'+expected+' dias com registros. Meta da central: nenhuma base em ALERTA ou CAPOTADA. No mês, uma base pode aparecer em vários dias.'};
 }
 async function safe(start,end,monthly){try{return await read(start,end,monthly);}catch(e){return {rows:[],error:e.message};}}
 const [day,month]=await Promise.all([safe(p.yesterday,p.yesterday,false),safe(p.start,p.end,true)]);
 return {kind,owner:manager.value,periods:p,day,month,rows:mergePeriods(day,month,kind)};
}
