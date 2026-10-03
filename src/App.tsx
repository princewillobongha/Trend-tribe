import { useEffect, useMemo, useState } from 'react';
import { api, auth, supabase } from './lib/appdeploy-client';
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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { const email = session?.user?.email?.trim().toLowerCase(); setAdminUser(email === ADMIN_EMAIL ? { email: session?.user?.email } : null); });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    localStorage.setItem('trend-tribe-cart', JSON.stringify(cart));
  }, [cart]);

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
  const whatsappOrder = () => {
    const lines = cart.map(
      item =>
        `• ${item.name} × ${item.quantity} — ${money(item.price * item.quantity)}`
    );
    const message = encodeURIComponent(
      `Hello Trend Tribe, I would like to order:\n\n${lines.join('\n')}\n\nEstimated total: ${money(cartTotal)}\n\nPlease confirm availability and delivery details.`
    );
    window.open(`https://wa.me/2349017751552?text=${message}`, '_blank');
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
          <span className="brand-mark">TT</span>
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
                <article className="product-card" key={product.id}>
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
                      onClick={() => addToCart(product)}
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
                    onClick={() => {
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
          <span className="footer-logo">TT</span>
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
                  <button className="primary-btn full" onClick={whatsappOrder}>
                    <MessageCircle size={17} /> ORDER VIA WHATSAPP
                  </button>
                  <p>
                    You'll confirm availability, sizes and delivery with Trend
                    Tribe on WhatsApp.
                  </p>
                </div>
              </>
            )}
          </aside>
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
    available: true,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const upload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () =>
      setForm(f => ({
        ...f,
        imageData: String(reader.result).split(',')[1] ?? '',
        imageType: file.type,
      }));
    reader.readAsDataURL(file);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price || !form.imageData) {
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
              PRODUCT PHOTO
              <input
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && upload(e.target.files[0])}
              />
            </label>
            {form.imageData && (
              <div className="preview">
                <img
                  src={`data:${form.imageType};base64,${form.imageData}`}
                  alt="Preview"
                />
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
