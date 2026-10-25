export const normalizeNickname=value=>String(value??'').trim().replace(/\s+/g,' ');
export const validNickname=value=>/^[A-Za-z0-9 _-]{3,18}$/.test(normalizeNickname(value));

// Refreshing rankings or receiving another tab's progress must not steal typing.
const textFields=new Set(['trivia-written-answer','board-nickname','identity-name','guess-search','picker-search']);
export function captureInputFocus(doc){
 const node=doc.activeElement;if(!textFields.has(node?.id))return null;
 return {id:node.id,start:node.selectionStart,end:node.selectionEnd,direction:node.selectionDirection};
}
export function restoreInputFocus(doc,saved){
 const node=doc.getElementById(saved.id);if(!node||node.disabled)return;
 node.focus({preventScroll:true});
 if(typeof node.setSelectionRange==='function'&&Number.isInteger(saved.start))node.setSelectionRange(saved.start,saved.end,saved.direction||'none');
}
