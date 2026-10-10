import {validDate} from './organization-fields';
export function hasCompleteNote(snapshot:string){
 try{const s=JSON.parse(snapshot);return !!(String(s.promissory_note_number||'').trim()&&String(s.promissory_note_platform_ref||'').trim()&&Number.isFinite(Number(s.promissory_note_amount))&&Number(s.promissory_note_amount)>0&&validDate(s.promissory_note_issue_date)&&validDate(s.promissory_note_due_date)&&s.promissory_note_due_date>=s.promissory_note_issue_date);}catch{return false}
}
