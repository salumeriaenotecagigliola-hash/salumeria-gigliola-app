export type Language = 'it' | 'en' | 'de' | 'fr';

export interface MultilingualString {
  it: string;
  en: string;
  de: string;
  fr: string;
}

export interface Ingredient {
  name: string;
  category: string;
}

export interface Extra extends Ingredient {
  id: string;
  price: number;
  targets: string[];
}

export interface Product {
  id?: string;
  name: MultilingualString;
  category: MultilingualString;
  price: number;
  description: MultilingualString;
  imageUrl?: string;
  available: boolean;
  isVisible: boolean;
  allergens: string[];
  options?: string[];
  baseIngredients?: Ingredient[];
  requiresWeight?: boolean;
}

export type OrderStatus = 'pending' | 'preparing' | 'served' | 'paid' | 'cancelled' | 'linked';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  paidQuantity?: number; // How many of this item have been paid for
  deliveredQuantity?: number; // How many of this item have been delivered
  originOrderId?: string; // ID of the order this item belongs to
  originStatus?: OrderStatus; // Status of the order this item belongs to
  notes?: string;
  variant?: string;
  weightInfo?: string;
  subItems?: { name: string; price: number }[];
  customizationOptions?: any;
}

export interface Order {
  id: string;
  tableNumber: string;
  customerName?: string;
  customerLastName?: string;
  customerPhone?: string;
  items: OrderItem[];
  total: number;
  paidAmount?: number; // How much has been paid overall
  paymentGroupId?: string;
  status: OrderStatus;
  waiter?: string;
  notes?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  allOrderIds?: string[]; // IDs of merged orders
  linkedTables?: string[]; // Numbers of linked tables
}
