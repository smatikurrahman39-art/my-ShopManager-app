export interface Transaction {
  id: string;
  amount: number;
  type: 'cash-in' | 'cash-out';
  date: string;
  note: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  photo?: string; // base64 string
  transactions: Transaction[];
  totalBalance: number; // Positive means they owe us (cash-out), Negative means we owe them (cash-in)
}

export interface ShopProfile {
  shopName: string;
  ownerName: string;
  shopAddress?: string;
  shopType?: string;
  shopPhoto?: string; // base64 string
  isSetup: boolean;
}

export interface Product {
  id: string;
  name: string;
  photo?: string; // base64 string
  quantity: number;
  purchaseRate: number;
  sellingRate: number;
  unit: string;
  category: string;
  dateAdded: string;
}

export interface Category {
  id: string;
  name: string;
  photo?: string; // base64 string
}

export interface Expense {
  id: string;
  amount: number;
  note: string;
  date: string;
}

export interface OwnerTransaction {
  id: string;
  amount: number;
  type: 'gave' | 'took';
  date: string;
  note: string;
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  purchaseRate: number;
  totalAmount: number;
  date: string;
}

export interface SaleRecord {
  id: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    rate: number;
    total: number;
  }[];
  totalAmount: number;
  customerName?: string;
  customerPhone?: string;
  date: string;
}

export interface CashPurchase {
  id: string;
  photo?: string; // base64
  date: string;
  companyName: string;
  amount: number;
  note: string;
}
