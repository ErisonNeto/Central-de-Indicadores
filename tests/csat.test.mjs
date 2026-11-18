import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readDirect} from '../lib/direct.js';
import {monthlyResults,monthlyRange} from '../lib/monthly.js';
const db=new PGlite();
await db.exec(`CREATE TABLE jt_csat_registros(id text,data_avaliacao text,semana_id text,rm text,
 coordenador text,supervisor text,sc text,tipo_sc text,avaliacao integer);
INSERT INTO jt_csat_registros VALUES
('1','2026-11-03','2026-W45','ORLEAN DA SILVA DO NASCIMENTO','Ana',null,'Ana','Coordenador',1),
('2','2026-11-03','2026-W45','ORLEAN DA SILVA DO NASCIMENTO','Ana',null,'Ana','Coordenador',0),
('3','2026-11-03','2026-W45','ORLEAN DA SILVA DO NASCIMENTO',null,'Beto','Beto','Supervisor',1),
('4','2026-11-02','2026-W45','ORLEAN DA SILVA DO NASCIMENTO','Ana',null,'Ana','Coordenador',1),
('5','2026-10-31','2026-W45','ORLEAN DA SILVA DO NASCIMENTO','Ana',null,'Ana','Coordenador',1),
('6','2026-10-27','2026-W44','ORLEAN DA SILVA DO NASCIMENTO','Ana',null,'Ana','Coordenador',0),
('7','2026-10-28','2026-W44','ORLEAN DA SILVA DO NASCIMENTO',null,'Beto','Beto','Supervisor',1),
('8','2026-11-03','2026-W45','ORLEAN DA SILVA DO NASCIMENTO','Darley Wallace Cunha Quaresma',null,'Darley Wallace Cunha Quaresma','Coordenador',0),
('9','2026-11-03','2026-W45','OUTRA RM','Fora',null,'Fora','Coordenador',0);`);
await db.exec(`CREATE SCHEMA jt_operacao;
CREATE TABLE jt_operacao.vw_gestao_colaboradores_atual(estacao_no text PRIMARY KEY,responsavel_regiao text,coordenador text,supervisor text);
INSERT INTO jt_operacao.vw_gestao_colaboradores_atual VALUES
('1','ORLEAN DA SILVA DO NASCIMENTO','Ana',NULL),
('2','ORLEAN DA SILVA DO NASCIMENTO',NULL,'Beto'),
('3','ORLEAN DA SILVA DO NASCIMENTO','Darley Wallace Cunha Quaresma',NULL),
('9','OUTRA RM','Fora',NULL);
ALTER TABLE jt_csat_registros ADD COLUMN codigo text;
UPDATE jt_csat_registros SET codigo=CASE WHEN coordenador='Ana' THEN '1'
 WHEN supervisor='Beto' THEN '2'
 WHEN coordenador LIKE 'Darley%' THEN '3' ELSE '9' END;`);
const query=async(_,sql,args)=>(await db.query(sql,args)).rows;
const now=new Date('2026-11-05T15:00:00Z'),r=await readDirect('csat',now,query);
assert.equal(r.indicator.periods.reference,'2026-11-03');
assert.equal(r.indicator.day.count,3);
assert.equal(r.indicator.day.value,200/3);
assert.equal(r.indicator.day.positives,2);
assert.equal(r.indicator.day.negatives,1);
assert.equal(r.indicator.day.goal,null);
assert.equal(r.indicator.month.value,75);
assert.equal(r.indicator.comparison.week.weekId,'2026-W45');
assert.equal(r.indicator.comparison.week.value,80,'Official week D includes H=Oct 31');
assert.equal(r.indicator.comparison.previousWeek.weekId,'2026-W44');
assert.equal(r.indicator.comparison.previousWeek.value,50);
assert.equal(r.indicator.comparison.previousDay.value,0);
assert.equal(r.sc.rows[0].name,'Ana');
assert.ok(!r.sc.rows.some(r=>r.name==='Fora'||r.name.startsWith('Darley')));
assert.equal(monthlyRange('2026-11','csat',now).end,'2026-11-03');
const m=await monthlyResults('csat','2026-11',now,query);
assert.equal(m.rows.length,2);
const ana=m.rows.find(r=>r.name==='Ana');
assert.equal(ana.current.value,200/3);
assert.equal(ana.current.count,3);
assert.equal(ana.history.length,3);
assert.equal(ana.history[0].value,null);
assert.equal(ana.history[2].value,200/3);
const none=await readDirect('csat',new Date('2026-12-20T15:00:00Z'),query);
assert.equal(none.indicator.day.value,null);
const missing=new PGlite();
await assert.rejects(readDirect('csat',now,async(_,sql,args)=>(await missing.query(sql,args)).rows));
await missing.close();
await db.close();
console.log('CSAT SQL: official D vs H, D-2, month, S/C, weighted rates and Orlean scope passed.');
