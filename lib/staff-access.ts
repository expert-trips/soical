export const staffRoles=['عمليات','محاسبة','قراءة فقط'] as const;
export type StaffRole=typeof staffRoles[number];
export type StaffRecord={id:string;name:string;email:string;phone:string;department:string;job_title:string;role:StaffRole;status:string;created_at:string;updated_at:string};
export function allowedStaffRoute(role:StaffRole,path:string,method:string){
 const read=['GET','HEAD','OPTIONS'].includes(method);
 if(path==='/operations'&&read)return staffRoles.includes(role);
 if(path==='/api/session')return read;
 if(path==='/api/catalog-presets')return read||(role==='عمليات'&&method==='PUT');
 if(path==='/api/service-catalog')return read;
 if(path==='/api/supplier-catalog')return read;
 if(path==='/api/service-quotes')return read||(role==='عمليات'&&method==='POST');
 if(path.startsWith('/admin')||path.startsWith('/api/staff')||path.startsWith('/api/contract-template')||path.startsWith('/api/provider-profile')||path.includes('/documents')||path.includes('/archives')||path.startsWith('/api/contract-archive'))return false;
 const operations=['/operations','/requests','/projects','/support','/services','/suppliers'];
 if(path==='/'||path==='/reports')return read;
 if(role==='قراءة فقط')return read&&([...operations,'/finance','/organizations','/contracts'].some(p=>path===p||path.startsWith(p+'/'))||path.startsWith('/api/requests')||path.startsWith('/api/bookings')||path.startsWith('/api/organizations'));
 if(role==='محاسبة')return read&&(path==='/finance'||path.startsWith('/api/bookings'));
 if(role==='عمليات')return operations.some(p=>path===p||path.startsWith(p+'/'))||path.startsWith('/api/requests')||path.startsWith('/api/bookings')||(read&&(path.startsWith('/organizations')||path.startsWith('/api/organizations')));
 return false;
}
