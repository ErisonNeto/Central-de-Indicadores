import pg from 'pg';

const pools = globalThis[Symbol.for('central.database.pools')] ||= new Map();

function diagnosis(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (/tenant or user not found/i.test(message)) return ['POOLER', 'Confira o host e o usuário do Session pooler em Supabase → Connect.'];
  if (code === '28P01' || code === '28000') return ['LOGIN', 'Confira o usuário e a senha da conexão no Render.'];
  if (/CERT|SELF_SIGNED|VERIFY_LEAF/.test(code) || /certificate/i.test(message)) return ['TLS', 'Confira o host e o certificado CA do Supabase em DATABASE_CA_CERT.'];
  if (['ENOTFOUND','EAI_AGAIN','ENETUNREACH','ECONNREFUSED','ETIMEDOUT'].includes(code) || /connection timeout|timeout exceeded/i.test(message)) return ['REDE', 'O servidor não alcançou o banco. Confira o host, a porta e o estado do projeto.'];
  if (code === '42501') return ['PERMISSAO', 'O usuário do banco precisa de permissão de leitura.'];
  if (code === '42P01' || code === '42703') return ['ESTRUTURA', 'A tabela ou coluna esperada não está disponível nesse banco.'];
  if (code === '57014') return ['TEMPO', 'A consulta ultrapassou o tempo disponível.'];
  return ['CONSULTA', 'Confira o código do erro nos logs do serviço Central.'];
}

export async function query(kind, text, values) {
  const env = kind.toUpperCase() + '_DATABASE_URL';
  const connectionString = process.env[env] || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Configure ' + env + ' ou DATABASE_URL no servidor da Central.');
  let client;
  let discard = false;
  try {
    let pool = pools.get(connectionString);
    if (!pool) {
      const url = new URL(connectionString.trim());
      for (const key of ['sslmode','sslcert','sslkey','sslrootcert','options','statement_timeout']) url.searchParams.delete(key);
      const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n');
      pool = new pg.Pool({connectionString:url.toString(), max:3,
        connectionTimeoutMillis:10000, idleTimeoutMillis:30000,
        ssl:{rejectUnauthorized:true, ...(ca ? {ca} : {})}});
      pool.on('error', error => console.warn('[central-db] pool', diagnosis(error)[0]));
      pools.set(connectionString,pool);
    }
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '25s'");
    const result = await client.query(text, values);
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch { discard = true; }
    }
    const [category,hint] = diagnosis(error);
    const code = /^[A-Z0-9_]{1,48}$/.test(String(error.code || '')) ? error.code : 'UNKNOWN';
    console.warn('[central-db]', kind, category, code);
    throw new Error('Banco indisponível (' + category + '). ' + hint);
  } finally {
    client?.release(discard);
  }
}
