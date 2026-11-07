'use client';
const date=(s?:string)=>s?s.slice(8,10)+'/'+s.slice(5,7):'—';
const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function Value({item}:{item:any}){
 if(item?.value==null)return <span className="sc-empty">Nenhum registro no período</span>;
 return <div className="sc-result"><strong>{money(item.value)}</strong><small>{item.count.toLocaleString('pt-BR')} ocorrências finalizadas</small>{item.reviewCount>0&&<small>{item.reviewCount.toLocaleString('pt-BR')} em conferência · {money(item.reviewValue)}</small>}</div>;
}
export function ClaimsTiles({data}:{data:any}){
 const c=data?.comparison;
 const entries:[string,any][]=[['Ontem',data?.day],['Mesmo dia na semana passada',c?.previousDay],['Semana atual · seg a dom',c?.week],['Semana passada · seg a dom',c?.previousWeek],['Acumulado do mês até hoje',data?.month]];
 return <div className="period-grid">{entries.map(([label,item],i)=><div className={'period-tile'+(i===4?' monthly':'')} key={label}><label>{label}</label>{item&&<small>{date(item.from)}{item.from!==item.to?' – '+date(item.to):''}</small>}{data?<Value item={item}/>:<small>Consultando…</small>}</div>)}</div>;
}
export function ClaimsSc({data,loading,rows}:{data:any,loading:boolean,rows:any[]}){
 const c=data?.comparison;
 return <section className="sc-section"><h3>Valores por Coordenador e Supervisor</h3><p>Maior valor finalizado na semana primeiro, com desempate pelo mês. Semana e mês atuais parciais até hoje.</p>{loading?<p>Consultando…</p>:data?.error?<p>{data.error}</p>:<div className="sc-scroll"><table><thead><tr><th>Responsável</th><th>Ontem</th><th>Mesmo dia na semana passada<br/><small>{date(c?.previousDay?.to)}</small></th><th>Semana atual · seg a dom</th><th>Semana passada · seg a dom<br/><small>{date(c?.previousWeek?.from)} – {date(c?.previousWeek?.to)}</small></th><th>Mês até hoje</th></tr></thead><tbody>{rows.map(r=><tr key={r.role+':'+r.name}><td><span className="sc-name">{r.name}</span><span className="sc-role">{r.role}</span></td>{['day','previousDay','week','previousWeek','month'].map(k=><td key={k}><Value item={r[k]}/></td>)}</tr>)}</tbody></table>{!rows.length&&<p>Nenhum responsável com registros no período.</p>}</div>}<p className="sc-footnote">Somente Processo encerrado e Arbitragem finalizada entram nos totais principais. Conferência aparece separadamente. As funções não devem ser somadas, pois a mesma ocorrência pode ter coordenador e supervisor.</p></section>;
}
