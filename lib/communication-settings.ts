export const notificationEvents = [
  ['account_created','إنشاء حساب الشركة'],
  ['request_created','استلام طلب جديد'],
  ['booking_confirmed','تأكيد الحجز'],
] as const;
export type CommunicationSettings = {sms:{provider:string;sender:string};email:{senderName:string;from:string};templates:{event:string;channel:'sms'|'email';subject:string;body:string}[]};
export function communicationDefaults():CommunicationSettings{return {sms:{provider:'رسائلنا',sender:''},email:{senderName:'خبراء الرحلات',from:''},templates:notificationEvents.map(([event,label])=>({event,channel:'sms',subject:label,body:event==='account_created'?'مرحباً {{اسم_الشركة}}، تم إنشاء حسابكم لدى خبراء الرحلات.':event==='request_created'?'مرحباً {{اسم_الشركة}}، استلمنا طلبكم رقم {{رقم_الطلب}} لدى خبراء الرحلات.':'مرحباً {{اسم_الشركة}}، تم تأكيد حجزكم رقم {{رقم_الحجز}} لدى خبراء الرحلات.'}))};}
export const messageTokens=['اسم_الشركة','رقم_الطلب','رقم_الحجز'];
export function validCommunicationSettings(value:unknown):value is CommunicationSettings {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const b=value as CommunicationSettings;
  const keys=(o:unknown,k:string[])=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===k.length&&Object.keys(o).every(x=>k.includes(x));
  const str=(s:unknown,max:number)=>typeof s==='string'&&s.length<=max;
  if(!keys(b,['sms','email','templates'])||!keys(b.sms,['provider','sender'])||!keys(b.email,['senderName','from']))return false;
  if(b.sms.provider!=='رسائلنا'||!str(b.sms.sender,50)||!str(b.email.senderName,100)||!str(b.email.from,254))return false;
  if(b.email.from&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.from))return false;
  if(!Array.isArray(b.templates)||b.templates.length!==notificationEvents.length)return false;
  return notificationEvents.every(([event])=>b.templates.filter(t=>t?.event===event).length===1)&&b.templates.every(t=>keys(t,['event','channel','subject','body'])&&['sms','email'].includes(t.channel)&&str(t.subject,150)&&str(t.body,2000)&&!!t.body.trim()&&[...`${t.subject} ${t.body}`.matchAll(/\{\{([^{}]+)\}\}/g)].every(m=>messageTokens.includes(m[1])));
}
