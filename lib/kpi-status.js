// GP-PA / Gestores LM. Values must use the same unit as their thresholds.
/** @param {number | null | undefined} value @param {number | null | undefined} target @param {number | null | undefined} minimum @param {boolean} up */
export function kpiTone(value, target, minimum=null, up=true) {
 if(typeof value!=='number'||!Number.isFinite(value)||typeof target!=='number'||!Number.isFinite(target))return 'neutral';
 if(up?value>=target:value<=target)return 'good';
 if(typeof minimum==='number'&&Number.isFinite(minimum)&&(up?value>=minimum:value<=minimum))return 'warning';
 return 'bad';
}
export const kpiLabel=tone=>({good:'Dentro da meta',warning:'Mínimo atingido · abaixo da meta',bad:'Fora do mínimo',neutral:'Sem meta definida'}[tone]);
export const lmKpis={
 sla:{target:97,minimum:93,up:true,unit:'%'},
 '1bd':{target:85,minimum:80,up:true,unit:'%'},
 c2c:{target:100,minimum:100*20/30,up:true,unit:'%'},
 sem_mov:{target:5,minimum:6,up:false,unit:'%'},
 retidos:{target:3,minimum:7,up:false,unit:'%'},
 avaria:{target:20,minimum:24,up:false,unit:'PPM'},
 extravio:{target:400,minimum:500,up:false,unit:'PPM'},
 custo_coleta:{target:-0.10,minimum:-0.05,up:false,unit:'BRL/package change'},
 custo_entrega:{target:-0.10,minimum:-0.05,up:false,unit:'BRL/package change'}
};
