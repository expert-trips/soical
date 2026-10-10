import {NextResponse,type NextRequest} from 'next/server';
import {findStaff} from '@/db/staff';
import {allowedStaffRoute} from '@/lib/staff-access';
export async function middleware(req:NextRequest){const path=req.nextUrl.pathname;
 if(path.startsWith('/_next/')||path.startsWith('/signin-with-chatgpt')||path.startsWith('/signout-with-chatgpt')||path==='/favicon.ico'||path==='/trips-experts-logo.png'||path==='/og.png'||(import.meta.env.DEV&&(path.startsWith('/@')||path.startsWith('/__')||path.startsWith('/node_modules/'))))return NextResponse.next();
 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.get('sec-fetch-site')==='cross-site')return new NextResponse(null,{status:403});
 const uid=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email')?.toLowerCase();
 if(!uid||!email)return new NextResponse('يلزم تسجيل الدخول إلى الموقع.',{status:401});
 if(email==='keldy66@gmail.com'||(import.meta.env.DEV&&email==='seedy@sites.test'))return NextResponse.next();
 const employee=await findStaff(email);if(!employee||employee.status!=='نشط'||!allowedStaffRoute(employee.role,path,req.method))return new NextResponse('ليس لديك صلاحية لهذا القسم أو أن حساب الموظف موقوف.',{status:403,headers:{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}});
 return NextResponse.next();
}
