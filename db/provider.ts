import {env} from 'cloudflare:workers';
import {ensureDatabase} from './requests';
import {providerDefaults, type ProviderProfile} from '@/lib/provider-identity';
export type {ProviderProfile} from '@/lib/provider-identity';
export async function getProviderProfile():Promise<ProviderProfile>{
  await ensureDatabase();
  const saved=await env.DB.prepare('SELECT payload,updated_at FROM provider_settings WHERE id=?').bind('TRIPS-EXPERTS').first<{payload:string;updated_at:string}>();
  if(saved)return {...providerDefaults,...JSON.parse(saved.payload),id:'TRIPS-EXPERTS',updated_at:saved.updated_at};
  const legacy=await env.DB.prepare('SELECT iban,dispute_city,termination_notice_days FROM provider_profile WHERE id=?').bind('TRIPS-EXPERTS').first<{iban:string;dispute_city:string;termination_notice_days:number}>();
  return {...providerDefaults,dispute_city:legacy?.dispute_city||providerDefaults.dispute_city,termination_notice_days:legacy?.termination_notice_days||30,id:'TRIPS-EXPERTS',updated_at:''};
}
export async function saveProviderProfile(profile:Omit<ProviderProfile,'id'|'updated_at'>){
  await ensureDatabase();const now=new Date().toISOString();
  await env.DB.prepare('INSERT INTO provider_settings(id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind('TRIPS-EXPERTS',JSON.stringify(profile),now).run();
  return getProviderProfile();
}
