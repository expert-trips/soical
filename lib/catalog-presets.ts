import {type Supplier,offeringAvailable,offeringCosts,type Offering,todayInSaudi} from './supplier-catalog';
import {type ServiceConfig,calculateServicePrice} from './service-catalog';
export type CatalogPreset={id:string;revision:number;service:string;country:string;city:string;title:string;unit:string;net:number;tax:number;status:'مسودة'|'متاح'|'موقوف';supplierId:string;reference:string;validUntil:string;terms:string;cancellation:string;nationality:string;visaType:string;priceConfirmed:boolean};
const destinations='AE BH KW QA OM EG JO LB TR GB FR DE IT ES CH AT NL BE GR PT CZ HU PL SE NO DK FI IE CY GE AZ AM BA AL RS ME MK RU CN JP KR TH MY SG ID PH VN KH LK IN NP MV MU SC ZA KE TZ MA TN DZ US CA MX BR AU NZ UZ KZ'.split(' ');
const names=new Intl.DisplayNames(['ar'],{type:'region'});
const visaTerms='خدمة مساعدة في تجهيز وتقديم الطلب بعد التحقق من متطلبات الجهة المختصة بحسب جنسية المسافر ونوع جوازه ووجهته ونوع التأشيرة. يزوّد العميل الفريق ببيانات صحيحة والمستندات المطلوبة بعد مراجعتها. لا يمثل هذا البند إثباتًا لحاجة المسافر إلى تأشيرة أو أهليته لها، ولا يضمن صدورها أو مدتها أو موعد البت فيها. تُحدد الرسوم الحكومية ورسوم المراكز وما يشمله السعر كتابةً قبل الموافقة. السعر المعروض تجريبي حتى اعتماده.';
const cancellation='تُعرض شروط المورد والجهة المختصة ورسوم التعديل والإلغاء والاسترداد قبل موافقة العميل. لا تُفترض قابلية الاسترداد ولا عدمها دون توثيق. لا تنفذ الخدمة قبل اعتماد العرض.';
export function defaultPresets():CatalogPreset[]{
 const base={revision:0,net:500,tax:0,status:'مسودة' as const,supplierId:'',reference:'',validUntil:'',nationality:'',visaType:'يحدد بعد مراجعة الطلب',priceConfirmed:false,cancellation};
 const visas=destinations.map(country=>({...base,id:'PRESET-VISA-'+country,service:'تأشيرات',country:names.of(country)||country,city:'',title:'خدمات التأشيرات — '+names.of(country),unit:'مسافر',terms:visaTerms}));
 const cities=[['السعودية','الرياض'],['السعودية','جدة'],['السعودية','الدمام'],['السعودية','المدينة المنورة'],['السعودية','القصيم'],['السعودية','أبها'],['الإمارات العربية المتحدة','دبي'],['الإمارات العربية المتحدة','أبوظبي'],['قطر','الدوحة'],['البحرين','المنامة'],['الكويت','الكويت'],['عُمان','مسقط'],['مصر','القاهرة'],['تركيا','إسطنبول'],['المملكة المتحدة','لندن'],['فرنسا','باريس']];
 const meet=cities.flatMap(([country,city],i)=>['استقبال عند الوصول','توديع عند المغادرة'].map((kind,j)=>({...base,id:'PRESET-MEET-'+i+'-'+j,service:'استقبال وتوديع',country,city,title:kind+' — '+city,unit:'حجز',terms:'تنسيق '+kind+' حسب المطار والصالة ورقم الرحلة وتاريخها وعدد المسافرين. يحدد المورد نقطة اللقاء ونطاق المساعدة كتابةً قبل التأكيد. لا يشمل السعر التجريبي تلقائيًا النقل البري أو الصالات أو المسار السريع أو حمل الأمتعة أو خدمة خاصة؛ تُذكر الإضافات ورسومها في العرض. الخدمة رهينة توفر المورد وموافقات المطار. تُراجع تغييرات الرحلة والتأخير قبل التنفيذ.'})));
 return [...visas,...meet];
}
export function presetAvailable(p:CatalogPreset,supplier:Supplier|undefined,today=todayInSaudi()){
 return p.status==='متاح'&&p.priceConfirmed&&!!supplier&&supplier.status==='نشط'&&supplier.mode!=='ربط مباشر'&&supplier.services.includes(p.service)&&!!p.reference.trim()&&p.validUntil>=today&&!!p.terms.trim()&&!!p.cancellation.trim()&&(p.service!=='تأشيرات'||!!p.nationality.trim()&&!!p.visaType.trim()&&p.visaType!=='يحدد بعد مراجعة الطلب');
}
export type SearchItem={id:string;source:'preset'|'offering';title:string;service:string;country:string;city:string;unit:string;net:number;tax:number;currency:string;terms:string;cancellation:string;available:boolean;supplierId:string;revision:number;nationality?:string};
export function catalogSearch(presets:CatalogPreset[],offerings:Offering[],suppliers:Supplier[],criteria:{service:string;query:string;includeDrafts:boolean}){
 const all:SearchItem[]=[...presets.map(p=>({...p,source:'preset' as const,currency:'SAR',available:presetAvailable(p,suppliers.find(s=>s.id===p.supplierId))})),...offerings.map(o=>({...o,source:'offering' as const,available:offeringAvailable(o,suppliers.find(s=>s.id===o.supplierId))}))];
 const normalize=(s:string)=>s.normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLocaleLowerCase();
 return all.filter(x=>(!criteria.service||x.service===criteria.service)&&(criteria.includeDrafts||x.available)&&normalize([x.title,x.country,x.city,x.nationality||''].join(' ')).includes(normalize(criteria.query.trim())));
}
export function catalogPreview(item:SearchItem,service:ServiceConfig,units:number,commissionUnits:number,fxRate:number){
 // Same cost and commission calculation used by the saved-quote workflow.
 if(!Number.isInteger(units)||units<1||units>10000)throw Error('كمية المورد غير صالحة');
 const costs=offeringCosts(item,units,fxRate);
 return calculateServicePrice(service,costs.net,costs.tax,commissionUnits);
}
