const SUPABASE_URL = 'https://gokprabzwmxdvxevgxbj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G0Jeq1-68TShWEXQ5J4jkQ_rJrHajtr';
const BUCKET = 'trend-tribe-products';
const ADMIN_EMAIL = 'trendtribeluxurywears@gmail.com';
const SESSION_KEY = 'trend-tribe-supabase-session';

type Session = { access_token: string; refresh_token?: string; expires_at?: number };
type User = { email?: string; name?: string };
type ProductRow = { id:string; name:string; price:number; category:string; description:string; sizes:string; image_path:string; image_paths?:string[]; available:boolean; created_at:string };

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
const refreshSession = async () => {
  const current = session();
  if (!current?.refresh_token) return false;
  const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refresh_token: current.refresh_token })
  });
  if (!response.ok) return false;
  const data = await response.json();
  if (!data?.access_token) return false;
  saveSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token || current.refresh_token,
    expires_at: Date.now() + Number(data.expires_in || 3600) * 1000
  });
  return true;
};
const authFetch = async (url:string, options:RequestInit={}) => { const response=await fetch(url,{...options,headers:{...headers(true),...(options.headers || {})}}); if(!response.ok){const body=await response.text(); throw new Error(body || ('Request failed: '+response.status));} return response; };
const publicUrl = (path:string) => SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');
const mapProduct=(row:ProductRow)=>{ const paths = Array.isArray(row.image_paths) && row.image_paths.length ? row.image_paths : (row.image_path ? [row.image_path] : []); return {id:row.id,name:row.name,price:Number(row.price),category:row.category,description:row.description,sizes:row.sizes,imagePath:paths[0] || '',imagePaths:paths,available:row.available,createdAt:row.created_at,imageUrl:paths[0] ? publicUrl(paths[0]) : ''}; };

export const supabase = { auth: { async getUser(){
  let s = session();
  if (!s?.access_token) return null;
  if (s.expires_at && s.expires_at < Date.now() + 60000) {
    await refreshSession();
    s = session();
  }
  if (!s?.access_token) return null;
  try {
    const response = await authFetch(SUPABASE_URL+'/auth/v1/user');
    return response.json();
  } catch (error) {
    if (await refreshSession()) {
      const response = await authFetch(SUPABASE_URL+'/auth/v1/user');
      return response.json();
    }
    throw error;
  }
} } };

export const api = {
 imageUrl(path:string){ return publicUrl(path); },
 async get(path:string){ if(path!=='/api/products') throw new Error('Unknown API route'); const response=await fetch(SUPABASE_URL+'/rest/v1/trend_tribe_products?select=*&order=created_at.desc',{headers:headers()}); if(!response.ok) throw new Error(await response.text()); const data=await response.json() as ProductRow[]; return {data:{products:data.map(mapProduct)}}; },
 async post(path:string,body:any){ if(path!=='/api/products') throw new Error('Unknown API route'); const user=await supabase.auth.getUser(); if(!user?.email || user.email.trim().toLowerCase()!==ADMIN_EMAIL) throw new Error('Admin authorization required'); const gallery=Array.isArray(body.imageGallery)?body.imageGallery:[]; if(!gallery.length) throw new Error('At least one product photo is required'); const safe=String(body.name).trim().replace(/[^a-zA-Z0-9-_]+/g,'-').toLowerCase().slice(0,70); const imagePaths:string[]=[]; for(let i=0;i<gallery.length;i++){ const photo=gallery[i]; const bytes=Uint8Array.from(atob(photo.data),(ch)=>ch.charCodeAt(0)); const ext=(photo.type?.split('/')[1]||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg'; const pathName='products/'+Date.now()+'-'+i+'-'+safe+'.'+ext; await authFetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+pathName,{method:'POST',headers:{'Content-Type':photo.type||'image/jpeg','x-upsert':'false'},body:bytes}); imagePaths.push(pathName); } const response=await authFetch(SUPABASE_URL+'/rest/v1/trend_tribe_products',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name:String(body.name).trim(),price:Number(body.price),category:body.category||'Unisex',description:String(body.description||'').trim()||'A curated Trend Tribe piece.',sizes:String(body.sizes||'').trim(),image_path:imagePaths[0],image_paths:imagePaths,available:body.available!==false})}); const rows=await response.json(); return {data:{id:rows[0]?.id}}; },
 async delete(path:string){ const id=path.split('/').pop(); if(!id) throw new Error('Missing product id'); const user=await supabase.auth.getUser(); if(!user?.email || user.email.trim().toLowerCase()!==ADMIN_EMAIL) throw new Error('Admin authorization required'); const lookup=await authFetch(SUPABASE_URL+'/rest/v1/trend_tribe_products?id=eq.'+encodeURIComponent(id)+'&select=image_path,image_paths'); const products=await lookup.json(); const response=await authFetch(SUPABASE_URL+'/rest/v1/trend_tribe_products?id=eq.'+encodeURIComponent(id),{method:'DELETE'}); if(!response.ok) throw new Error(await response.text()); const paths=Array.isArray(products[0]?.image_paths)&&products[0].image_paths.length?products[0].image_paths:(products[0]?.image_path?[products[0].image_path]:[]); for(const imagePath of paths){ await authFetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+imagePath,{method:'DELETE'}).catch(()=>undefined); } return {data:{deleted:true}}; }
};

export const auth = {
 async getUser():Promise<User|null>{ const user=await supabase.auth.getUser(); return user ? {email:user.email,name:user.user_metadata?.full_name || user.email || ''} : null; },
 async signInWithPassword(email:string,password:string):Promise<User>{
   const normalized=email.trim().toLowerCase();
   if(normalized!==ADMIN_EMAIL) throw new Error('not_authorized');
   if(!password) throw new Error('Password is required.');
   const response=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:headers(),body:JSON.stringify({email:normalized,password})});
   if(!response.ok) throw new Error(await response.text());
   const data=await response.json();
   if(!data?.access_token) throw new Error('Invalid login credentials');
   saveSession({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+Number(data.expires_in||3600)*1000});
   return {email:data.user?.email || normalized,name:data.user?.user_metadata?.full_name || data.user?.email || normalized};
 },
 async signIn(email:string){
   const normalized=email.trim().toLowerCase();
   if(normalized!==ADMIN_EMAIL) throw new Error('not_authorized');
   const redirectTo = window.location.origin + '/';
   const response=await fetch(SUPABASE_URL+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirectTo),{method:'POST',headers:headers(),body:JSON.stringify({email:normalized,create_user:true})});
   if(!response.ok) throw new Error(await response.text());
   return {user:null,otpSent:true};
 },
 async requestPasswordReset(email:string){
   const normalized=email.trim().toLowerCase();
   if(normalized!==ADMIN_EMAIL) throw new Error('not_authorized');
   const redirectTo = window.location.origin + '/';
   const response=await fetch(SUPABASE_URL+'/auth/v1/recover?redirect_to='+encodeURIComponent(redirectTo),{method:'POST',headers:headers(),body:JSON.stringify({email:normalized})});
   if(!response.ok) throw new Error(await response.text());
   return {sent:true};
 },
 async signOut(){
   const s=session();
   if(s?.access_token){ await fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:headers(true)}).catch(()=>undefined); }
   saveSession(null);
 }
};
