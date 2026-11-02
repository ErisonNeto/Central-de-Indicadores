// Server-side adapter for the J&T VM's authenticated /query route.
export async function query(kind, text, values, fetcher = fetch) {
  const key = process.env.JT_API_KEY?.trim();
  if (!key) throw new Error('Configure JT_API_KEY no serviço Central-de-Indicadores do Render.');
  const root = process.env.JT_API_URL?.trim() || 'https://jt-api.rockettechbr.com.br';
  const url = new URL(root.replace(/\/+$/, '') + '/query');
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Confira JT_API_URL. Use o endereço HTTPS da API J&T.');
  const params = [];
  const sql = text.replace(/\$(\d+)/g, (_, n) => {
    const index = Number(n) - 1;
    if (index < 0 || index >= values.length) throw new Error('Parâmetro SQL inválido.');
    params.push(values[index]);
    return '%s';
  });
  let response;
  try {
    response = await fetcher(url, {method:'POST', redirect:'error', cache:'no-store',
      headers:{'Content-Type':'application/json','X-API-Key':key},
      body:JSON.stringify({sql,params}), signal:AbortSignal.timeout(45000)});
  } catch {
    throw new Error('A API J&T não respondeu. Confira o acesso ao servidor da VM.');
  }
  if (!response.ok) {
    if ([401,403].includes(response.status)) throw new Error('A API J&T recusou a chave. Confira JT_API_KEY no Render.');
    throw new Error('Falha na consulta à API J&T (HTTP ' + response.status + ').');
  }
  const payload = await response.json();
  if (!Array.isArray(payload.colunas) || !Array.isArray(payload.rows)) throw new Error('Formato inesperado da API J&T.');
  return payload.rows.map(row => {
    if (!Array.isArray(row) || row.length !== payload.colunas.length) throw new Error('Linha incompleta na resposta da API J&T.');
    return Object.fromEntries(payload.colunas.map((col,index) => [col,row[index]]));
  });
}
