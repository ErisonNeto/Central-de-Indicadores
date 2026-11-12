import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readDirect} from '../lib/direct.js';
import {teamScope} from '../lib/team-scope.js';
const db=new PGlite();
await db.exec(`
CREATE TABLE entregas(data_sla date,codigo_base int,rm text,coordenador text,supervisor text,no_prazo bool);
CREATE TABLE t0_diario(data date,rm text,sc text,total_pedidos int,t0_ok int);
CREATE TABLE capotamento_diario(data date,rm text,coordenador text,supervisor text,status_risco text);
CREATE TABLE shipping_time_diario(data date,codigo_base int,sc text,pacotes int,etapa_6_h numeric,etapa_7_h numeric,etapa_8_h numeric);
CREATE TABLE sem_mov_retidos_detalhe(indicador text,data date,rm text,sc text,aging_valor int,pedidos int);
CREATE TABLE jt_1bd_gestao(base_chave text PRIMARY KEY,rm text,sc text,tipo_sc text,coordenador text,supervisor text);
CREATE TABLE jt_1bd_registros(data_avaliacao text,base_chave text,entregue integer);
CREATE TABLE jt_5cd_registros(data_relatorio text,base_chave text);
CREATE TABLE jt_arbitragem_ocorrencias(tipo text,rm text,fechada_em text,declarada_em text,data text,coordenador text,supervisor text,status text,valor_centavos bigint);
`);
const rm='ORLEAN DA SILVA DO NASCIMENTO',now=new Date('2026-11-04T15:00Z');
const dates=['2026-10-26','2026-10-27','2026-11-01','2026-11-02','2026-11-03'];
async function insert(table,values){await db.query(`INSERT INTO ${table} VALUES (${values.map((_,i)=>'$'+(i+1)).join(',')})`,values);}
async function seed(name,code,supervisor=null){
 await insert('jt_1bd_gestao',[String(code),rm,name,'S/C',name,supervisor]);
 for(const d of dates){
  await insert('entregas',[d,code,rm,name,supervisor,true]);
  await insert('t0_diario',[d,rm,name,10,7]);
  await insert('capotamento_diario',[d,rm,name,supervisor,'NORMAL']);
  await insert('shipping_time_diario',[d,code,name,10,10,1,2]);
  for(const k of ['sem_mov','retidos'])await insert('sem_mov_retidos_detalhe',[k,d,rm,name,11,10]);
  await insert('jt_1bd_registros',[d,String(code),1]);
  await insert('jt_5cd_registros',[d,String(code)]);
  for(const k of ['Avaria','Extravio','PNR'])await insert('jt_arbitragem_ocorrencias',[k,rm,d,null,d,name,supervisor,'Processo encerrado',100]);
 }
}
await seed('Ana',1);await seed(null,2);await seed('Darley Outro',3);
const kinds=['sla','t0','capotamento','shipping','sem_mov','retidos','1bd','5cd','avaria','extravio','pnr'];
const query=async(_,sql,params)=>(await db.query(sql,params)).rows;
const clean=r=>JSON.parse(JSON.stringify(r,(k,v)=>k==='checkedAt'?undefined:v));
const baseline={};for(const k of kinds)baseline[k]=clean(await readDirect(k,now,query));
await seed('  darley  wallace\tCUNHA\nQUARESMA  ',99);
for(const k of kinds){assert.deepEqual(clean(await readDirect(k,now,query)),baseline[k],k+' must exclude all Darley totals/history/S/C');}
// Supervisor assignment must also remove the record, including a shared coordinator.
await db.exec(`UPDATE entregas SET coordenador='Ana',supervisor='DARLEY WALLACE CUNHA QUARESMA' WHERE codigo_base=99;
UPDATE capotamento_diario SET supervisor=coordenador,coordenador='Ana' WHERE coordenador LIKE '%darley%';
UPDATE jt_arbitragem_ocorrencias SET supervisor=coordenador,coordenador='Ana' WHERE coordenador LIKE '%darley%';
UPDATE jt_1bd_gestao SET supervisor=sc,sc='Ana',coordenador='Ana' WHERE base_chave='99';
UPDATE shipping_time_diario SET sc='Ana' WHERE codigo_base=99;`);
for(const k of kinds)assert.deepEqual(clean(await readDirect(k,now,query)),baseline[k],k+' supervisor and Shipping base scope');
assert.throws(()=>teamScope('sc; DELETE'),/inválida/);
await db.close();console.log('Middle Mile exclusion passed for all 11 indicators, totals, historical periods, roles, nulls and Shipping base mapping.');
