// Reuses each source's weighted aggregation; never averages daily percentages.
export const monthlyMetrics = [
 {id:'sla',name:'SLA',unit:'%',goal:97,minimum:93,up:true,note:'Resumo JMS: entregas no prazo / quantidade a entregar; sem média de percentuais.'},
 {id:'t0',name:'T0',unit:'%',goal:70,up:true,note:'Entregas T0 / pacotes do mês.'},
 {id:'1bd',name:'1BD',unit:'%',goal:85,minimum:80,up:true,note:'Avaliações concluídas / avaliações do mês. Referência D-2; meta vigente na Central.'},
 {id:'5cd',name:'5CD',unit:' remessas',goal:null,up:false,note:'Média diária dos volumes em aberto nos dias com relatório. Referência D-2.'},
 {id:'shipping',name:'Shipping Time',unit:' h',goal:null,up:false,note:'Etapas 6 a 8; média ponderada pelos pacotes. Bases do Orlean no SLA do período.'},
 {id:'sem_mov',name:'Sem Movimentação',unit:' registros',goal:null,up:false,note:'Corte vigente: acima de 3 dias. Soma dos registros diários; uma remessa pode se repetir. Sem denominador percentual integrado.'},
 {id:'retidos',name:'Retidos',unit:' registros',goal:null,up:false,note:'Acima de 3 dias. Soma dos registros diários; uma remessa pode se repetir. Sem denominador percentual integrado.'},
 {id:'capotamento',name:'Capotamento',unit:'%',goal:0,up:false,note:'ALERTA + CAPOTADA / registros de bases do mês. Não representa bases únicas.'},
 {id:'avaria',name:'Avaria',unit:'BRL',goal:null,up:false,note:'Valor finalizado por fechamento (fallback: declaração). Quantidade separada; PPM ainda não integrado.'},
 {id:'extravio',name:'Extravio',unit:'BRL',goal:null,up:false,note:'Valor finalizado por fechamento (fallback: declaração). Quantidade separada; PPM ainda não integrado.'},
 {id:'pnr',name:'PNR',unit:'BRL',goal:null,up:false,note:'Valor e quantidade finalizados. Regra de PNR preservada; sem classificação de meta.'},
 {id:'csat',name:'CSAT',unit:'%',goal:null,up:true,note:'Avaliações positivas / total de avaliações. D-2 pela data da avaliação; semanas oficiais do relatório. Sem meta definida.'},
 {id:'c2c',name:'C2C',unit:'%',goal:100,minimum:100*20/30,up:true,note:'Atingimento mensal: remessas únicas / (30 × bases ativas do S/C). Cadastro atual de bases; períodos sem remessas não confirmam ausência de movimento.'}
];
const valid=v=>typeof v==='number'&&Number.isFinite(v);
export function delta(current,previous,unit){
 if(!valid(current)||!valid(previous))return null;
 const amount=current-previous;
 return {amount,relative:previous===0?null:amount/Math.abs(previous)*100,unit:unit==='%'?'p.p.':unit};
}
export function buildMonthly(kind,range,aggregate){
 const metric=monthlyMetrics.find(m=>m.id===kind),people=new Map();
 const dates=[];
 for(let t=Date.parse(range.start);t<=Date.parse(range.end);t+=86400000)dates.push(new Date(t).toISOString().slice(0,10));
 for(const date of dates){
  const daily=new Map(aggregate(date,date).map(r=>[JSON.stringify([r.name,r.role]),r]));
  for(const r of aggregate(range.start,date)){
   const key=JSON.stringify([r.name,r.role]);
   if(!valid(r.value))continue;
   const person=people.get(key)||{name:r.name,role:r.role,points:new Map()};
   const observed=valid(daily.get(key)?.value);
   person.points.set(date,{date,value:r.value,count:r.count??null,positives:r.positives??null,negatives:r.negatives??null,q10:r.q10??null,reviewCount:r.reviewCount??null,observed});
   people.set(key,person);
  }
 }
 const rows=[...people.values()].map(person=>{
  let previous=null,lastObserved=null;
  const history=dates.map(date=>{
   const p=person.points.get(date)||{date,value:null,count:null,observed:false};
   if(p.observed)lastObserved=date;
   // Missing reports are not zero and never imply a zero daily movement.
   const change=p.observed&&previous?.observed?delta(p.value,previous.value,metric.unit):null;
   previous=p;
   return {...p,lastObserved,change};
  });
  return {name:person.name,role:person.role,history,current:history.at(-1)||null};
 });
 return {kind,range,rows,checkedAt:new Date().toISOString()};
}
export const normalizeName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
// Match full names across sources. Ambiguous duplicate roles are never summed.
export function combineMonthly(results){
 const people=new Map();
 for(const result of results)for(const row of result.rows||[]){
  const key=normalizeName(row.name);if(!key||key==='SEM S/C IDENTIFICADO'||['DARLEY WALLACE CUNHA QUARESMA','RAIMUNDO LIMA FILHO','ZULENIA RIBEIRO DA SILVA'].includes(key))continue;
  const p=people.get(key)||{key,name:row.name,roles:[],metrics:{}};
  if(!p.roles.includes(row.role))p.roles.push(row.role);
  p.metrics[result.kind]=p.metrics[result.kind]?{conflict:true}:row;
  people.set(key,p);
 }
 return [...people.values()];
}
