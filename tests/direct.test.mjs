import assert from 'node:assert/strict';
import {readDirect,directResults} from '../lib/direct.js';
const now=new Date('2026-10-28T12:00:00Z');
async function read(kind,data,mapping=[]){
 const calls=[];
 const result=await readDirect(kind,now,async(source,sql,values)=>{
  calls.push({source,sql,values});
  assert.ok(!sql.includes('ORLEAN TEST'));
  if(sql.includes('DISTINCT rm'))return [{rm:'ORLEAN TEST'}];
  if(sql.includes('DISTINCT data_sla'))return mapping;
  assert.deepEqual(values.slice(0,2),['2026-10-01','2026-10-27']);
  return data;
 });
 return {...result,calls};
}
const sla=await read('sla',[
 {data:'2026-10-26',coordenador:'A',supervisor:'B',pedidos:90,sla:1},
 {data:'2026-10-27',coordenador:'A',supervisor:'B',pedidos:10,sla:0}]);
assert.equal(sla.indicator.month.value,90);
assert.equal(sla.indicator.day.value,0);
assert.equal(sla.indicator.month.goal,97);
assert.equal(sla.sc.rows.length,2);
assert.equal(sla.calls.length,2);
const cap=await read('capotamento',[
 {data:'2026-10-27',coordenador:'Pricila',status_risco:'ALERTA'},
 {data:'2026-10-26',supervisor:'Ana',status_risco:'CAPOTADA'},
 {data:'2026-10-27',coordenador:'Ana',status_risco:'NORMAL'}]);
assert.equal(cap.indicator.month.value,200/3);
assert.equal(cap.indicator.day.value,50);
assert.equal(cap.indicator.month.alerts,1);
assert.equal(cap.indicator.month.cap,1);
assert.equal(cap.indicator.month.available,2);
assert.equal(cap.indicator.month.expected,27);
assert.equal(cap.sc.rows[0].name,'Pricila');
assert.equal(cap.calls.length,2); // No per-day queries.
const ship=await read('shipping',[
 {data:'2026-10-27',codigo_base:'1',sc:'A',pacotes:10,weighted:200},
 {data:'2026-10-26',codigo_base:'2',sc:'B',pacotes:90,weighted:3600},
 {data:'2026-10-27',codigo_base:'2',sc:'B',pacotes:10,weighted:400}],
 [{data:'2026-10-27',codigo_base:'1'},{data:'2026-10-26',codigo_base:'2'}]);
assert.equal(ship.indicator.day.value,20); // Base 2 belongs only to monthly scope.
assert.equal(ship.indicator.month.value,4200/110);
assert.equal(ship.indicator.month.goal,null);
assert.equal(ship.sc.rows[0].name,'A'); // Missing daily value comes last.
assert.equal(ship.calls.length,3);
const t0=await read('t0',[
 {data:'2026-10-27',sc:'A',total:90,ok:90},
 {data:'2026-10-27',sc:'B',total:10,ok:0}]);
assert.equal(t0.indicator.day.value,90);
assert.equal(t0.sc.rows[0].name,'B');
assert.equal(t0.indicator.day.goal,70);
const empty=await read('sla',[]);assert.equal(empty.indicator.day.value,null);
await assert.rejects(readDirect('sla',now,async()=>[{rm:'Orlean A'},{rm:'Orlean B'}]),/Mais de um/);
const first=await readDirect('t0',new Date('2026-11-01T12:00:00Z'),async(_,sql)=>sql.includes('DISTINCT rm')?[{rm:'Orlean'}]:[{data:'2026-10-31',sc:'A',total:10,ok:7}]);
assert.equal(first.indicator.month.value,null);
assert.equal(first.indicator.day.value,70);
let n=0;
const loader=async()=>{n++;return {indicator:{},sc:{}};};
const [a,b]=await Promise.all([directResults('sla',now,loader),directResults('sla',now,loader)]);
assert.equal(n,1);assert.equal(a,b);
await directResults('sla',now,loader);assert.equal(n,1);
await assert.rejects(directResults('t0',now,async()=>{throw new Error('offline');}),/offline/);
await directResults('t0',now,loader);assert.equal(n,2);
console.log('Direct SQL adapter: weights, roles, scope, periods, errors and cache passed.');
