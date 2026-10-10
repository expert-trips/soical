import {saudiToday} from './booking-workflow';
export type QuoteInput={presetId:string;requestId:string;supplierId:string;offeringId:string;net:string;tax:string;quantity:string;supplierUnits:string;fxRate:string;fxReference:string;validUntil:string;supplierReference:string;supplierTerms:string;parentQuoteId:string;revisionReason:string};
export const emptyQuoteInput=(requestId=''):QuoteInput=>({presetId:'',requestId,supplierId:'',offeringId:'',net:'',tax:'',quantity:'1',supplierUnits:'1',fxRate:'1',fxReference:'',validUntil:'',supplierReference:'',supplierTerms:'',parentQuoteId:'',revisionReason:''});
export function cleanQuoteInput(value:unknown):QuoteInput {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('بيانات العرض غير صالحة');
 const result=emptyQuoteInput(),v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>!Object.hasOwn(result,k)))throw Error('حقول غير معروفة في العرض');
 for(const key of Object.keys(result) as (keyof QuoteInput)[]){
  if(typeof v[key]!=='string'||v[key].length>(key==='supplierTerms'?4000:key==='revisionReason'?1000:200))throw Error('راجع حقل '+key);
  result[key]=v[key] as string;
 }
 return result;
}
export const quoteNumber=(id:string)=>'QT-'+id.toUpperCase();
export function quoteState(p:{status:string;validUntil:string},used=false){
 return used?'مرتبط بحجز':['ملغي','مرفوض'].includes(p.status)?p.status:p.validUntil<saudiToday()?'منتهي الصلاحية':p.status;
}
export function resetQuoteContext(previous:QuoteInput,requestId:string):QuoteInput{return emptyQuoteInput(requestId)}
