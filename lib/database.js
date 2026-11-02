import pg from 'pg';

// Server-only module: never import from client components.
const key = Symbol.for('central.database.pools');
const pools = globalThis[key] ||= new Map();
export async function query(kind, text, values) {
  const env = `${kind.toUpperCase()}_DATABASE_URL`;
  const connectionString = process.env[env] || process.env.DATABASE_URL;
  if (!connectionString) throw new Error(`Configure ${env} ou DATABASE_URL no servidor da Central.`);
  let pool = pools.get(connectionString);
  if (!pool) {
    // Verify TLS certificates; an optional Supabase CA can be configured on Render.
    const url = new URL(connectionString);
    for (const name of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(name);
    pool = new pg.Pool({connectionString:url.toString(), max:3,
      connectionTimeoutMillis:10000, idleTimeoutMillis:30000,
      statement_timeout:25000, options:'-c default_transaction_read_only=on',
      ssl:{rejectUnauthorized:true, ...(process.env.DATABASE_CA_CERT ? {ca:process.env.DATABASE_CA_CERT} : {})}});
    pool.on('error', () => {}); // Do not log connection strings or database errors.
    pools.set(connectionString,pool);
  }
  try { return (await pool.query(text,values)).rows; }
  catch { throw new Error('Não foi possível consultar o Supabase. Confira a conexão, permissões e tabelas no servidor.'); }
}
