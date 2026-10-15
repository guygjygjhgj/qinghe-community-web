export const FINISHED_ASSET='/luffa-r7/assets/loofah-finished-v9.png';
const prepared=new Set(['try','scrub','rinse','return','complete']);
// Once the fibers have been prepared, rinsing and saving must not show fruit again.
export function finishedMix(state){
 if(prepared.has(state.stage))return 1;
 return state.stage==='dry'?Math.max(0,Math.min(1,Number(state.dry)||0)):0;
}
