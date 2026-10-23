const CART_OPTION_SEPARATOR = "::";

export function cartLineKey(productId: string, option?: string) {
  return option ? `${productId}${CART_OPTION_SEPARATOR}${encodeURIComponent(option)}` : productId;
}

export function parseCartLineKey(key: string) {
  const separatorIndex = key.indexOf(CART_OPTION_SEPARATOR);
  if (separatorIndex < 0) return { productId: key, option: undefined };
  return {
    productId: key.slice(0, separatorIndex),
    option: decodeURIComponent(key.slice(separatorIndex + CART_OPTION_SEPARATOR.length)),
  };
}

type ProductOptions = { category?: string; hasSizeOptions?: boolean; sizeOptions?: string[] };

export function defaultProductOptions(category = "") {
  return /footwear|shoes/i.test(category)
    ? ["6", "7", "8", "9", "10", "11"]
    : ["S", "M", "L", "XL", "XXL"];
}

function isFashionCategory(category = "") {
  return /fashion|apparel|clothing|footwear|shoes/i.test(category);
}

export function getProductOptions(product: ProductOptions) {
  if (product.hasSizeOptions === false) return [];
  if (product.hasSizeOptions === true) return product.sizeOptions ?? [];
  return isFashionCategory(product.category) ? product.sizeOptions?.length ? product.sizeOptions : defaultProductOptions(product.category) : [];
}

export function hasProductOptions(product: ProductOptions) {
  return product.hasSizeOptions === true || (product.hasSizeOptions === undefined && isFashionCategory(product.category));
}

export function isCartOptionValid(product: ProductOptions, option?: string) {
  return hasProductOptions(product)
    ? Boolean(option && getProductOptions(product).includes(option))
    : option === undefined;
}

export function getProductPrice(product: { price: number; sizePrices?: Record<string, number> }, option?: string) {
  const optionPrice = option ? product.sizePrices?.[option] : undefined;
  return typeof optionPrice === "number" && Number.isSafeInteger(optionPrice) && optionPrice > 0
    ? optionPrice
    : product.price;
}

export function getStartingPrice(product: { price: number; category?: string; hasSizeOptions?: boolean; sizeOptions?: string[]; sizePrices?: Record<string, number> }) {
  if (!hasProductOptions(product)) return product.price;
  const options = getProductOptions(product);
  return options.length
    ? options.reduce((lowest, option) => Math.min(lowest, getProductPrice(product, option)), Number.MAX_SAFE_INTEGER)
    : product.price;
}
