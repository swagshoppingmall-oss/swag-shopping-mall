export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp: number;
  unit: string;
  stock: number;
  rating: number;
  reviews: number;
  image: string;
  images?: string[];
  description: string;
  specifications?: Record<string, string>;
  hasSizeOptions?: boolean;
  sizeOptions?: string[];
  sizePrices?: Record<string, number>;
  tags?: string[];
  active?: boolean;
  returnAvailable?: boolean;
  returnDays?: number;
};

export type CartLine = { productId: string; quantity: number };
export type DeliveryAddress = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};
export type StoreOrder = {
  id: string;
  userId: string;
  customerEmail?: string;
  items: Array<{ productId: string; name: string; price: number; quantity: number; option?: string }>;
  address: DeliveryAddress;
  total: number;
  subtotal?: number;
  discount?: number;
  status: string;
  createdAt?: { toDate: () => Date } | Date | string;
  payment?: { paymentId?: string; method?: string; provider?: string };
};
