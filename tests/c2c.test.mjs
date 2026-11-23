import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readDirect} from '../lib/direct.js';
import {c2cDays} from '../lib/c2c.js';
const db=new PGlite();
await db.exec(`CREATE TABLE c2c_bases(codigo_base text PRIMARY KEY,rm text,sc text,ativo boolean);
CREATE TABLE c2c_remessas(remessa text,data_envio text,base_key text);
INSERT INTO c2c_bases VALUES
('A','ORLEAN DA SILVA DO NASCIMENTO','Ana',true),
('B','ORLEAN DA SILVA DO NASCIMENTO','Ana',true),
('C','ORLEAN DA SILVA DO NASCIMENTO','Beto',true),
('D','ORLEAN DA SILVA DO NASCIMENTO','Darley Wallace Cunha Quaresma',true),
('E','OUTRA RM','Fora',true),('F','ORLEAN DA SILVA DO NASCIMENTO','Inativo',false);
INSERT INTO c2c_remessas VALUES ('1','2026-11-17','A'),('1','2026-11-17','A'),
('2','2026-11-16','B'),('3','2026-11-10','C'),('4','2026-11-17','D'),
('5','2026-11-17','E'),('6','2026-11-17','F'),('','2026-11-17','A');`);
const query=async(_,sql,args)=>(await db.query(sql,args)).rows;
const now=new Date('2026-11-18T15:00:00Z');
const r=await readDirect('c2c',now,query);
assert.equal(r.indicator.day.count,1);
assert.equal(r.indicator.day.target,3);
assert.equal(r.indicator.day.value,100/3);
assert.equal(r.indicator.month.count,3);
assert.equal(r.indicator.month.target,90);
assert.equal(r.indicator.month.value,100/30);
assert.equal(r.sc.rows.length,2);
assert.equal(r.sc.rows[0].name,'Beto');
assert.equal(r.sc.rows[0].day.value,0);
assert.equal(r.sc.rows[1].day.target,2);
assert.equal(r.indicator.comparison.previousWeek.from,'2026-11-09');
assert.equal(r.indicator.comparison.previousWeek.to,'2026-11-15');
assert.equal(r.indicator.comparison.previousWeek.target,21);
assert.equal(r.indicator.comparison.previousDay.count,1);
assert.equal(c2cDays('2026-10-01','2026-10-31'),30);
assert.equal(c2cDays('2026-10-31','2026-10-31'),0);
const m=await readDirect('c2c',now,query,{start:'2026-11-01',end:'2026-11-17'});
const ana=m.rows.find(r=>r.name==='Ana');
assert.equal(ana.current.value,100/30);
assert.equal(ana.current.count,2);
assert.equal(ana.current.change.amount,100/60);
assert.equal(ana.history[0].value,null);
const empty=await readDirect('c2c',new Date('2026-11-19T15:00:00Z'),query);
assert.equal(empty.indicator.day.value,null,'No records is unknown, not confirmed zero');
await db.close();
console.log('C2C: unique shipments, active bases, team scope, targets, calendar weeks and monthly history passed.');
