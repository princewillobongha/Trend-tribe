const supabase=window.supabase.createClient(window.TREND_TRIBE_SUPABASE_URL,window.TREND_TRIBE_SUPABASE_KEY);
const WHATSAPP="2349017751552";
const DEMO_PRODUCTS=[
{id:"demo-1",name:"Classic Linen Shirt",category:"shirts",price:28500,image_url:"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85",stock:10},
{id:"demo-2",name:"Essential Black Tee",category:"tees",price:18000,image_url:"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85",stock:10},
{id:"demo-3",name:"Everyday Hoodie",category:"hoodies",price:42000,image_url:"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85",stock:10},
{id:"demo-4",name:"Relaxed Cargo Pants",category:"pants",price:36000,image_url:"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85",stock:10},
{id:"demo-5",name:"Premium Overshirt",category:"shirts",price:39000,image_url:"https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=85",stock:10},
{id:"demo-6",name:"Minimal White Tee",category:"tees",price:17500,image_url:"https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85",stock:10},
{id:"demo-7",name:"Street Cap",category:"caps",price:15000,image_url:"https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85",stock:10},
{id:"demo-8",name:"Utility Trousers",category:"pants",price:33500,image_url:"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85",stock:10}
];
let PRODUCTS=[];
let cart=JSON.parse(localStorage.getItem("trendtribe_cart")||"[]");

const $=selector=>document.querySelector(selector);
const money=value=>"₦"+Number(value||0).toLocaleString();
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const waUrl=text=>"https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(text);

function contactSeller(product){
 const message=[
  "Hello Trend Tribe! 👋",
  "",
  "I'm interested in this wear:",
  "Product: "+product.name,
  "Price: "+money(product.price),
  "Category: "+product.category,
  product.image_url ? "Photo: "+product.image_url : "",
  "",
  "Is this available?"
 ].filter(Boolean).join("\n");
 window.open(waUrl(message),"_blank","noopener");
}

async function loadProducts(){
 const result=await supabase.from("trend_tribe_products").select("*").eq("published",true).order("created_at",{ascending:false});
 if(result.error){
  console.error(result.error);
  PRODUCTS=DEMO_PRODUCTS;
  showToast("Catalogue connection issue — showing demo products");
 }else{
  PRODUCTS=(result.data||[]).map(p=>({
   id:p.id,name:p.name,category:p.category||"other",price:Number(p.price||0),
   image_url:p.image_url,stock:Number(p.stock??0),tag:p.tag||"AVAILABLE"
  }));
 }
 renderProducts("all");
}

function renderProducts(category){
 const grid=$("#productGrid");
 if(!grid)return;
 const list=PRODUCTS.filter(product=>category==="all"||product.category===category);
 grid.innerHTML=list.length?list.map(product=>{
  const out=product.stock<=0;
  return `<article class="product">
   <div class="product-img"><img src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy"><span class="badge">${out?"OUT OF STOCK":"AVAILABLE"}</span></div>
   <div class="product-body">
    <h3>${esc(product.name)}</h3>
    <p>${esc(product.category)}</p>
    <div class="price">${money(product.price)}</div>
    <div class="product-actions">
      <button class="btn primary small add-btn" type="button" data-id="${esc(product.id)}" ${out?"disabled":""}>${out?"Sold out":"Add to cart"}</button>
      <button class="btn whatsapp small seller-btn" type="button" data-id="${esc(product.id)}">WhatsApp Trend Tribe</button>
    </div>
   </div>
  </article>`;
 }).join(""):'<div class="empty-state"><h3>No products here yet.</h3><p>New Trend Tribe wears will appear here when published.</p></div>';
 grid.querySelectorAll(".add-btn").forEach(button=>button.addEventListener("click",()=>addToCart(button.dataset.id)));
 grid.querySelectorAll(".seller-btn").forEach(button=>button.addEventListener("click",()=>{const product=PRODUCTS.find(item=>String(item.id)===String(button.dataset.id));if(product)contactSeller(product)}));
}

function addToCart(id){
 const product=PRODUCTS.find(item=>String(item.id)===String(id));
 if(!product||product.stock<=0)return;
 const existing=cart.find(item=>String(item.id)===String(id));
 if(existing)existing.qty=Math.min(existing.qty+1,product.stock);
 else cart.push({...product,qty:1});
 saveCart();
 showToast("Added to cart");
}

function saveCart(){
 localStorage.setItem("trendtribe_cart",JSON.stringify(cart));
 updateCart();
}

function removeFromCart(id){
 cart=cart.filter(item=>String(item.id)!==String(id));
 saveCart();
}

function updateCart(){
 const count=$("#cartCount"),items=$("#cartItems"),total=$("#cartTotal");
 if(count)count.textContent=cart.reduce((sum,item)=>sum+item.qty,0);
 if(items)items.innerHTML=cart.length?cart.map(item=>`<div class="cart-row"><img src="${esc(item.image_url)}" alt=""><div><strong>${esc(item.name)}</strong><div>${item.qty} × ${money(item.price)}</div></div><button type="button" class="remove-cart" data-id="${esc(item.id)}" aria-label="Remove">×</button></div>`).join(""):'<p class="muted">Your cart is empty.</p>';
 if(items)items.querySelectorAll(".remove-cart").forEach(button=>button.addEventListener("click",()=>removeFromCart(button.dataset.id)));
 if(total)total.textContent=money(cart.reduce((sum,item)=>sum+item.price*item.qty,0));
}

function showToast(message){
 const toast=$("#toast");if(!toast)return;
 toast.textContent=message;toast.classList.add("show");
 window.setTimeout(()=>toast.classList.remove("show"),1800);
}

function setupInteractions(){
 document.querySelectorAll(".filter").forEach(button=>{
  button.type="button";
  button.addEventListener("click",()=>{
   document.querySelectorAll(".filter").forEach(item=>item.classList.remove("active"));
   button.classList.add("active");
   renderProducts(button.dataset.cat);
   document.querySelector("#shop")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
 });
 const cartButton=$("#cartBtn"),drawer=$("#cartDrawer"),closeCart=$("#closeCart"),menu=$("#menuBtn"),mobileMenu=$("#mobileMenu");
 cartButton?.addEventListener("click",()=>drawer?.classList.add("open"));
 closeCart?.addEventListener("click",()=>drawer?.classList.remove("open"));
 drawer?.addEventListener("click",event=>{if(event.target===drawer)drawer.classList.remove("open")});
 menu?.addEventListener("click",()=>{
  const isOpen=mobileMenu?.classList.toggle("open");
  menu.setAttribute("aria-expanded",String(!!isOpen));
 });
 mobileMenu?.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>mobileMenu.classList.remove("open")));
 $("#clearCart")?.addEventListener("click",()=>{cart=[];saveCart()});
 $("#orderWhatsApp")?.addEventListener("click",()=>{
  if(!cart.length)return showToast("Your cart is empty");
  const lines=cart.map(item=>item.qty+" × "+item.name+" — "+money(item.price*item.qty)).join("\n");
  const total=money(cart.reduce((sum,item)=>sum+item.price*item.qty,0));
  window.open(waUrl("Hello Trend Tribe! 👋\n\nI'd like to place an order.\n\n"+lines+"\n\nTotal: "+total+"\n\nPlease confirm availability and delivery details."),"_blank","noopener");
 });
}

document.addEventListener("DOMContentLoaded",()=>{
 setupInteractions();
 updateCart();
 loadProducts();
});