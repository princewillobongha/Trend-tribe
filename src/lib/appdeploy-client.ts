const SUPABASE_URL = 'https://gokprabzwmxdvxevgxbj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G0Jeq1-68TShWEXQ5J4jkQ_rJrHajtr';
const BUCKET = 'trend-tribe-products';
const ADMIN_EMAIL = 'trendtribeluxurywears@gmail.com';
const SESSION_KEY = 'trend-tribe-supabase-session';

type Session = { access_token: string; refresh_token?: string; expires_at?: number };
type User = { email?: string; name?: string };
type ProductRow = { id:string; name:string; price:number; category:string; description:string; sizes:string; image_path:string; available:boolean; created_at:string };

const session = (): Session | null => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } };
const saveSession = (value: Session | null) => value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : localStorage.removeItem(SESSION_KEY);
const hydrateSessionFromHash = () => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token) { saveSession({ access_token, refresh_token: refresh_token || undefined, expires_at: Number(hash.get('expires_at') || 0) }); window.history.replaceState({}, document.title, window.location.pathname + window.location.search); }
};
hydrateSessionFromHash();

const headers = (authenticated = false) => ({ 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json', ...(authenticated && session()?.access_token ? { Authorization: 'Bearer ' + session()!.access_token } : {}) });
const authFetch = async (url:string, options:RequestInit={}) => { const response=await fetch(url,{...options,headers:{...headers(true),...(options.headers || {})}}); if(!response.ok){const body=await response.text(); throw new Error(body || ('Request failed: '+response.status));} return response; };
const publicUrl = (path:string) => SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');
const mapProduct=(row:ProductRow)=>({id:row.id,name:row.name,price:Number(row.price),category:row.category,description:row.description,sizes:row.sizes,imagePath:row.image_path,available:row.available,createdAt:row.created_at,imageUrl:row.image_path ? publicUrl(row.image_path) : ''});

export const supabase = { auth: { async getUser(){ const s=session(); if(!s?.access_token) return null; const response=await authFetch(SUPABASE_URL+'/auth/v1/user'); return response.json(); } } };

export const api = {
 async get(path:string){ if(path!=='/api/products') throw new Error('Unknown API route'); const response=await fetch(SUPABASE_URL+'/rest/v1/trend_tribe_products?select=*&order=created_at.desc',{headers:headers()}); if(!response.ok) throw new Error(await response.text()); const data=await response.json() as ProductRow[]; return {data:{products:data.map(mapProduct)}}; },
 async post(path:string,body:any){ if(path!=='/api/products') throw new Error('Unknown API route'); const user=await supabase.auth.getUser(); if(!user?.email || user.email.trim().toLowerCase()!==ADMIN_EMAIL) throw new Error('Admin authorization required'); const bytes=Uint8Array.from(atob(body.imageData),(c)=>c.charCodeAt(0)); const ext=(body.imageType?.split('/')[1]||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg'; const safe=String(body.name).trim().replace(/[^a-zA-Z0-9-_]+/g,'-').toLowerCase().slice(0,70); const pathName='products/'+Date.now()+'-'+safe+'.'+ext; const upload=await authFetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+pathName,{method:'POST',headers:{'Content-Type':body.imageType||'image/jpeg','x-upsert':'false'},body:bytes}); if(!upload.ok) throw new Error(await upload.text()); const response=await authFetch(SUPABASE_URL+'/rest/v1/trend_tribe_products',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name:String(body.name).trim(),price:Number(body.price),category:body.category||'Unisex',description:String(body.description||'').trim()||'A curated Trend Tribe piece.',sizes:String(body.sizes||'').trim(),image_path:pathName,available:body.available!==false})}); const rows=await response.json(); return {data:{id:rows[0]?.id}}; },
 async delete(path:string){ const id=path.split('/').pop(); if(!id) throw new Error('Missing product id'); const user=await supabase.auth.getUser(); if(!user?.email || user.email.trim().toLowerCase()!==ADMIN_EMAIL) throw new Error('Admin authorization required'); const lookup=await authFetch(SUPABASE_URL+'/rest/v1/trend_tribe_products?id=eq.'+encodeURIComponent(id)+'&select=image_path'); const products=await lookup.json(); const response=await authFetch(SUPABASE_URL+'/rest/v1/trend_tribe_products?id=eq.'+encodeURIComponent(id),{method:'DELETE'}); if(!response.ok) throw new Error(await response.text()); const imagePath=products[0]?.image_path; if(imagePath){ await authFetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+imagePath,{method:'DELETE'}); } return {data:{deleted:true}}; }
};

export const auth = {
 async getUser():Promise<User|null>{ const user=await supabase.auth.getUser(); return user ? {email:user.email,name:user.user_metadata?.full_name || user.email || ''} : null; },
 async signIn(email:string){ const normalized=email.trim().toLowerCase(); if(normalized!==ADMIN_EMAIL) throw new Error('not_authorized'); const redirectTo = window.location.origin + '/'; const response=await fetch(SUPABASE_URL+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirectTo),{method:'POST',headers:headers(),body:JSON.stringify({email:normalized,create_user:true})}); if(!response.ok) throw new Error(await response.text()); return {user:null,otpSent:true}; },
 async signOut(){ const s=session(); if(s?.access_token){ await fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:headers(true)}).catch(()=>undefined); } saveSession(null); }
};
