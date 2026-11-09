export function homeFallback(djangoEnabled, examples) {
  return djangoEnabled ? [] : examples;
}

export function seasonalCards(djangoEventsEnabled, djangoPromotionsEnabled) {
  return {
    showEvent: !djangoEventsEnabled,
    showPromotion: !djangoPromotionsEnabled,
    showSection: !djangoEventsEnabled || !djangoPromotionsEnabled,
  };
}
