import {monthlyResults,monthlyRange} from '../../../lib/monthly.js';
import {monthlyMetrics} from '../../../lib/monthly-series.js';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams,kind=params.get('kind')||'',month=params.get('month')||'';
 if(!monthlyMetrics.some(m=>m.id===kind&&m.id!=='csat'))return Response.json({error:'Indicador inválido'},{status:400});
 try{monthlyRange(month,kind);}catch{return Response.json({error:'Selecione um mês válido, até o mês atual.'},{status:400});}
 try{return Response.json(await monthlyResults(kind,month),{headers:{'Cache-Control':'private, max-age=180'}});}
 catch(error){console.error('Monthly indicator unavailable:',kind,error instanceof Error?error.message:'unknown');return Response.json({error:'Não foi possível consultar este indicador na API J&T. Tente atualizar.'},{status:502});}
}
