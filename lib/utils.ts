export function formatPrice(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function discountPercent(mrp: number, price: number) {
  return mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
}

export function imageFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.src = "https://placehold.co/800x600/f1eee6/344b40?text=Swag+Shopping+Mall";
}
