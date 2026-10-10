export const operationQueues = [
 {id:'new',label:'طلبات جديدة',statuses:['جديد']},
 {id:'pricing',label:'تحتاج تسعيراً',statuses:['قيد التسعير','نقص معلومات']},
 {id:'ready',label:'جاهزة للتنفيذ',statuses:['قيد التنفيذ','تأكيد المورد']},
 {id:'review',label:'تغيير / مراجعة',statuses:['إعداد عرض']},
 {id:'escalated',label:'حالات مصعّدة',statuses:['تم التصعيد']},
 {id:'urgent',label:'حالات عاجلة',statuses:[]},
] as const;
export type OperationQueue = typeof operationQueues[number]['id'];
export function parseOperationQueue(value:unknown):OperationQueue|undefined {
 return typeof value==='string' ? operationQueues.find(q=>q.id===value)?.id : undefined;
}
export function matchesOperationQueue(row:{status:string;priority:string},queue:OperationQueue):boolean {
 if(queue==='urgent')return row.priority==='عاجل';
 const definition=operationQueues.find(q=>q.id===queue);
 return !!definition && (definition.statuses as readonly string[]).includes(row.status);
}
