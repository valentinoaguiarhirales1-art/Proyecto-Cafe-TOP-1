import incorrectImages from '../../../shared/incorrectProductImages.json';
import incorrectPromotionImages from '../../../shared/incorrectPromotionImages.json';

function correctImage(item, name, images) {
  if (item && Object.hasOwn(images, name)) {
    const replacements = images[name];
    if (Object.hasOwn(replacements, item.imageUrl)) {
      return { ...item, imageUrl: replacements[item.imageUrl] };
    }
  }
  return item;
}

export const withCorrectProductImage = (product) => correctImage(product, product?.name, incorrectImages);
export const withCorrectPromotionImage = (promotion) => correctImage(promotion, promotion?.title, incorrectPromotionImages);
