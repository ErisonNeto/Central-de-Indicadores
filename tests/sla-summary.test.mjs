import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readDirect} from '../lib/direct.js';
import {monthlyResults} from '../lib/monthly.js';
const db=new PGlite();
await db.exec(`
 CREATE TABLE sla_resumo_diario(data_sla date,codigo_base text,rm text,sc text,qtd_a_entregar bigint,qtd_no_prazo bigint);
 CREATE TABLE entregas(data_sla date,codigo_base text,rm text,coordenador text,supervisor text,no_prazo bool);
 INSERT INTO entregas VALUES ('2026-11-16','LEGADO','ORLEAN DA SILVA DO NASCIMENTO','Ana',null,false);
 INSERT INTO sla_resumo_diario VALUES
 ('2026-11-01','1','ORLEAN DA SILVA DO NASCIMENTO','Ana',500000,480000),
 ('2026-11-16','2','ORLEAN DA SILVA DO NASCIMENTO','Beto',599337,573660),
 ('2026-11-16','9','OUTRA RM','Fora',1000000,0),
 ('2026-11-16','3','ORLEAN DA SILVA DO NASCIMENTO','DARLEY WALLACE CUNHA QUARESMA',1000000,0);
 CREATE TABLE shipping_time_diario(data date,codigo_base text,sc text,pacotes int,etapa_6_h numeric,etapa_7_h numeric,etapa_8_h numeric);
 INSERT INTO shipping_time_diario VALUES ('2026-11-01','1','Ana',20,10,1,2),('2026-11-16','2','Beto',30,20,1,2),('2026-11-16','9','Fora',1000,100,50,50);
`);
const query=async(_,sql,args)=>(await db.query(sql,args)).rows;
const now=new Date('2026-11-17T12:00:00Z');
const sla=await readDirect('sla',now,query);
const expected=1053660/1099337*100;
assert.ok(Math.abs(expected-95.85)<0.01);
assert.ok(Math.abs(sla.indicator.month.value-expected)<1e-9);
assert.equal(sla.indicator.month.count,1099337);
assert.equal(sla.indicator.day.count,599337);
assert.equal(sla.indicator.day.goal,97);
assert.equal(sla.indicator.month.goal,97);
assert.equal(sla.sc.rows.length,2);
assert.ok(!sla.sc.rows.some(r=>r.name==='Fora'||r.name==='DARLEY WALLACE CUNHA QUARESMA'));
assert.equal(sla.sc.rows[0].name,'Beto');
const shipping=await readDirect('shipping',now,query);
assert.equal(shipping.indicator.month.count,50);
const monthly=await monthlyResults('sla','2026-11',now,query);
assert.equal(monthly.rows.length,2);
assert.equal(monthly.rows.find(x=>x.name==='Ana').current.count,500000);
assert.equal(monthly.rows.find(x=>x.name==='Beto').current.count,599337);
await db.close();
console.log('SLA official Resumo JMS: N/K, Orlean, D-1, no legacy fallback, Shipping map and monthly S/C passed.');
