const supabase=window.supabase.createClient(window.TREND_TRIBE_SUPABASE_URL,window.TREND_TRIBE_SUPABASE_KEY);
const BUCKET="trend-tribe-images";
let editingId=null,currentSession=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"₦"+Number(n||0).toLocaleString();
function show(id,on=true){$(id).classList.toggle("hidden",!on)}
function notice(message,type="info"){const e=$("#adminNotice");e.textContent=message;e.className="admin-notice "+type;e.classList.remove("hidden");setTimeout(()=>e.classList.add("hidden"),5000)}
async function init(){
 const {data}=await supabase.auth.getSession();currentSession=data.session;
 if(!currentSession)return;
 const {data:userData}=await supabase.auth.getUser();const user=userData.user;
 if(!user||user.app_metadata?.role!=="trend_tribe_admin"){show("#loginView",true);$("#loginForm").classList.add("hidden");show("#notAdmin",true);return}
 show("#loginView",false);show("#dashboardView",true);$("#adminEmail").textContent=user.email||"Admin";loadProducts();
}
$("#loginForm").addEventListener("submit",async e=>{e.preventDefault();const email=$("#email").value.trim(),password=$("#password").value;$("#loginSubmit").disabled=true;$("#loginSubmit").textContent="Signing in…";const {error}=await supabase.auth.signInWithPassword({email,password});$("#loginSubmit").disabled=false;$("#loginSubmit").textContent="Sign in";if(error)return notice(error.message,"error");init()});
$("#logoutBtn").onclick=async()=>{await supabase.auth.signOut();location.reload()};
$("#cancelEdit").onclick=resetForm;
$("#productForm").addEventListener("submit",saveProduct);
async function saveProduct(e){
 e.preventDefault();const files=[...$("#productImages").files],name=$("#name").value.trim(),price=Number($("#price").value),stock=Number($("#stock").value);
 if(!name||price<0||stock<0)return notice("Enter a product name, valid price and stock.","error");
 if(!editingId&&!files.length)return notice("Choose at least one product photo.","error");
 const btn=$("#saveProduct");btn.disabled=true;btn.textContent=editingId?"Saving…":"Publishing…";
 try{
  let existing=null;if(editingId){const r=await supabase.from("trend_tribe_products").select("*").eq("id",editingId).single();if(r.error)throw r.error;existing=r.data}
  let imageUrl=existing?.image_url||"",imagePaths=existing?.image_paths||[];
  if(files.length){const uploaded=[];for(const file of files){if(!file.type.startsWith("image/"))throw new Error("Only image files are allowed.");if(file.size>10*1024*1024)throw new Error("Each image must be 10MB or smaller.");const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";const path=currentSession.user.id+"/"+crypto.randomUUID()+"."+ext;const r=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,cacheControl:"31536000",upsert:false});if(r.error)throw r.error;uploaded.push({url:supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,path})}imageUrl=uploaded[0].url;imagePaths=[...imagePaths,...uploaded.map(x=>x.path)]}
  const additional=imagePaths.slice(1).map(p=>supabase.storage.from(BUCKET).getPublicUrl(p).data.publicUrl);
  const payload={name,description:$("#description").value.trim(),category:$("#category").value,price,compare_at_price:$("#comparePrice").value?Number($("#comparePrice").value):null,image_url:imageUrl,image_paths:imagePaths,additional_images:additional,sizes:$("#sizes").value.split(",").map(x=>x.trim()).filter(Boolean),colors:$("#colors").value.split(",").map(x=>x.trim()).filter(Boolean),stock,published:$("#published").checked,updated_at:new Date().toISOString()};
  const r=editingId?await supabase.from("trend_tribe_products").update(payload).eq("id",editingId):await supabase.from("trend_tribe_products").insert({...payload,created_by:currentSession.user.id});if(r.error)throw r.error;
  notice(editingId?"Product updated.":"Product published.","success");resetForm();loadProducts();
 }catch(err){console.error(err);notice(err.message||"Could not save product.","error")}finally{btn.disabled=false;btn.textContent=editingId?"Save changes":"Publish product"}
}
async function loadProducts(){const r=await supabase.from("trend_tribe_products").select("*").order("created_at",{ascending:false});if(r.error)return notice(r.error.message,"error");const data=r.data||[];$("#inventory").innerHTML=data.length?data.map(p=>'<div class="inventory-row"><img src="'+esc(p.image_url)+'" alt=""><div class="inventory-info"><strong>'+esc(p.name)+'</strong><span>'+money(p.price)+' · '+esc(p.category)+' · Stock: '+p.stock+'</span><small>'+(p.published?"Published":"Draft")+'</small></div><div class="inventory-actions"><button class="btn ghost small" onclick="editProduct(\''+p.id+'\')">Edit</button><button class="btn danger small" onclick="deleteProduct(\''+p.id+'\')">Delete</button></div></div>').join(""):'<p class="muted">No products yet. Add your first wear above.</p>'}
window.editProduct=async id=>{const r=await supabase.from("trend_tribe_products").select("*").eq("id",id).single();if(r.error)return notice(r.error.message,"error");const p=r.data;editingId=id;$("#name").value=p.name;$("#description").value=p.description||"";$("#category").value=p.category;$("#price").value=p.price;$("#comparePrice").value=p.compare_at_price||"";$("#sizes").value=(p.sizes||[]).join(", ");$("#colors").value=(p.colors||[]).join(", ");$("#stock").value=p.stock;$("#published").checked=p.published;$("#saveProduct").textContent="Save changes";$("#cancelEdit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})};
window.deleteProduct=async id=>{if(!confirm("Delete this product and its photos?"))return;const r=await supabase.from("trend_tribe_products").select("image_paths").eq("id",id).single();if(r.error)return notice(r.error.message,"error");if(r.data?.image_paths?.length)await supabase.storage.from(BUCKET).remove(r.data.image_paths);const d=await supabase.from("trend_tribe_products").delete().eq("id",id);if(d.error)return notice(d.error.message,"error");notice("Product deleted.","success");loadProducts()};
function resetForm(){editingId=null;$("#productForm").reset();$("#published").checked=true;$("#saveProduct").textContent="Publish product";$("#cancelEdit").classList.add("hidden")}
supabase.auth.onAuthStateChange((_event,session)=>{currentSession=session});
init();