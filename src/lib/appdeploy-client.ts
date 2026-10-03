import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gokprabzwmxdvxevgxbj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_G0Jeq1-68TShWEXQ5J4jkQ_rJrHajtr';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

type User = { email?: string; name?: string };
type ProductRow = { id:string; name:string; price:number; category:string; description:string; sizes:string; image_path:string; available:boolean; created_at:string };
const mapProduct = (row: ProductRow) => ({ id:row.id, name:row.name, price:Number(row.price), category:row.category, description:row.description, sizes:row.sizes, imagePath:row.image_path, available:row.available, createdAt:row.created_at, imageUrl:row.image_path ? supabase.storage.from('trend-tribe-products').getPublicUrl(row.image_path).data.publicUrl : '' });
const getCurrentUser = async () => { const { data, error } = await supabase.auth.getUser(); if (error) throw error; return data.user; };
export const api = {
  async get(path:string) { if(path !== '/api/products') throw new Error('Unknown API route'); const {data,error}=await supabase.from('trend_tribe_products').select('*').order('created_at',{ascending:false}); if(error) throw error; return {data:{products:(data as ProductRow[]).map(mapProduct)}}; },
  async post(path:string, body:any) {
    if(path !== '/api/products') throw new Error('Unknown API route');
    const user=await getCurrentUser(); if(!user?.email || user.email.trim().toLowerCase() !== 'trendtribeluxurywears@gmail.com') throw new Error('Admin authorization required');
    const bytes=Uint8Array.from(atob(body.imageData), c=>c.charCodeAt(0));
    const extension=(body.imageType?.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase();
    const safeName=String(body.name).trim().replace(/[^a-zA-Z0-9-_]+/g,'-').toLowerCase().slice(0,70);
    const pathName='products/'+Date.now()+'-'+safeName+'.'+(extension || 'jpg');
    const upload=await supabase.storage.from('trend-tribe-products').upload(pathName,bytes,{contentType:body.imageType || 'image/jpeg',upsert:false});
    if(upload.error) throw upload.error;
    const {data,error}=await supabase.from('trend_tribe_products').insert({name:String(body.name).trim(),price:Number(body.price),category:body.category || 'Unisex',description:String(body.description || '').trim() || 'A curated Trend Tribe piece.',sizes:String(body.sizes || '').trim(),image_path:pathName,available:body.available !== false}).select('id').single();
    if(error){ await supabase.storage.from('trend-tribe-products').remove([pathName]); throw error; } return {data:{id:data.id}};
  },
  async delete(path:string) { const id=path.split('/').pop(); if(!id) throw new Error('Missing product id'); const user=await getCurrentUser(); if(!user?.email || user.email.trim().toLowerCase() !== 'trendtribeluxurywears@gmail.com') throw new Error('Admin authorization required'); const {data:product,error:lookupError}=await supabase.from('trend_tribe_products').select('image_path').eq('id',id).single(); if(lookupError) throw lookupError; const {error}=await supabase.from('trend_tribe_products').delete().eq('id',id); if(error) throw error; if(product?.image_path){const {error:imageError}=await supabase.storage.from('trend-tribe-products').remove([product.image_path]); if(imageError) throw imageError;} return {data:{deleted:true}}; },
};
export const auth = {
  async getUser():Promise<User|null>{ const {data}=await supabase.auth.getUser(); return data.user ? {email:data.user.email,name:data.user.user_metadata?.full_name || data.user.email || ''} : null; },
  async signIn(email:string){ const normalized=email.trim().toLowerCase(); if(normalized !== 'trendtribeluxurywears@gmail.com') throw new Error('not_authorized'); const {error}=await supabase.auth.signInWithOtp({email:normalized,options:{emailRedirectTo:window.location.origin}}); if(error) throw error; return {user:null,otpSent:true}; },
  async signOut(){ await supabase.auth.signOut(); },
};