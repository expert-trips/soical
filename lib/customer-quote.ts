export function customerQuote(q:{quote_id:string;payload:any}){
 const p=q.payload;
 return {number:p.number||'QT-'+q.quote_id.toUpperCase(),company:p.company?.name||'',service:p.service?.name||'',destination:p.requestSnapshot?.destination||'',quantity:p.quantity||1,unit:p.service?.unit||'خدمة',validUntil:p.validUntil,status:p.status,
  subtotal:Number(p.amounts.supplierNet)+Number(p.amounts.fee),tax:Number(p.amounts.supplierTax)+Number(p.amounts.feeTax),total:Number(p.amounts.total),
  terms:[p.service?.terms,p.service?.cancellation,p.service?.refund,p.supplierTerms||p.offeringSnapshot?.offering?.terms,p.offeringSnapshot?.offering?.cancellation].filter(Boolean),
  provider:p.providerSnapshot||null};
}
