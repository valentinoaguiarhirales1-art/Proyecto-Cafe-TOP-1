import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = (product, options = {}) => {
    const id = `${product._id}-${options.size || ''}-${options.milk || ''}-${(options.extras || []).join(',')}-${options.notes || ''}`;
    setItems(prev => {
      const existing = prev.find(i => i.cartId === id);
      if (existing) {
        return prev.map(i => i.cartId === id ? { ...i, qty: Math.min(50, i.qty + 1) } : i);
      }
      return [...prev, { ...product, cartId: id, qty: 1, selectedSize: options.size, selectedMilk: options.milk, selectedExtras: options.extras || [], notes: options.notes || '', finalPrice: options.finalPrice || product.price }];
    });
    setIsOpen(true);
  };

  const removeItem  = (cartId) => setItems(prev => prev.filter(i => i.cartId !== cartId));
  const updateQuantity = (cartId, change) => setItems(prev => prev
    .map(item => item.cartId === cartId ? { ...item, qty: Math.min(50, item.qty + change) } : item)
    .filter(item => item.qty > 0));
  const clearCart   = ()       => setItems([]);
  const total       = items.reduce((s, i) => s + i.finalPrice * i.qty, 0);
  const count       = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, count, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
