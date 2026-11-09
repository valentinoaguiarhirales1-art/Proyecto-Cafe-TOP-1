import menuItems from '../../../shared/menuItems.json';

export const defaultProducts = menuItems.map((product, index) => ({
  ...product,
  _id: `offline-${index + 1}`,
  isOfflineProduct: true,
  isAvailable: true,
  customization: {
    sizes: [],
    milkOptions: [],
    extras: [],
    ...product.customization,
  },
}));
