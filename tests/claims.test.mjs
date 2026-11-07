import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readDirect} from '../lib/direct.js';
const db=new PGlite();
await db.exec(`CREATE TABLE jt_arbitragem_ocorrencias(tipo text,rm text,fechada_em text,declarada_em text,data text,coordenador text,supervisor text,status text,valor_centavos bigint);
INSERT INTO jt_arbitragem_ocorrencias VALUES
('Avaria','ORLEAN','2026-11-06','2026-10-15','2026-10-15','Ana','Beto','Processo encerrado',12345),
('Avaria','ORLEAN','2026-11-07',null,null,'Ana',null,'ARBITRAGEM FINALIZADA',2000),
('Avaria','ORLEAN','2026-11-06',null,null,'Ana','Beto','Revogado',90000),
('Avaria','ORLEAN','2026-10-30',null,null,'Ana',null,'  ÁRBITRAGEM   FINALIZADA ',300),
('Extravio','ORLEAN',null,'2026-11-06',null,'Caio',null,'Processo encerrado',456),
('PNR','ORLEAN',null,null,'2026-11-06','Dani',null,'Apelação',700),
('Avaria','OUTRO','2026-11-06',null,null,'Fora',null,'Processo encerrado',99999),
('Avaria','ORLEAN','2026-11-09',null,null,'Futuro',null,'Processo encerrado',99999);`);
const query=async(k,sql,args)=>(await db.query(sql,args)).rows;
const now=new Date('2026-11-07T15:00Z');
const a=await readDirect('avaria',now,query);
assert.equal(a.indicator.day.value,123.45);
assert.equal(a.indicator.day.count,1);
assert.equal(a.indicator.day.reviewValue,900);
assert.equal(a.indicator.month.value,143.45);
assert.equal(a.indicator.comparison.week.from,'2026-11-02');
assert.equal(a.indicator.comparison.week.to,'2026-11-08');
assert.equal(a.indicator.comparison.previousWeek.from,'2026-10-26');
assert.equal(a.indicator.comparison.previousWeek.to,'2026-11-01');
assert.equal(a.indicator.comparison.previousDay.value,3);
assert.deepEqual(a.sc.rows.map(x=>x.name),['Ana','Beto']);
assert.equal(a.sc.rows[0].week.value,143.45);
assert.equal(a.sc.rows[1].day.value,123.45); // roles don't duplicate total
assert.equal((await readDirect('extravio',now,query)).indicator.day.value,4.56);
const p=(await readDirect('pnr',now,query)).indicator.day;
assert.equal(p.value,0);assert.equal(p.count,0);assert.equal(p.reviewCount,1);
const empty=await readDirect('avaria',new Date('2026-12-20T15:00Z'),query);
assert.equal(empty.indicator.day.value,null);
await db.close();console.log('Claims SQL passed: dates, scope, categories, cents, final statuses, review, weeks, roles, missing records.');
