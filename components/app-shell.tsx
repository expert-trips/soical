'use client';
import { useState, useEffect } from 'react';
import {allowedStaffRoute,type StaffRole} from '@/lib/staff-access';
import Link from '@/components/safe-link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bell, Building2, CircleDollarSign, Headphones, ListTodo, Menu, Network, Settings, Sparkles, UsersRound } from 'lucide-react';

const nav=[
 {href:'/operations',label:'مركز العمليات',icon:Headphones},
 {href:'/requests',label:'الطلبات والحجوزات',icon:ListTodo},
 {href:'/organizations',label:'الشركات والعقود',icon:Building2},
 {href:'/projects',label:'المشاريع والوفود',icon:UsersRound},
 {href:'/finance',label:'المالية والمحافظ',icon:CircleDollarSign},
 {href:'/services',label:'الخدمات والتسعير',icon:Sparkles},
 {href:'/suppliers',label:'الموردون',icon:Network},
 {href:'/support',label:'الدعم ورعاية المسافر',icon:Headphones},
 {href:'/reports',label:'التقارير',icon:BarChart3},
 {href:'/admin',label:'الإدارة والإعدادات',icon:Settings},
];

export function AppShell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){
 const [session,setSession]=useState<{role:string;name:string}|null>(null);
 useEffect(()=>{fetch('/api/session').then(async r=>{if(r.ok)setSession(await r.json() as {role:string;name:string})}).catch(()=>{})},[]);
 const permitted=(path:string,method='GET')=>session?.role==='مالك'||(!!session&&allowedStaffRoute(session.role as StaffRole,path,method));
 const path=usePathname(); const [menu,setMenu]=useState(false);
 return <div dir="rtl" className="min-h-screen bg-[#f4f7f8] text-[#18344c]">
  <aside className={`fixed inset-y-0 right-0 z-40 flex h-dvh w-[270px] flex-col overflow-hidden bg-gradient-to-b from-[#064a78] to-[#022f53] text-white transition-transform lg:translate-x-0 ${menu?'translate-x-0':'translate-x-full'}`}>
   <Link href="/operations" aria-label="خبراء الرحلات — مركز العمليات" className="flex h-28 shrink-0 items-center gap-3 border-b border-white/10 px-4"><img src="/trips-experts-logo.png" alt="شعار خبراء الرحلات" width={80} height={80} className="h-20 w-20 shrink-0 rounded-lg bg-white object-contain"/><div><b className="block text-base">بوابة خبراء الرحلات</b><small className="text-white/75">TRIPS EXPERTS</small></div></Link>
   <nav tabIndex={0} className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3 pb-6 focus-visible:outline-2 focus-visible:outline-white/70" aria-label="التنقل الرئيسي">{nav.filter(item=>permitted(item.href)).map(item=>{const active=path===item.href||(item.href!=='/'&&path.startsWith(item.href));return <Link onClick={()=>setMenu(false)} key={item.href} href={item.href} className={`relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${active?'bg-white/15 text-white':'text-white/75 hover:bg-white/10 hover:text-white'}`}><item.icon className="h-[18px] w-[18px]"/>{item.label}{active&&<span className="absolute inset-y-1 left-0 w-1 rounded-r bg-[#ff6b13]"/>}</Link>})}</nav>
  </aside>
  {menu&&<button aria-label="إغلاق القائمة" onClick={()=>setMenu(false)} className="fixed inset-0 z-30 bg-black/30 lg:hidden"/>}
  <div className="lg:mr-[270px]">
   <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b border-[#dbe4e9] bg-white px-4 shadow-sm md:px-7"><button aria-label="فتح القائمة" onClick={()=>setMenu(true)} className="rounded-lg border p-2 lg:hidden"><Menu className="h-5 w-5"/></button><div className="flex-1"/><button onClick={()=>alert('لا توجد تنبيهات جديدة حالياً')} aria-label="التنبيهات" className="relative rounded-full p-2 hover:bg-slate-100"><Bell className="h-5 w-5"/><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#ff620f]"/></button><div className="hidden border-r pr-4 sm:block"><b className="block text-sm">مرحباً{session?'، '+session.name:''}</b><small className="text-[#78909c]">فريق خبراء الرحلات</small></div></header>
   <main className="mx-auto max-w-[1500px] p-4 md:p-7"><div className="mb-6"><h1 className="text-2xl font-bold md:text-3xl">{title}</h1><p className="mt-1 text-sm text-[#78909c]">{subtitle}</p></div>{children}</main>
  </div>
 </div>
}
