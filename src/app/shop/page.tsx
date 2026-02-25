'use client';

import { useState, useContext, createContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, X, Truck, Package, Flame, Home, Building2, Factory, ChevronRight } from 'lucide-react';
import Link from 'next/link';

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] as const }
  })
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' as const }
  })
};

/* ─── Cart Context ─── */
interface CartItem { id: string; name: string; price: number; quantity: number; size?: string; }
interface CartContextType {
  items: CartItem[]; addToCart: (item: CartItem) => void; removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void; clearCart: () => void;
  totalItems: number; totalPrice: number;
}
const CartContext = createContext<CartContextType | undefined>(undefined);
const useCart = () => { const ctx = useContext(CartContext); if (!ctx) throw new Error('useCart must be used within CartProvider'); return ctx; };

function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const addToCart = (item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateQuantity = (id: string, quantity: number) => { if (quantity <= 0) { removeFromCart(id); return; } setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i)); };
  const clearCart = () => setItems([]);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + (i.price * i.quantity), 0);
  return <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>{children}</CartContext.Provider>;
}

/* ─── Product Card ─── */
function ProductCard({ product, index, onAdd }: { product: any; index: number; onAdd: (p: any) => void }) {
  return (
    <motion.div
      variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={index}
      className="glass-card overflow-hidden group flex flex-col"
    >
      {/* Header - grows to fill space */}
      <div className="p-6 pb-4 relative">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20" style={{ background: product.color }} />
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500"
          style={{ background: `${product.color}15`, border: `1px solid ${product.color}25` }}
        >
          <product.icon className="w-7 h-7" style={{ color: product.color }} />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">{product.name}</h3>
        {product.size && <p className="text-sm font-bold mb-2" style={{ color: product.color }}>{product.size}</p>}
        <p className="text-white/40 text-sm leading-relaxed">{product.description}</p>
      </div>

      {/* Footer */}
      <div className="p-6 pt-3 border-t border-white/5 mt-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black text-white">
            {product.price > 0 ? `PKR ${product.price.toLocaleString()}` : 'Custom'}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${product.inStock ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {product.inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
        <button
          onClick={() => onAdd(product)}
          disabled={!product.inStock}
          className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-30 flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5"
          style={{ background: product.inStock ? `linear-gradient(135deg, ${product.color}, ${product.color}cc)` : undefined }}
        >
          <ShoppingCart className="w-5 h-5" />
          {product.price > 0 ? 'Add to Cart' : 'Request Quote'}
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Cart Drawer ─── */
function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const cart = useCart();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0d1117] border-l border-white/10 shadow-2xl z-50"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-white">Cart ({cart.totalItems})</h2>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/50 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {cart.items.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.items.map(item => (
                      <div key={item.id} className="glass-card p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#f36523]/10 flex items-center justify-center shrink-0">
                          <Flame className="w-6 h-6 text-[#f36523]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                          {item.size && <p className="text-[#f8a11b] text-xs">{item.size}</p>}
                          <p className="text-white/50 text-sm">PKR {item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => cart.updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white/10 rounded text-white/50"><Minus className="w-4 h-4" /></button>
                          <span className="w-6 text-center text-white text-sm">{item.quantity}</span>
                          <button onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white/10 rounded text-white/50"><Plus className="w-4 h-4" /></button>
                        </div>
                        <button onClick={() => cart.removeFromCart(item.id)} className="p-1.5 hover:bg-red-500/10 text-red-400/50 hover:text-red-400 rounded transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.items.length > 0 && (
                <div className="border-t border-white/10 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/50">Total:</span>
                    <span className="text-2xl font-black text-gradient-flamora">PKR {cart.totalPrice.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => alert('Checkout coming soon!')}
                    className="w-full py-4 flame-gradient text-white font-bold rounded-xl hover:shadow-[0_0_25px_rgba(243,101,35,0.3)] transition-all duration-300"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Main Shop ─── */
function ShopContent() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cart = useCart();

  const products = [
    { id: '1', name: 'Domestic Cylinder', description: 'Perfect for everyday home cooking and small household needs.', price: 2500, size: '11.8 KG', icon: Home, color: '#f8a11b', inStock: true },
    { id: '2', name: 'Standard Cylinder', description: 'Ideal for larger families and small business operations.', price: 3200, size: '15 KG', icon: Building2, color: '#f36523', inStock: true },
    { id: '3', name: 'Commercial Cylinder', description: 'Heavy-duty supply for restaurants, factories, and industrial use.', price: 8500, size: '44.5 KG', icon: Factory, color: '#e1382b', inStock: true },
    { id: '4', name: 'Refill Service', description: 'Professional, certified refill for your existing LPG cylinders.', price: 1200, size: 'Any Size', icon: Flame, color: '#f8a11b', inStock: true },
    { id: '5', name: 'Bulk Order Package', description: 'Custom bulk pricing for businesses. Contact us for a tailored quote.', price: 0, icon: Package, color: '#f36523', inStock: true },
    { id: '6', name: 'Safety Equipment Kit', description: 'Complete safety kit: gloves, regulator wrench, leak detector & guide.', price: 3500, icon: Package, color: '#e1382b', inStock: true },
  ];

  const handleAddToCart = (product: any) => {
    cart.addToCart({ id: product.id, name: product.name, price: product.price, size: product.size, quantity: 1 });
  };

  return (
    <div className="landing-page min-h-screen bg-[#0a0e14]">

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0a0e14] to-[#0a0e14]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f8a11b]/5 rounded-full blur-[150px]" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              Shop
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
          >
            Order Your <span className="text-gradient-flamora">LPG Cylinders</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
          >
            Browse our range of certified LPG cylinders and services — delivered to your doorstep.
          </motion.p>
        </div>
      </section>


      {/* ═══ CART BUTTON ═══ */}
      <div className="fixed top-24 right-4 z-30">
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flame-gradient text-white p-4 rounded-full shadow-lg hover:shadow-[0_0_20px_rgba(243,101,35,0.3)] transition-all duration-300"
        >
          <ShoppingCart className="w-6 h-6" />
          {cart.totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-white text-[#e1382b] text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {cart.totalItems}
            </span>
          )}
        </button>
      </div>


      {/* ═══ PRODUCTS ═══ */}
      <section className="py-20 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Our <span className="text-gradient-flamora">Products</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Certified LPG cylinders for homes and businesses — competitive PKR pricing.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} onAdd={handleAddToCart} />
            ))}
          </div>
        </div>
      </section>


      {/* ═══ BULK CTA ═══ */}
      <section className="py-24 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f36523] bg-[#f36523]/10 rounded-full mb-6 border border-[#f36523]/20">
                For Businesses
              </span>
              <h2 className="text-4xl font-black text-white mb-6">
                Need <span className="text-gradient-flamora">Bulk Orders</span>?
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                For businesses requiring large quantities of LPG, we offer special volume-based pricing, dedicated account managers, and priority delivery across Pakistan.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: Package, text: 'Volume discounts available' },
                  { icon: Truck, text: 'Priority delivery service' },
                  { icon: Flame, text: 'Premium quality guaranteed' }
                ].map(f => (
                  <div key={f.text} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f36523]/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 text-[#f36523]" />
                    </div>
                    <span className="text-white/60 text-sm">{f.text}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 flame-gradient font-bold text-white rounded-xl hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(243,101,35,0.3)] transition-all duration-300"
              >
                Get Bulk Quote <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>

            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="glass-card p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#f36523]/10 rounded-full blur-[80px]" />
              <Truck className="w-24 h-24 mx-auto mb-6 text-[#f36523]/60 relative z-10" />
              <h3 className="text-2xl font-bold text-white relative z-10 mb-2">Bulk Delivery</h3>
              <p className="text-white/40 text-sm relative z-10">Custom solutions for your business needs</p>
            </motion.div>
          </div>
        </div>
      </section>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default function ShopPage() {
  return <CartProvider><ShopContent /></CartProvider>;
}