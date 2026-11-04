// Daily snapshots: a package present on two dates contributes on both.
export async function agingResults(kind, periods, ranges, query) {
 const rows = await query(kind, `SELECT data::text AS data, rm, sc,
   COALESCE(SUM(pedidos) FILTER (WHERE aging_valor > 3),0) AS q3,
   COALESCE(SUM(pedidos) FILTER (WHERE aging_valor > 10),0) AS q10
   FROM public.sem_mov_retidos_detalhe
   WHERE indicador=$1 AND data BETWEEN $2::date AND $3::date AND rm ~* $4
   GROUP BY data, rm, sc`, [kind,ranges.start,periods.end,'\\mOrlean\\M']);
 const owners = [...new Set(rows.map(row=>row.rm))];
 if (owners.length>1) throw new Error('Mais de um RM Orlean encontrado no período.');
 function summary(from,to) {
  const selected=rows.filter(row=>row.data>=from && row.data<=to);
  const groups=new Map();
  let q3=0,q10=0;
  for (const row of selected) {
   const a=Number(row.q3),b=Number(row.q10);
   q3+=a; q10+=b;
   const name=row.sc?.trim() || 'Sem S/C identificado';
   const item=groups.get(name) || {name,role:'S/C',value:0,q10:0};
   item.value+=a;item.q10+=b;groups.set(name,item);
  }
  const days=new Set(selected.map(row=>row.data)).size;
  const expected=Math.max(0,(Date.parse(to)-Date.parse(from))/86400000+1);
  return {from,to,value:days?q3:null,q10:days?q10:null,days,expected,groups};
 }
 const day=summary(periods.yesterday,periods.yesterday),month=summary(periods.start,periods.end);
 const priorDay=summary(ranges.previousDay,ranges.previousDay);
 const priorWeek=summary(ranges.previousWeekStart,ranges.previousSunday);
 const names=new Set([...day.groups.keys(),...month.groups.keys(),...priorDay.groups.keys(),...priorWeek.groups.keys()]);
 const ranking=[...names].map(name=>({name,role:'S/C',day:day.groups.get(name),month:month.groups.get(name),previousDay:priorDay.groups.get(name),previousWeek:priorWeek.groups.get(name)}))
  .sort((a,b)=>(b.day?.value??-1)-(a.day?.value??-1)||(b.month?.value??-1)-(a.month?.value??-1)||a.name.localeCompare(b.name,'pt-BR'));
 const scalar=({groups,...rest})=>rest;
 const comparison={previousDay:scalar(priorDay),
  week:scalar(summary(ranges.monday,periods.end)),previousWeek:scalar(priorWeek)};
 const common={kind,periods,owner:owners[0],checkedAt:new Date().toISOString()};
 return {indicator:{...common,day:scalar(day),month:scalar(month),comparison},
  sc:{...common,comparison,rows:ranking,day:{},month:{}}};
}
