import {env} from 'cloudflare:workers';
import {defaultPresets,type CatalogPreset} from '@/lib/catalog-presets';
export async function listPresets():Promise<CatalogPreset[]>{
 const rows=(await env.DB.prepare('SELECT p.payload FROM catalog_preset_versions p WHERE p.revision=(SELECT MAX(v.revision) FROM catalog_preset_versions v WHERE v.id=p.id)').all<{payload:string}>()).results;
 const overrides=new Map(rows.map(r=>{const p=JSON.parse(r.payload) as CatalogPreset;return [p.id,p]}));
 return defaultPresets().map(p=>overrides.get(p.id)||p);
}
export async function getPreset(id:string){return (await listPresets()).find(p=>p.id===id)||null}
export async function savePreset(p:CatalogPreset,actor:string){
 const value={...p,revision:p.revision+1};
 const row=await env.DB.prepare('INSERT INTO catalog_preset_versions(id,revision,payload,actor,created_at) SELECT ?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM catalog_preset_versions WHERE id=?),0)=? ON CONFLICT(id,revision) DO NOTHING RETURNING row_id').bind(p.id,value.revision,JSON.stringify(value),actor,new Date().toISOString(),p.id,p.revision).first();
 return row?value:null;
}
