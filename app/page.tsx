'use client';
import {useEffect,useState} from 'react';
import ScSection from './sc-section';
import {ArrowUpRight,ArrowRight,RefreshCw,LayoutGrid,Target,Clock3,ShieldAlert,PackageCheck,Truck,ChevronDown,Activity} from 'lucide-react';
const panels=[
 {id:'sla',title:'SLA – Regional',label:'Entregas dentro do prazo',icon:PackageCheck,url:'https://jandt-sla-dashboard.onrender.com/',unit:'%',note:'Meta diária ≥ 95% · mensal ≥ 97%'},
 {id:'t0',title:'T0 – Regional',label:'Entregas no mesmo dia',icon:Target,url:'https://j-t-t0.onrender.com/',unit:'%',note:'Meta ≥ 70% · quanto maior, melhor'},
 {id:'shipping',title:'Shipping Time',label:'Tempo médio · etapas 6, 7 e 8',icon:Truck,url:'https://j-t-shippingtime.onrender.com/',unit:'h',note:'Média em horas · quanto menor, melhor · sem meta fixa'},
 {id:'capotamento',title:'Capotamento',label:'Bases em alerta ou capotadas',icon:ShieldAlert,url:'https://j-t-capotamento.onrender.com/',unit:'%',note:'Meta da central: 0% em alerta ou capotadas'},
 {id:'sem_mov',title:'Sem Movimentação',label:'Pacotes sem movimentação',icon:Clock3,url:'https://j-t-semmov-and-retidos.onrender.com/?indicador=sem_mov',unit:'pct',note:'Acima de 10 dias também entra no corte de 3 dias. Os períodos somam os registros diários.'},
 {id:'retidos',title:'Retidos',label:'Pacotes retidos na base',icon:PackageCheck,url:'https://j-t-semmov-and-retidos.onrender.com/?indicador=retidos',unit:'pct',note:'Acima de 10 dias também entra no corte de 3 dias. Os períodos somam os registros diários.'},
 {id:'1bd',title:'1BD',label:'Entregas concluídas · Qualidade TikTok',icon:Target,url:'https://j-t-1bd-5cd-csat.onrender.com/',unit:'%',note:'Referência D-2 · meta ≥ 80% · avaliações concluídas / total de avaliações'},
 {id:'5cd',title:'5CD',label:'Remessas em aberto · Qualidade TikTok',icon:PackageCheck,url:'https://j-t-1bd-5cd-csat.onrender.com/',unit:' remessas',note:'Referência D-2 · menor é melhor · semana e mês exibem média por dia com relatório, sem meta fixa'}
];
const fmt=(n:number)=>n.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2});
const date=(s:string)=>s? s.slice(8,10)+'/'+s.slice(5,7):'—';
function Metric({data,unit,inverse}:{data:any,unit:string,inverse:boolean}){
 const has=typeof data?.value==='number'&&Number.isFinite(data.value);
 const status=has&&typeof data.goal==='number'?(inverse?data.value<=data.goal:data.value>=data.goal):null;
 return <><div className={'number '+(status===true?'good':status===false?'bad':'')}>{has?fmt(data.value):'—'}<span>{has?unit:''}</span></div><div className={'state '+(status===true?'green':status===false?'red':'neutral')}>{!data?'Consultando…':!has?(data.message||'Sem dados no período'):status===true?'● Dentro da meta':status===false?'● Fora da meta':(data.info||'● Sem meta cadastrada')}</div>{has&&data.alerts!==undefined&&<small className="cap-counts">{data.alerts} em alerta · {data.cap} capotadas</small>}{has&&<small>{data.count?.toLocaleString('pt-BR')} {data.countLabel||(data.cap!==undefined?'registros de bases':'pacotes')}{data.available!==undefined?' · '+data.available+'/'+data.expected+' dias com dados':''}</small>}</>
}
type Sample = {from:string; to:string; value:number|null; days:number; elapsed?:number};
function Change({current,previous,unit}:{current?:number|null;previous?:number|null;unit:string}) {
 if(current==null || previous==null)return null;
 const diff=current-previous;
 return <small className="metric-change">{diff>0?'↑ +':diff<0?'↓ −':'='}{fmt(Math.abs(diff))}{unit==='h'?' h':unit==='%'?' p.p.':' remessas'} vs. anterior</small>;
}
function HistoryTile({label,sample,unit,previous}:{label:string;sample:Sample;unit:string;previous?:Sample}) {
 const single=sample.from===sample.to && sample.elapsed===undefined;
 return <div className="period-tile"><label>{label}</label>
 <small>{sample.elapsed===0?'A partir de '+date(sample.from):single?date(sample.to):date(sample.from)+' – '+date(sample.to)}</small>
 <div className="number">{sample.value==null?'—':fmt(sample.value)}{sample.value!=null&&<span>{unit}</span>}</div>
 {sample.value==null&&<small>Sem dados</small>}
 {!single&&<small>{sample.elapsed===0?'Aguardando o primeiro dia fechado':sample.days+'/'+(sample.elapsed??7)+' dias com dados'}</small>}
 <Change current={sample.value} previous={previous?.value} unit={unit}/>
 </div>;
}
function AgingTiles({data}:{data:any}) {
 const c=data?.comparison;
 return <div className="period-grid">{[
  ['Ontem',data?.day],['Mesmo dia na semana passada',c?.previousDay],['Semana atual até ontem',c?.week],
  ['Semana passada · seg a dom',c?.previousWeek],['Acumulado do mês',data?.month]
 ].map(([label,item])=><div key={label} className={'period-tile'+(label==='Acumulado do mês'?' monthly':'')}>
 <label>{label}</label><small>{item?.expected>0?(item.from===item.to?date(item.to):date(item.from)+' – '+date(item.to)):''}</small>
 {item?.value!=null?<><strong>{item.value.toLocaleString('pt-BR')}</strong> acima de 3 dias<br/><strong>{item.q10.toLocaleString('pt-BR')}</strong> acima de 10 dias<small>{item.days}/{item.expected} dias com dados</small></>:<small>{data?'Sem dados no período':'Consultando…'}</small>}</div>)}</div>;
}
export default function Home(){
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const [data,setData]=useState<Record<string,any>>({});const [loading,setLoading]=useState(true);const [updated,setUpdated]=useState('');
 async function refresh(){setLoading(true);setData({});await Promise.all(panels.map(async p=>{try{const r=await fetch('/api/indicator?kind='+p.id,{cache:'no-store'});const d=await r.json();setData(old=>({...old,[p.id]:d}));}catch{setData(old=>({...old,[p.id]:{error:'Não foi possível conectar ao painel.'}}));}}));setUpdated(new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}));setLoading(false);}
 useEffect(()=>{refresh();const t=setInterval(refresh,300000);return()=>clearInterval(t)},[]);
 const period=Object.values(data).find((x:any)=>x.periods)?.periods;
 const success=Object.values(data).filter((x:any)=>typeof x.day?.value==='number').length;
 return <div className="shell"><aside><a className="brand" href="/">J&T<span>EXPRESS</span></a><div className="side-label">GESTÃO REGIONAL</div><div className="nav-active"><LayoutGrid size={19}/>Central de indicadores</div><div className="side-bottom"><span className="avatar">OR</span><div>Orlean<small>Visão do responsável</small></div></div></aside><div className="workspace"><header><span><span className="crumb">Regional</span><span className="slash">/</span>Central de indicadores</span><div className="profile">OR</div></header><main><div className="eyebrow"><span/> PERFORMANCE OPERACIONAL</div><div className="heading"><div><h1>Central de Indicadores</h1><p>Os resultados mais recentes. A visão do mês. Tudo em um só lugar.</p></div><button onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading?'spin':''}/>{loading?'Atualizando':'Atualizar'}</button></div><div className="toolbar"><div className="filter"><span className="avatar small">OR</span><span>Responsável <strong>Orlean</strong></span><ChevronDown size={15}/></div><div className="period"><Clock3 size={16}/><span>{period?'Ontem, '+date(period.yesterday)+' · Mês até '+date(period.end):'Ontem e mês até o último dia fechado'}</span></div><span className="update">{updated?'Consulta às '+updated:'Consultando fontes'}</span></div><div className="section-title"><h2>Seus indicadores <span>{String(panels.length).padStart(2,'0')}</span></h2><span><Activity size={14}/>{loading?'Carregando resultados':success+' de '+panels.length+' com dados na referência'}</span></div><div className="grid">{panels.map((p,i)=>{const d=data[p.id];const Icon=p.icon;return <article key={p.id} className={expanded[p.id]?'card-expanded':''}><div className="card-head"><div className="icon"><Icon size={23}/></div><span className="card-index">0{i+1}</span></div><h2>{p.title}</h2><p className="subtitle">{p.label}</p>{d?.error?<div className="error"><strong>Resultado indisponível</strong><p>{d.error}</p><span>O acesso ao indicador continua disponível.</span></div>:p.unit==='pct'?<AgingTiles data={d}/>:<div className="period-grid">
 <div className="period-tile"><label>{p.id==='1bd'||p.id==='5cd'?'Referência D-2':'Ontem'} {d?.periods&&date(d.periods.yesterday)}</label><Metric data={d?.day} unit={p.unit} inverse={p.id==='shipping'||p.id==='capotamento'}/><Change current={d?.day?.value} previous={d?.comparison?.previousDay?.value} unit={p.unit}/></div>
 {d?.comparison&&<><HistoryTile label="Mesmo dia na semana passada" sample={d.comparison.previousDay} unit={p.unit}/>
 <HistoryTile label={p.id==='1bd'||p.id==='5cd'?'Semana até D-2':'Semana atual até ontem'} sample={d.comparison.week} previous={d.comparison.previousWeek} unit={p.unit}/>
 <HistoryTile label="Semana passada · seg a dom" sample={d.comparison.previousWeek} unit={p.unit}/></>}
 <div className="period-tile monthly"><label>{p.id==='5cd'?'Média diária do mês':'Acumulado do mês'}</label><Metric data={d?.month} unit={p.unit} inverse={p.id==='shipping'||p.id==='capotamento'}/></div>
 </div>}<div className="goal"><Target size={13}/>{p.note}</div><div className="card-actions"><a className="open" href={p.url || undefined} aria-disabled={!p.url} target="_blank" rel="noopener noreferrer"><span>{p.url?'Abrir indicador':'Link do painel pendente'}</span><ArrowUpRight size={17}/></a><button className="expand-sc" aria-expanded={!!expanded[p.id]} aria-controls={'sc-'+p.id} onClick={()=>setExpanded(old=>({...old,[p.id]:!old[p.id]}))}><span>{expanded[p.id]?'Recolher S/C':p.id==='5cd'?'Remessas por S/C':p.unit==='pct'?'Pacotes por S/C':p.id==='shipping'?'Tempos por S/C':'Metas por S/C'}</span><ChevronDown size={16} className={expanded[p.id]?'rotated':''}/></button></div><div id={'sc-'+p.id} hidden={!expanded[p.id]}>{expanded[p.id]&&<ScSection kind={p.id}/>}</div></article>})}</div><div className="information"><div className="info-icon"><LayoutGrid size={20}/></div><div><strong>Uma visão rápida para decidir onde olhar.</strong><p>Os cards atualizam a cada 5 minutos. Qualidade 1BD e 5CD usa D-2; os demais indicadores usam ontem. Abra o indicador para explorar bases, equipes e detalhes.</p></div><ArrowRight size={20}/></div><details><summary>Como os resultados são calculados</summary><p><b>SLA e T0:</b> resultado sobre o total de pacotes do período, sem média simples dos percentuais diários. <b>Shipping Time:</b> média em horas ponderada pelos pacotes, somando as etapas 6 a 8; sem meta fixa ou classificação de atingimento. O recorte do Orlean usa os códigos de bases presentes no SLA do mesmo período.</p><p><b>Capotamento:</b> bases com status ALERTA ou CAPOTADA ÷ registros de bases, com meta de 0% definida na central. Cada registro entra uma única vez no cálculo. Pré-alerta e monitoramento não entram nesse percentual. No mês, soma desses registros em cada dia ÷ soma dos registros de bases diários; uma base pode aparecer em vários dias. Não é a porcentagem de bases únicas do mês. Dias sem registros são indicados na cobertura.</p><p><b>Qualidade 1BD e 5CD:</b> referência D-2 no horário de Brasília, com mês e semanas relativos a essa data. 1BD é o percentual de avaliações concluídas, ponderado pelo volume. 5CD é o volume em aberto no dia e a média dos volumes diários disponíveis na semana e no mês. Dias sem relatório não entram como zero.</p><p>Datas no horário de Brasília. O mês vai do dia 1 até ontem; no primeiro dia do mês, o acumulado fica sem dia fechado. Ausência de dados nunca é exibida como 0%. O filtro é aplicado apenas quando há um único cadastro correspondente a Orlean.</p></details><footer><span>J&T EXPRESS <b> / </b> GESTÃO REGIONAL</span><span>Central de Indicadores · Orlean</span></footer></main></div></div>
}
