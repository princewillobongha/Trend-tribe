import { useEffect, useMemo, useState } from 'react';
import { api, auth } from './lib/appdeploy-client';
import {
  ArrowRight,
  Check,
  LogOut,
  Menu,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  sizes: string;
  imageUrl: string;
  imagePath: string;
  imagePaths: string[];
  available: boolean;
  createdAt: string;
};
type CartItem = Product & { quantity: number };
const CATEGORIES = [
  'All',
  'New In',
  'Men',
  'Women',
  'Unisex',
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Accessories',
];
const ADMIN_EMAIL = 'trendtribeluxurywears@gmail.com';
const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<{
    email?: string;
    name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loginEmail, setLoginEmail] = useState('trendtribeluxurywears@gmail.com');
  const [loginBusy, setLoginBusy] = useState(false);

  const loadProducts = async () => {
    try {
      const response = await api.get('/api/products');
      setProducts(response.data.products ?? []);
    } catch {
      setNotice('We could not load the collection right now. Please refresh.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadProducts();
    const saved = localStorage.getItem('trend-tribe-cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {
        localStorage.removeItem('trend-tribe-cart');
      }
    }
    auth.getUser().then(user => { if (user?.email?.trim().toLowerCase() === ADMIN_EMAIL) setAdminUser(user); }).catch(() => undefined);

  }, []);
  useEffect(() => {
    localStorage.setItem('trend-tribe-cart', JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    const syncProductFromUrl = () => {
      const id = new URLSearchParams(window.location.search).get('product');
      setSelectedProduct(id ? products.find(p => p.id === id) ?? null : null);
    };
    syncProductFromUrl();
    window.addEventListener('popstate', syncProductFromUrl);
    return () => window.removeEventListener('popstate', syncProductFromUrl);
  }, [products]);

  useEffect(() => {
    const title = selectedProduct ? `${selectedProduct.name} | Trend Tribe Collections` : 'Trend Tribe Collections | Luxury Wears & Fancy Clothing in Calabar';
    document.title = title;
    const description = selectedProduct ? `${selectedProduct.name} — ${selectedProduct.description || 'Premium and fancy clothing from Trend Tribe.'} Shop in Nigeria with Trend Tribe.` : 'Trend Tribe is a Calabar-based luxury fashion store offering premium and fancy clothing for men, women and unisex styles across Nigeria. Browse the collection and order easily.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name','description'); document.head.appendChild(meta); }
    meta.setAttribute('content', description);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel','canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', selectedProduct ? `${window.location.origin}/?product=${encodeURIComponent(selectedProduct.id)}` : `${window.location.origin}/`);
    document.getElementById('trend-tribe-product-schema')?.remove();
    if (selectedProduct) {
      const schema = document.createElement('script');
      schema.id = 'trend-tribe-product-schema';
      schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify({
        '@context':'https://schema.org',
        '@type':'Product',
        name:selectedProduct.name,
        description:selectedProduct.description || selectedProduct.name,
        image:selectedProduct.imagePaths?.length ? selectedProduct.imagePaths.map(path => api.imageUrl(path)) : (selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []),
        category:selectedProduct.category,
        brand:{'@type':'Brand',name:'Trend Tribe'},
        offers:{'@type':'Offer',priceCurrency:'NGN',price:String(selectedProduct.price),availability:selectedProduct.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',url:`${window.location.origin}/?product=${encodeURIComponent(selectedProduct.id)}`}
      });
      document.head.appendChild(schema);
    }
  }, [selectedProduct]);

  const filtered = useMemo(
    () =>
      products.filter(product => {
        const recent =
          product.createdAt >
          new Date(Date.now() - 14 * 86400000).toISOString();
        const matchesCategory =
          category === 'All' ||
          product.category === category ||
          (category === 'New In' && recent);
        const text = query.toLowerCase();
        return (
          matchesCategory &&
          (!text ||
            product.name.toLowerCase().includes(text) ||
            product.category.toLowerCase().includes(text))
        );
      }),
    [products, category, query]
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const openProduct = (product: Product) => {
    setSelectedProduct(product);
    const url = new URL(window.location.href);
    url.searchParams.set('product', product.id);
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeProduct = () => {
    setSelectedProduct(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('product');
    window.history.pushState({}, '', url.pathname + url.search);
  };

  const addToCart = (product: Product) => {
    setCart(current => {
      const found = current.find(item => item.id === product.id);
      return found
        ? current.map(item =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...current, { ...product, quantity: 1 }];
    });
    setNotice('Added to your bag.');
    setTimeout(() => setNotice(''), 1800);
  };
  const updateQty = (id: string, amount: number) =>
    setCart(current =>
      current.flatMap(item =>
        item.id === id
          ? item.quantity + amount <= 0
            ? []
            : [{ ...item, quantity: item.quantity + amount }]
          : [item]
      )
    );
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState<{orderNumber:string;method:string}|null>(null);
  const [checkout, setCheckout] = useState({name:'',email:'',phone:'',address:'',city:'Calabar',notes:'',paymentMethod:'bank_transfer'});
  const beginCheckout = () => { if(cart.length) { setCheckoutDone(null); setShowCart(false); setShowCheckout(true); } };
  const submitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!checkout.name.trim() || !checkout.phone.trim() || !checkout.address.trim() || !checkout.city.trim()) { setNotice('Please complete your name, phone, address and city.'); return; }
    setCheckoutBusy(true); setNotice('');
    const orderNumber = 'TT-' + Date.now().toString().slice(-8);
    try {
      await api.createOrder({
        order_number: orderNumber, customer_name: checkout.name.trim(), email: checkout.email.trim() || null,
        phone: checkout.phone.trim(), address: checkout.address.trim(), city: checkout.city.trim(), notes: checkout.notes.trim() || null,
        items: cart.map(item=>({id:item.id,name:item.name,price:item.price,quantity:item.quantity})),
        subtotal: cartTotal, delivery_fee: 0, total: cartTotal, payment_method: checkout.paymentMethod,
        payment_status:'pending', order_status:'pending'
      });
      const lines = cart.map(item => `• ${item.name} × ${item.quantity} — ${money(item.price * item.quantity)}`);
      const message = encodeURIComponent(`Hello Trend Tribe, I just placed order ${orderNumber}.\\n\\n${lines.join('\\n')}\\n\\nTotal: ${money(cartTotal)}\\nPayment: ${checkout.paymentMethod === 'bank_transfer' ? 'Bank transfer' : 'WhatsApp confirmation'}\\n\\nCustomer: ${checkout.name}\\nPhone: ${checkout.phone}\\nAddress: ${checkout.address}, ${checkout.city}`);
      setCart([]); setCheckoutDone({orderNumber,method:checkout.paymentMethod}); setCheckout({...checkout,name:'',email:'',phone:'',address:'',notes:''});
      if(checkout.paymentMethod==='whatsapp') window.open(`https://wa.me/2349017751552?text=${message}`,'_blank');
    } catch { setNotice('We could not submit your order. Please try again.'); }
    finally { setCheckoutBusy(false); }
  };
  const signInAdmin = async () => { setShowLogin(true); };
  const submitAdminLogin = async () => {
    setLoginBusy(true); setNotice('');
    try { await auth.signIn(loginEmail); setShowLogin(false); setNotice('Check the admin email inbox and tap the secure sign-in link.'); setTimeout(() => setNotice(''), 7000); }
    catch (error: any) { setNotice(error?.message === 'not_authorized' ? 'This email is not authorized as the Trend Tribe admin.' : 'Could not send the sign-in link. Please try again.'); }
    finally { setLoginBusy(false); }
  };
  const signOut = async () => {
    await auth.signOut();
    setAdminUser(null);
    setShowAdmin(false);
  };

  return (
    <div className="site">
      <header className="topbar">
        <div className="topbar-inner">
          <span>CALABAR • CROSS RIVER STATE</span>
          <span className="topbar-center">LUXURY WEARS • FANCY CLOTHING</span>
          <a
            href="https://wa.me/2349017751552"
            target="_blank"
            rel="noreferrer"
          >
            MESSAGE US ON WHATSAPP
          </a>
        </div>
      </header>
      <nav className="nav">
        <button
          className="mobile-menu"
          onClick={() =>
            document
              .getElementById('collections')
              ?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          <Menu size={20} />
        </button>
        <button
          className="brand"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img className="brand-logo" src="/trend-tribe-logo.svg" alt="Trend Tribe Collections logo" />
          <span>
            <strong>TREND TRIBE</strong>
            <small>LUXURY WEARS</small>
          </span>
        </button>
        <div className="nav-links">
          <button
            onClick={() =>
              document
                .getElementById('collections')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            SHOP
          </button>
          <button onClick={() => setCategory('New In')}>NEW IN</button>
          <button onClick={() => setCategory('Men')}>MEN</button>
          <button onClick={() => setCategory('Women')}>WOMEN</button>
          <button
            onClick={() =>
              document
                .getElementById('about')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            ABOUT
          </button>
        </div>
        <div className="nav-actions">
          <button
            aria-label="Search"
            onClick={() => document.getElementById('search')?.focus()}
          >
            <Search size={19} />
          </button>
          <button
            aria-label="Account"
            onClick={adminUser ? () => setShowAdmin(true) : signInAdmin}
          >
            <UserRound size={19} />
          </button>
          <button
            className="bag-btn"
            aria-label="Shopping bag"
            onClick={() => setShowCart(true)}
          >
            <ShoppingBag size={19} />
            <span>{cartCount}</span>
          </button>
        </div>
      </nav>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">THE NEW STANDARD OF STYLE</p>
            <h1>
              Wear your
              <br />
              <em>presence.</em>
            </h1>
            <p className="hero-text">
              Premium and fancy clothing curated for people who understand that
              style is more than what you wear — it is how you arrive.
            </p>
            <button
              className="primary-btn"
              onClick={() =>
                document
                  .getElementById('collections')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              EXPLORE THE COLLECTION <ArrowRight size={17} />
            </button>
            <div className="hero-meta">
              <span>
                <ShieldCheck size={16} /> Curated quality
              </span>
              <span>
                <Package size={16} /> Calabar based
              </span>
              <span>
                <MessageCircle size={16} /> WhatsApp ordering
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card hero-card-one">
              <div>
                <span>01</span>
                <b>TRIBE</b>
              </div>
            </div>
            <div className="hero-card hero-card-two">
              <div>
                <span>02</span>
                <b>LUXE</b>
              </div>
            </div>
            <div className="hero-stamp">
              TT
              <br />
              <small>EST. 2026</small>
            </div>
          </div>
        </section>
        <section className="marquee">
          <span>TREND TRIBE</span>
          <i>✦</i>
          <span>LUXURY WEARS</span>
          <i>✦</i>
          <span>FANCY CLOTHING</span>
          <i>✦</i>
          <span>CALABAR</span>
          <i>✦</i>
          <span>TREND TRIBE</span>
        </section>
        <section className="collection-section" id="collections">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE COLLECTION</p>
              <h2>
                Curated <em>for the tribe.</em>
              </h2>
            </div>
            <div className="search-wrap">
              <Search size={17} />
              <input
                id="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search the collection"
              />
            </div>
          </div>
          <div className="category-row">
            {CATEGORIES.map(item => (
              <button
                key={item}
                className={category === item ? 'active' : ''}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="empty-state">
              <div className="loader"></div>
              <p>Loading the collection…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={32} />
              <h3>The collection is waiting for its first drop.</h3>
              <p>New pieces added by Trend Tribe will appear here.</p>
            </div>
          ) : (
            <div className="product-grid">
              {filtered.map(product => (
                <article className="product-card" key={product.id} onClick={() => openProduct(product)}>
                  <div className="product-image">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <div className="image-placeholder">
                        <span>TT</span>
                      </div>
                    )}
                    {!product.available && (
                      <span className="soldout">SOLD OUT</span>
                    )}
                    <button
                      className="quick-add"
                      disabled={!product.available}
                      onClick={e => { e.stopPropagation(); addToCart(product); }}
                    >
                      {product.available ? 'ADD TO BAG' : 'UNAVAILABLE'}
                    </button>
                  </div>
                  <div className="product-info">
                    <div>
                      <p className="product-category">{product.category}</p>
                      <h3>{product.name}</h3>
                    </div>
                    <strong>{money(product.price)}</strong>
                  </div>
                  <p className="product-description">{product.description}</p>
                  {product.sizes && (
                    <p className="sizes">
                      SIZES <span>{product.sizes}</span>
                    </p>
                  )}
                  <button
                    className="whatsapp-link"
                    onClick={e => { e.stopPropagation();
                      const text = encodeURIComponent(
                        `Hello Trend Tribe, I'm interested in ${product.name} (${money(product.price)}). Is it available?`
                      );
                      window.open(
                        `https://wa.me/2349017751552?text=${text}`,
                        '_blank'
                      );
                    }}
                  >
                    <MessageCircle size={15} /> CONTACT ADMIN
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="manifesto" id="about">
          <div className="manifesto-image">
            <span>TT</span>
          </div>
          <div className="manifesto-copy">
            <p className="eyebrow">THE TREND TRIBE WAY</p>
            <h2>
              Luxury is a <em>feeling.</em>
            </h2>
            <p>
              Trend Tribe is a fast-growing fashion brand from Calabar, Cross
              River State, bringing together luxury wears and fancy clothing for
              every kind of occasion. Every piece is selected to help you look
              unmistakably like you.
            </p>
            <a
              href="https://wa.me/2349017751552"
              target="_blank"
              rel="noreferrer"
            >
              TALK TO TREND TRIBE <ArrowRight size={16} />
            </a>
          </div>
        </section>
        <section className="location-strip">
          <div>
            <p className="eyebrow">FIND YOUR TRIBE</p>
            <h2>
              Calabar, <em>Cross River.</em>
            </h2>
          </div>
          <a
            href="https://wa.me/2349017751552"
            target="_blank"
            rel="noreferrer"
          >
            MESSAGE US <MessageCircle size={17} />
          </a>
        </section>
      </main>
      <footer>
        <div>
          <img className="footer-brand-logo" src="/trend-tribe-logo.svg" alt="Trend Tribe Collections" />
          <strong>TREND TRIBE</strong>
          <p>
            Luxury wears. Fancy clothing.
            <br />
            Made for the tribe.
          </p>
        </div>
        <div>
          <h4>SHOP</h4>
          <button onClick={() => setCategory('Men')}>Men</button>
          <button onClick={() => setCategory('Women')}>Women</button>
          <button onClick={() => setCategory('Unisex')}>Unisex</button>
        </div>
        <div>
          <h4>CONTACT</h4>
          <a
            href="https://wa.me/2349017751552"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
          <a href="mailto:trendtribeluxurywears@gmail.com">Email</a>
          <span>Calabar, Cross River State</span>
        </div>
        <div>
          <h4>ADMIN</h4>
          <button onClick={adminUser ? () => setShowAdmin(true) : signInAdmin}>
            {adminUser ? 'Open dashboard' : 'Admin sign in'}
          </button>
          <p>© 2026 Trend Tribe</p>
        </div>
      </footer>
      {notice && <div className="toast">{notice}</div>}
      {selectedProduct && (
        <div className="overlay" onMouseDown={closeProduct}>
          <div className="product-detail-card" onMouseDown={e => e.stopPropagation()}>
            <button className="login-close" onClick={closeProduct}><X /></button>
            <div className="product-detail-gallery">
              {(selectedProduct.imagePaths?.length ? selectedProduct.imagePaths : (selectedProduct.imagePath ? [selectedProduct.imagePath] : [])).map((path,index) => (
                <img key={path + index} src={api.imageUrl(path)} alt={index === 0 ? selectedProduct.name : `${selectedProduct.name} view ${index + 1}`} />
              ))}
            </div>
            <div className="product-detail-copy">
              <p className="eyebrow">{selectedProduct.category}</p>
              <h2>{selectedProduct.name}</h2>
              <strong className="detail-price">{money(selectedProduct.price)}</strong>
              <p>{selectedProduct.description || 'A curated Trend Tribe piece.'}</p>
              {selectedProduct.sizes && <p className="sizes">SIZES <span>{selectedProduct.sizes}</span></p>}
              <button className="primary-btn full" disabled={!selectedProduct.available} onClick={() => addToCart(selectedProduct)}>
                {selectedProduct.available ? 'ADD TO BAG' : 'SOLD OUT'} <ShoppingBag size={17} />
              </button>
              <button className="secondary-btn full" onClick={() => {
                const text = encodeURIComponent(`Hello Trend Tribe, I'm interested in ${selectedProduct.name} (${money(selectedProduct.price)}). Is it available?`);
                window.open(`https://wa.me/2349017751552?text=${text}`, '_blank');
              }}><MessageCircle size={17} /> ASK ON WHATSAPP</button>
            </div>
          </div>
        </div>
      )}
      {showLogin && !adminUser && (
        <div className="overlay" onMouseDown={() => setShowLogin(false)}>
          <div className="login-card" onMouseDown={e => e.stopPropagation()}>
            <button className="login-close" onClick={() => setShowLogin(false)}><X /></button>
            <p className="eyebrow">TREND TRIBE ADMIN</p>
            <h2>Welcome back.</h2>
            <p>Enter the authorized admin email. We'll send a secure sign-in link to your inbox.</p>
            <label>ADMIN EMAIL<input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} autoComplete="email" /></label>
            <button className="primary-btn full" disabled={loginBusy} onClick={submitAdminLogin}>{loginBusy ? 'SENDING…' : 'SEND SECURE SIGN-IN LINK'} <ArrowRight size={17} /></button>
          </div>
        </div>
      )}
      {showCart && (
        <div className="overlay" onMouseDown={() => setShowCart(false)}>
          <aside className="drawer" onMouseDown={e => e.stopPropagation()}>
            <div className="drawer-head">
              <div>
                <p className="eyebrow">YOUR BAG</p>
                <h2>
                  {cartCount} {cartCount === 1 ? 'piece' : 'pieces'}
                </h2>
              </div>
              <button onClick={() => setShowCart(false)}>
                <X />
              </button>
            </div>
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingBag size={42} />
                <h3>Your bag is empty.</h3>
                <p>Explore the collection and add your favorites.</p>
              </div>
            ) : (
              <>
                <div className="cart-list">
                  {cart.map(item => (
                    <div className="cart-item" key={item.id}>
                      <div className="cart-thumb">
                        {item.imageUrl && <img src={item.imageUrl} alt="" />}
                      </div>
                      <div className="cart-detail">
                        <h4>{item.name}</h4>
                        <span>{money(item.price)}</span>
                        <div className="qty">
                          <button onClick={() => updateQty(item.id, -1)}>
                            <Minus size={13} />
                          </button>
                          <b>{item.quantity}</b>
                          <button onClick={() => updateQty(item.id, 1)}>
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>
                      <button
                        className="remove"
                        onClick={() =>
                          setCart(c => c.filter(x => x.id !== item.id))
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-bottom">
                  <div>
                    <span>ESTIMATED TOTAL</span>
                    <strong>{money(cartTotal)}</strong>
                  </div>
                  <button className="primary-btn full" onClick={beginCheckout}>
                    <ArrowRight size={17} /> PROCEED TO CHECKOUT
                  </button>
                  <button className="secondary-btn full" onClick={() => setCheckout({...checkout,paymentMethod:'whatsapp'})}>
                    <MessageCircle size={17} /> ORDER VIA WHATSAPP
                  </button>
                  <p>Securely submit your order first. Choose bank transfer or WhatsApp confirmation at checkout.</p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
      {showCheckout && (
        <div className="overlay" onMouseDown={() => !checkoutBusy && setShowCheckout(false)}>
          <div className="checkout-card" onMouseDown={e => e.stopPropagation()}>
            <button className="login-close" onClick={() => !checkoutBusy && setShowCheckout(false)}><X /></button>
            {!checkoutDone ? <>
              <p className="eyebrow">TREND TRIBE CHECKOUT</p><h2>Complete your <em>order.</em></h2>
              <div className="checkout-summary"><span>{cartCount} pieces</span><strong>{money(cartTotal)}</strong></div>
              <form onSubmit={submitCheckout}>
                <div className="form-grid">
                  <label>FULL NAME<input required value={checkout.name} onChange={e=>setCheckout({...checkout,name:e.target.value})} /></label>
                  <label>PHONE NUMBER<input required type="tel" value={checkout.phone} onChange={e=>setCheckout({...checkout,phone:e.target.value})} /></label>
                </div>
                <label>EMAIL (OPTIONAL)<input type="email" value={checkout.email} onChange={e=>setCheckout({...checkout,email:e.target.value})} /></label>
                <label>DELIVERY ADDRESS<input required value={checkout.address} onChange={e=>setCheckout({...checkout,address:e.target.value})} /></label>
                <label>CITY<input required value={checkout.city} onChange={e=>setCheckout({...checkout,city:e.target.value})} /></label>
                <label>ORDER NOTES (OPTIONAL)<textarea value={checkout.notes} onChange={e=>setCheckout({...checkout,notes:e.target.value})} placeholder="Size preferences, delivery instructions…" /></label>
                <p className="eyebrow payment-title">PAYMENT METHOD</p>
                <div className="payment-options">
                  <button type="button" className={checkout.paymentMethod==='bank_transfer'?'payment-option active':'payment-option'} onClick={()=>setCheckout({...checkout,paymentMethod:'bank_transfer'})}><strong>Bank Transfer</strong><span>Submit order and receive payment instructions.</span></button>
                  <button type="button" className={checkout.paymentMethod==='whatsapp'?'payment-option active':'payment-option'} onClick={()=>setCheckout({...checkout,paymentMethod:'whatsapp'})}><strong>WhatsApp</strong><span>Submit order and continue with Trend Tribe.</span></button>
                </div>
                <button className="primary-btn full" disabled={checkoutBusy}>{checkoutBusy?'SUBMITTING…':'PLACE ORDER'} <Check size={17}/></button>
              </form>
            </> : <>
              <p className="eyebrow">ORDER RECEIVED</p><h2>Thank you for shopping <em>Trend Tribe.</em></h2>
              <p className="checkout-success">Your order <strong>{checkoutDone.orderNumber}</strong> has been submitted. {checkoutDone.method==='bank_transfer' ? 'Trend Tribe will contact you with bank transfer payment instructions and delivery confirmation.' : 'Your WhatsApp conversation has been opened so the team can confirm payment and delivery.'}</p>
              <button className="primary-btn full" onClick={()=>setShowCheckout(false)}>CONTINUE SHOPPING <ArrowRight size={17}/></button>
            </>}
          </div>
        </div>
      )}
      {showAdmin && adminUser && (
        <AdminDashboard
          user={adminUser}
          products={products}
          onClose={() => setShowAdmin(false)}
          onRefresh={loadProducts}
          onSignOut={signOut}
        />
      )}
    </div>
  );
}

function AdminDashboard({
  user,
  products,
  onClose,
  onRefresh,
  onSignOut,
}: {
  user: { email?: string; name?: string };
  products: Product[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: 'Women',
    description: '',
    sizes: 'S, M, L, XL',
    imageData: '',
    imageType: 'image/jpeg',
    imageGallery: [] as { data: string; type: string; name: string }[],
    available: true,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).filter(file => file.type.startsWith('image/')).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result).split(',')[1] ?? '';
        setForm(f => ({
          ...f,
          imageData: f.imageData || data,
          imageType: f.imageType || file.type,
          imageGallery: [...f.imageGallery, { data, type: file.type, name: file.name }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price || !form.imageGallery.length) {
      setMessage('Product name, price and photo are required.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await api.post('/api/products', form);
      setForm({
        name: '',
        price: '',
        category: 'Women',
        description: '',
        sizes: 'S, M, L, XL',
        imageData: '',
        imageType: 'image/jpeg',
        imageGallery: [],
        available: true,
      });
      await onRefresh();
      setMessage('Product published to the storefront.');
    } catch {
      setMessage('Could not publish this product. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const deleteProduct = async (product: Product) => {
    if (
      !window.confirm(
        `Delete “${product.name}” from the storefront? This cannot be undone.`
      )
    )
      return;
    try {
      await api.delete(`/api/products/${product.id}`);
      await onRefresh();
    } catch {
      setMessage('Could not delete the product.');
    }
  };
  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <header className="admin-head">
          <div>
            <p className="eyebrow">PRIVATE ADMIN AREA</p>
            <h2>
              Trend Tribe <em>Studio.</em>
            </h2>
            <p>Signed in as {user.email}</p>
          </div>
          <div className="admin-actions">
            <button onClick={onSignOut}>
              <LogOut size={16} /> Sign out
            </button>
            <button onClick={onClose}>
              <X />
            </button>
          </div>
        </header>
        <div className="admin-body">
          <form className="admin-form" onSubmit={submit}>
            <div className="form-title">
              <Upload size={19} />
              <div>
                <h3>Publish a new wear</h3>
                <p>Only the authorized Trend Tribe admin can add inventory.</p>
              </div>
            </div>
            <label>
              PRODUCT PHOTOS
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={e => upload(e.target.files)}
              />
              <small>Select multiple photos of the same wear — front, back, detail, fit, etc.</small>
            </label>
            {form.imageGallery.length > 0 && (
              <div className="preview-gallery">
                {form.imageGallery.map((photo,index) => (
                  <div className="preview" key={photo.name + index}>
                    <img src={`data:${photo.type};base64,${photo.data}`} alt={`Preview ${index + 1}`} />
                  </div>
                ))}
              </div>
            )}
            <label>
              PRODUCT NAME
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Midnight Luxe Set"
              />
            </label>
            <div className="form-grid">
              <label>
                PRICE (₦)
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="85000"
                />
              </label>
              <label>
                CATEGORY
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.filter(x => x !== 'All' && x !== 'New In').map(
                    x => (
                      <option key={x}>{x}</option>
                    )
                  )}
                </select>
              </label>
            </div>
            <label>
              SIZES
              <input
                value={form.sizes}
                onChange={e => setForm({ ...form, sizes: e.target.value })}
              />
            </label>
            <label>
              DESCRIPTION
              <textarea
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the fit, fabric, occasion or details…"
              />
            </label>
            <label className="availability">
              <input
                type="checkbox"
                checked={form.available}
                onChange={e =>
                  setForm({ ...form, available: e.target.checked })
                }
              />{' '}
              Available for orders
            </label>
            <button className="primary-btn full" disabled={busy}>
              {busy ? 'PUBLISHING…' : 'PUBLISH TO STORE'}{' '}
              <ArrowRight size={17} />
            </button>
            {message && <p className="form-message">{message}</p>}
          </form>
          <section className="inventory">
            <div className="inventory-head">
              <div>
                <p className="eyebrow">LIVE INVENTORY</p>
                <h3>{products.length} pieces</h3>
              </div>
              <span>
                <Check size={14} /> Persistent store
              </span>
            </div>
            {products.length === 0 ? (
              <div className="inventory-empty">
                <Package size={28} />
                <p>Your published wears will appear here.</p>
              </div>
            ) : (
              <div className="inventory-list">
                {products.map(p => (
                  <div className="inventory-item" key={p.id}>
                    <div className="inventory-image">
                      {p.imageUrl && <img src={p.imageUrl} alt="" />}
                    </div>
                    <div>
                      <b>{p.name}</b>
                      <span>
                        {money(p.price)} • {p.category}
                      </span>
                    </div>
                    <button onClick={() => deleteProduct(p)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
export default App;
