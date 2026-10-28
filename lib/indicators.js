export const sources = {
 sla: 'https://jandt-sla-dashboard.onrender.com',
 capotamento: 'https://j-t-capotamento.onrender.com',
 shipping: 'https://j-t-shippingtime.onrender.com',
 t0: 'https://j-t-t0.onrender.com'
};
export function periods(now = new Date()) {
 const today = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const d = new Date(today+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()-1);
 const yesterday=d.toISOString().slice(0,10);
 return {today,yesterday,start:today.slice(0,7)+'-01',end:yesterday};
}
export function owner(filters, kind) {
 const fields=kind==='sla'?[['rms','rm'],['responsaveis','responsavel']]:kind==='t0'?[['rm','rm'],['sc','sc']]:kind==='shipping'?[['scs','sc']]:[['rms','rm'],['scs','sc']];
 const matches=[];
 for(const [key,param] of fields) for(const value of filters[key]||[]) if(/\borlean\b/i.test(value)) matches.push({param,value});
 if(matches.length!==1) throw new Error(matches.length?'Mais de um cadastro do Orlean encontrado. É necessário confirmar o responsável.':'Orlean não encontrado nos filtros deste indicador.');
 return matches[0];
}
export async function indicator(kind, now=new Date(), fetcher=fetch) {
 const base=sources[kind]; if(!base) throw new Error('Indicador inválido');
 if(kind==='shipping'){
  const {scResults}=await import('./sc.js');
  const result=await scResults(kind,now,fetcher);
  const metric=period=>({value:period.summary?.value??null,count:period.summary?.count??0,goal:null,message:period.error||period.message,info:'Tempo médio · menor é melhor'});
  return {kind,owner:result.owner,periods:result.periods,day:metric(result.day),month:metric(result.month),checkedAt:new Date().toISOString()};
 }
 const p=periods(now);
 async function get(path,params={}) {
  let r; try {r=await fetcher(base+path+'?'+new URLSearchParams(params),{signal:AbortSignal.timeout(25000)});} catch {throw new Error('Não foi possível conectar ao painel de origem. Tente atualizar em instantes.');}
  if(r.status===404) throw new Error('Sem dados para o período selecionado.');
  if(!r.ok) throw new Error('O painel de origem está indisponível. Tente atualizar em instantes.');
  return r.json();
 }
 const f=await get('/api/filtros',kind==='shipping'?{data_inicial:p.start<=p.end?p.start:p.yesterday,data_final:p.end}:kind==='capotamento'?{data:p.yesterday}:{});
 const o=owner(f,kind), filter={[o.param]:o.value};
 async function period(start,end) {
  if(start>end) return {value:null,message:'Mês ainda sem dia fechado'};
  if(kind==='sla') {
   const d=await get('/api/kpis',{...filter,data_inicio:start,data_fim:end});
   return {value:d.total_pedidos?d.sla*100:null,count:d.total_pedidos,goal:(start===p.yesterday&&end===p.yesterday?d.meta_diaria:d.meta_mensal)*100};
  }
  if(kind==='t0') {
   const d=await get('/api/dashboard',{...filter,data_ini:start,data_fim:end});
   return {value:d.kpis.total?d.kpis.taxa:null,count:d.kpis.total,goal:d.meta};
  }
  const days=[]; for(let day=new Date(start+'T12:00:00Z');day.toISOString().slice(0,10)<=end;day.setUTCDate(day.getUTCDate()+1)) days.push(day.toISOString().slice(0,10));
  let total=0,cap=0,alerts=0,available=0;
  // Limit concurrency; each day must succeed so the month never becomes a partial total.
  for(let i=0;i<days.length;i+=4){
   const rows=await Promise.all(days.slice(i,i+4).map(data=>get('/api/resumo',{...filter,data})));
   for(const r of rows){total+=r.total;cap+=r.capotadas;alerts+=r.alerta;if(r.total)available++;}
  }
  return {value:total?(cap+alerts)/total*100:null,count:total,cap,alerts,available,expected:days.length,goal:0};
 }
 const wrap=async(a,b,monthly=false)=>{try{const d=await period(a,b);if(monthly&&kind==='sla'&&d.value!==null)d.goal=97;return d;}catch(e){return {value:null,message:e.message||'Não foi possível consultar os dados.'};}};
 const [day,month]=await Promise.all([wrap(p.yesterday,p.yesterday),wrap(p.start,p.end,true)]);
 return {kind,owner:o.value,periods:p,day,month,checkedAt:new Date().toISOString()};
}
