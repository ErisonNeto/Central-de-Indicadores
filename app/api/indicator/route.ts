import { sources } from '../../../lib/indicators.js';
import { directResults } from '../../../lib/direct.js';
export async function GET(request: Request) {
 const kind=new URL(request.url).searchParams.get('kind')||'';
 if(!(kind in sources))return Response.json({error:'Indicador inválido'},{status:400});
 try {return Response.json((await directResults(kind)).indicator,{headers:{'Cache-Control':'private, max-age=180'}});}
 catch(e){return Response.json({error:e instanceof Error?e.message:'Falha ao consultar o painel.'},{status:502});}
}
