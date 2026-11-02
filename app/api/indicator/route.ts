import { directResults, hasDatabase } from '../../../lib/direct.js';
import { sources } from '../../../lib/indicators.js';
import { indicator } from '../../../lib/indicators.js';

export async function GET(request: Request) {
 const kind = new URL(request.url).searchParams.get('kind') || '';
 if (!Object.hasOwn(sources, kind)) return Response.json({error:'Indicador inválido'}, {status:400});
 try {
  const direct = hasDatabase(kind);
  const result = direct ? (await directResults(kind)).indicator : await indicator(kind);
  return Response.json({...result, source:direct ? 'database' : 'dashboard'}, {headers:{'Cache-Control':'private, max-age=180'}});
 } catch (error) {
  return Response.json({error:error instanceof Error ? error.message : 'Consulta indisponível'}, {status:502});
 }
}
