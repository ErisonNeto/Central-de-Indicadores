import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readDirect} from '../lib/direct.js';
const db=new PGlite();
await db.exec(`
CREATE TABLE entregas(data_sla date, codigo_base int, rm text, coordenador text, supervisor text,no_prazo bool);
INSERT INTO entregas VALUES ('2026-10-27',1,'Orlean','Ana','Bia',true),('2026-10-27',1,'Orlean','Ana','Bia',false),('2026-10-26',2,'Orlean','Ana','Bia',true),('2026-10-27',3,'Outro','Fora',null,true);
CREATE TABLE t0_diario(data date,rm text,sc text,total_pedidos int,t0_ok int);
INSERT INTO t0_diario VALUES ('2026-10-27','Orlean','Ana',10,7),('2026-10-27','Outro','Fora',100,0);
CREATE TABLE capotamento_diario(data date,rm text,coordenador text,supervisor text,status_risco text);
INSERT INTO capotamento_diario VALUES ('2026-10-27','Orlean','Pricila',null,'ALERTA'),('2026-10-27','Orlean','Ana',null,'NORMAL'),('2026-10-27','Outro','Fora',null,'CAPOTADA');
CREATE TABLE shipping_time_diario(data date,codigo_base int,sc text,pacotes int,etapa_6_h numeric,etapa_7_h numeric,etapa_8_h numeric);
INSERT INTO shipping_time_diario VALUES ('2026-10-27',1,'Ana',10,10,5,5),('2026-10-27',3,'Fora',100,100,100,100),('2026-10-26',2,'Bia',90,20,10,10);
`);
const query=async(_,sql,params)=>(await db.query(sql,params)).rows;
const now=new Date('2026-10-28T12:00:00Z');
for(const [kind,day,month] of [['sla',50,200/3],['t0',70,70],['capotamento',50,50],['shipping',20,38]]){
 const r=await readDirect(kind,now,query);
 assert.ok(Math.abs(r.indicator.day.value-day)<1e-8);
 assert.ok(Math.abs(r.indicator.month.value-month)<1e-8);
 assert.ok(!r.sc.rows.some(x=>x.name==='Fora'));
 console.log(kind+': actual SQL executed, weighted values and Orlean scope passed');
}
await db.close();
