import {scResults} from '../../../lib/sc.js';
import {sources} from '../../../lib/indicators.js';
export async function GET(request:Request){
 const kind=new URL(request.url).searchParams.get('kind')||'sla';
 if(!Object.hasOwn(sources,kind))return Response.json({error:'Indicador inválido'},{status:400});
 try{return Response.json(await scResults(kind),{headers:{'Cache-Control':'private, max-age=180'}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'Consulta indisponível'},{status:502});}
}
