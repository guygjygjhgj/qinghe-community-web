export const GAME_WORKS_KEY='qinghe-game-works-v1';
export function loadGameRecords(storage){try{const value=JSON.parse(storage.getItem(GAME_WORKS_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
export function saveGameRecord(storage,record){
 const saved={...record,local:true,updated:new Date().toISOString()};
 // Read the latest committed snapshot: consecutive session/collection saves must retain both.
 const records=[saved,...loadGameRecords(storage).filter(r=>r.id!==saved.id)];
 storage.setItem(GAME_WORKS_KEY,JSON.stringify(records));
 return {saved,records};
}
