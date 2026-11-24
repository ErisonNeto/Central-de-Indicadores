import assert from 'node:assert/strict';
import {kpiTone,lmKpis} from '../lib/kpi-status.js';
for(const [id,m] of Object.entries(lmKpis)){
 assert.equal(kpiTone(m.target,m.target,m.minimum,m.up),'good',id+' target inclusive');
 assert.equal(kpiTone(m.minimum,m.target,m.minimum,m.up),'warning',id+' minimum inclusive');
 assert.equal(kpiTone((m.target+m.minimum)/2,m.target,m.minimum,m.up),'warning',id+' intermediate');
 assert.equal(kpiTone(m.minimum+(m.up?-0.001:0.001),m.target,m.minimum,m.up),'bad',id+' outside');
 assert.equal(kpiTone(null,m.target,m.minimum,m.up),'neutral');
 assert.equal(kpiTone(NaN,m.target,m.minimum,m.up),'neutral');
}
assert.equal(kpiTone(0,0,null,false),'good');
assert.equal(kpiTone(0,null,null,false),'neutral');
console.log('KPI LM: inclusive target/minimum, both directions, missing data and zero passed');
