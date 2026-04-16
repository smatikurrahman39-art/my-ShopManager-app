import React, { useState, useEffect, useMemo, FormEvent, useRef, ChangeEvent } from 'react';
import { 
  Plus, 
  Minus,
  Search, 
  User, 
  Phone, 
  MapPin, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Trash2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  Store, 
  UserCircle,
  Save,
  X,
  History,
  TrendingUp,
  TrendingDown,
  Wallet,
  Camera,
  Share2,
  Download,
  Filter,
  Briefcase,
  LogOut,
  Smartphone,
  Fingerprint,
  MoreHorizontal,
  Menu,
  Calendar,
  Lock,
  Languages,
  Key,
  Globe,
  PackagePlus,
  ShoppingCart,
  Package,
  Check,
  Facebook,
  MessageCircle,
  ArrowUpDown,
  ShoppingBag,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Transaction, ShopProfile, Product, Category, OwnerTransaction, PurchaseRecord, SaleRecord, Expense, CashPurchase } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  setDoc, 
  getDoc, 
  doc, 
  onSnapshot,
  collection,
  getDocs,
  writeBatch,
  testConnection,
  handleFirestoreError,
  OperationType,
  User as FirebaseUser
} from './firebase';

export default function App() {
  // --- Helpers ---
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    if (data === null) return null;
    if (Array.isArray(data)) return data.map(sanitizeData);
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        const value = sanitizeData(data[key]);
        if (value !== undefined) {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  };

  // --- State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState('');

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [shopProfile, setShopProfile] = useState<ShopProfile>({
    shopName: '',
    ownerName: '',
    isSetup: false
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState<Customer | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState<{ type: 'cash-in' | 'cash-out', editId?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'due' | 'advance'>('all');
  const [language, setLanguage] = useState<'en' | 'bn'>('bn');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [isChangingNumber, setIsChangingNumber] = useState(false);
  const [isShopView, setIsShopView] = useState(false);
  const [shopAction, setShopAction] = useState<'menu' | 'entry' | 'sale' | 'stock' | 'category_details' | 'expense' | 'cashbox' | 'stats_history' | 'cash_purchase'>('menu');
  const [statsHistoryType, setStatsHistoryType] = useState<'purchase' | 'sale' | 'expense'>('sale');
  const [statsDateFilter, setStatsDateFilter] = useState<string>('');
  const [saleItems, setSaleItems] = useState<{ id: string, name: string, quantity: number, rate: number, total: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: 'General' },
    { id: '2', name: 'Grocery' },
    { id: '3', name: 'Electronics' }
  ]);
  const [selectedStockCategory, setSelectedStockCategory] = useState<string>('all');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [saleSearchQuery, setSaleSearchQuery] = useState('');
  const [selectedProductForSale, setSelectedProductForSale] = useState<Product | null>(null);
  const [showSaleSuggestions, setShowSaleSuggestions] = useState(false);
  const [selectedCategoryForDetails, setSelectedCategoryForDetails] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | boolean | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingExpense, setEditingExpense] = useState<{ id: string, amount: number, note: string, date: string } | null>(null);
  const [isViewingExpenseHistory, setIsViewingExpenseHistory] = useState(false);
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const [expenseDateFilter, setExpenseDateFilter] = useState('');
  const [cashPurchases, setCashPurchases] = useState<CashPurchase[]>([]);
  const [editingCashPurchase, setEditingCashPurchase] = useState<CashPurchase | null>(null);
  const [isViewingCashPurchaseHistory, setIsViewingCashPurchaseHistory] = useState(false);
  const [cashPurchaseSearchQuery, setCashPurchaseSearchQuery] = useState('');
  const [cashPurchaseDateFilter, setCashPurchaseDateFilter] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'category' | 'product' | 'customer' | 'expense' | 'cash_purchase',
    id: string
  } | null>(null);
  
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSaleCustomerModalOpen, setIsSaleCustomerModalOpen] = useState(false);
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [activeAboutSlide, setActiveAboutSlide] = useState(0);
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState(false);
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [isStatsDetailsModalOpen, setIsStatsDetailsModalOpen] = useState(false);
  const [isOwnerTransactionModalOpen, setIsOwnerTransactionModalOpen] = useState<{ type: 'gave' | 'took' } | null>(null);
  const [selectedStatsDetails, setSelectedStatsDetails] = useState<{ date: string, type: 'purchase' | 'sale' | 'expense' } | null>(null);
  const [dailyStats, setDailyStats] = useState<Record<string, { sales: number, purchases: number, expenses: number }>>({});
  const [expenses, setExpenses] = useState<{ id: string, amount: number, note: string, date: string }[]>([]);
  const [ownerTransactions, setOwnerTransactions] = useState<OwnerTransaction[]>([]);
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>([]);
  const [saleRecords, setSaleRecords] = useState<SaleRecord[]>([]);
  const [editingOwnerTransaction, setEditingOwnerTransaction] = useState<OwnerTransaction | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [criticalErrorInfo, setCriticalErrorInfo] = useState<string | null>(null);
  const [ownerTransactionDateFilter, setOwnerTransactionDateFilter] = useState<string>('');
  const [cashboxHistoryType, setCashboxHistoryType] = useState<'none' | 'sale' | 'purchase' | 'expense' | 'owner_gave' | 'owner_took' | 'capital'>('none');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [isViewingAllPurchases, setIsViewingAllPurchases] = useState(false);
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [purchaseDateFilter, setPurchaseDateFilter] = useState('');
  const [isViewingOwnerHistory, setIsViewingOwnerHistory] = useState(false);
  const [isViewingAllSales, setIsViewingAllSales] = useState(false);
  const [saleSearchQueryHeader, setSaleSearchQueryHeader] = useState('');
  const [saleDateFilterHeader, setSaleDateFilterHeader] = useState('');
  const [saleSortOrder, setSaleSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedSaleForDetails, setSelectedSaleForDetails] = useState<SaleRecord | null>(null);
  const [editingSaleItem, setEditingSaleItem] = useState<{ saleId: string, itemIndex: number, quantity: number, rate: number, productName: string } | null>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Navigation History Handling ---
  useEffect(() => {
    // Initial state
    window.history.replaceState({
      selectedCustomerId: null,
      isShopView: false,
      shopAction: 'menu',
      isSettingsOpen: false,
      isViewingAllPurchases: false,
      isViewingAllSales: false,
      cashboxHistoryType: 'none'
    }, '');

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (!state) {
        // Reset to home
        setSelectedCustomerId(null);
        setIsShopView(false);
        setIsSettingsOpen(false);
        setIsMoreMenuOpen(false);
        setIsViewingAllPurchases(false);
        setIsViewingAllSales(false);
        return;
      }

      setSelectedCustomerId(state.selectedCustomerId || null);
      setIsShopView(state.isShopView || false);
      setShopAction(state.shopAction || 'menu');
      setIsSettingsOpen(state.isSettingsOpen || false);
      setIsViewingAllPurchases(state.isViewingAllPurchases || false);
      setIsViewingAllSales(state.isViewingAllSales || false);
      setIsViewingCashPurchaseHistory(state.isViewingCashPurchaseHistory || false);
      setIsViewingExpenseHistory(state.isViewingExpenseHistory || false);
      setIsViewingOwnerHistory(state.isViewingOwnerHistory || false);
      setCashboxHistoryType(state.cashboxHistoryType || 'none');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const pushNav = (updates: any) => {
    const currentState = {
      selectedCustomerId,
      isShopView,
      shopAction,
      isSettingsOpen,
      isViewingAllPurchases,
      isViewingAllSales,
      isViewingCashPurchaseHistory,
      isViewingExpenseHistory,
      isViewingOwnerHistory,
      cashboxHistoryType,
      ...updates
    };
    window.history.pushState(currentState, '');
  };

  // Wrap state setters to push history
  const navigateToCustomer = (id: string | null) => {
    pushNav({ selectedCustomerId: id });
    setSelectedCustomerId(id);
  };

  const navigateToShop = (isShop: boolean) => {
    pushNav({ isShopView: isShop, shopAction: 'menu' });
    setIsShopView(isShop);
    setShopAction('menu');
  };

  const navigateToShopAction = (action: typeof shopAction) => {
    pushNav({ 
      shopAction: action, 
      isViewingAllPurchases: false, 
      isViewingAllSales: false, 
      isViewingCashPurchaseHistory: false,
      isViewingExpenseHistory: false,
      isViewingOwnerHistory: false,
      cashboxHistoryType: 'none'
    });
    setShopAction(action);
    setIsViewingAllPurchases(false);
    setIsViewingAllSales(false);
    setIsViewingCashPurchaseHistory(false);
    setIsViewingExpenseHistory(false);
    setIsViewingOwnerHistory(false);
    setCashboxHistoryType('none');
  };

  const navigateToCashPurchaseHistory = (isViewing: boolean) => {
    pushNav({ isViewingCashPurchaseHistory: isViewing, shopAction: 'cash_purchase' });
    setIsViewingCashPurchaseHistory(isViewing);
    setShopAction('cash_purchase');
  };

  const navigateToExpenseHistory = (isViewing: boolean) => {
    pushNav({ isViewingExpenseHistory: isViewing, shopAction: 'expense' });
    setIsViewingExpenseHistory(isViewing);
    setShopAction('expense');
  };

  const navigateToOwnerHistory = (type: typeof cashboxHistoryType, isViewing: boolean) => {
    pushNav({ cashboxHistoryType: type, isViewingOwnerHistory: isViewing, shopAction: 'cashbox' });
    setCashboxHistoryType(type);
    setIsViewingOwnerHistory(isViewing);
    setShopAction('cashbox');
  };

  const navigateToSettings = (isOpen: boolean) => {
    pushNav({ isSettingsOpen: isOpen });
    setIsSettingsOpen(isOpen);
  };

  const navigateToAllPurchases = (isViewing: boolean) => {
    pushNav({ isViewingAllPurchases: isViewing });
    setIsViewingAllPurchases(isViewing);
  };

  const navigateToAllSales = (isViewing: boolean) => {
    pushNav({ isViewingAllSales: isViewing });
    setIsViewingAllSales(isViewing);
  };

  // --- Firebase Sync ---
  useEffect(() => {
    testConnection(); // Run connection test on mount
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Initial sync from cloud
        const syncFromCloud = async () => {
          const path = `backups/${currentUser.uid}/data`;
          try {
            const dataColRef = collection(db, 'backups', currentUser.uid, 'data');
            const querySnapshot = await getDocs(dataColRef);
            
            if (!querySnapshot.empty) {
              const cloudData: any = {};
              const chunkedParts: Record<string, any[]> = {};
              const splitCustomers: Record<string, { meta: any, transactions: any[] }> = {};

              querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (doc.id.includes('_chunk_')) {
                  const parts = doc.id.split('_chunk_');
                  const baseId = parts[0];
                  const chunkIdx = parseInt(parts[1]);
                  if (!chunkedParts[baseId]) chunkedParts[baseId] = [];
                  chunkedParts[baseId][chunkIdx] = data.value;
                } else if (doc.id.includes('_cust_')) {
                  const parts = doc.id.split('_cust_');
                  const subParts = parts[1].split('_');
                  const custId = subParts[0];
                  if (!splitCustomers[custId]) splitCustomers[custId] = { meta: null, transactions: [] };
                  
                  if (doc.id.includes('_meta')) {
                    splitCustomers[custId].meta = data.value;
                  } else if (doc.id.includes('_t_')) {
                    const tIdx = parseInt(subParts[subParts.length - 1]);
                    if (!splitCustomers[custId].transactions) splitCustomers[custId].transactions = [];
                    // We'll sort them later or just push if index doesn't matter much for reconstruction order
                    splitCustomers[custId].transactions.push({ idx: tIdx, data: data.value });
                  }
                } else {
                  cloudData[doc.id] = data.value;
                }
              });

              // Reconstruct chunked parts
              Object.keys(chunkedParts).forEach(baseId => {
                cloudData[baseId] = chunkedParts[baseId].flat().filter(i => i !== undefined);
              });

              // Reconstruct split customers
              if (cloudData.customers) {
                cloudData.customers = cloudData.customers.map((c: any) => {
                  if (c._isSplit && splitCustomers[c.id]) {
                    const split = splitCustomers[c.id];
                    const sortedTransactions = split.transactions
                      .sort((a, b) => a.idx - b.idx)
                      .flatMap(t => t.data);
                    return { ...split.meta, transactions: sortedTransactions };
                  }
                  return c;
                });
              }

              if (customers.length === 0 && (cloudData.customers?.length > 0 || cloudData.saleRecords?.length > 0)) {
                if (cloudData.customers) setCustomers(cloudData.customers);
                setProducts(cloudData.products || []);
                setCategories(cloudData.categories || []);
                setDailyStats(cloudData.dailyStats || {});
                setExpenses(cloudData.expenses || []);
                setOwnerTransactions(cloudData.ownerTransactions || []);
                setPurchaseRecords(cloudData.purchaseRecords || []);
                setSaleRecords(cloudData.saleRecords || []);
                setShopProfile(cloudData.shopProfile || shopProfile);
              }
            }
          } catch (err) {
            setCriticalError(language === 'bn' ? 'ডাটাবেস কানেকশন এরর!' : 'Database Connection Error!');
            setCriticalErrorInfo(err instanceof Error ? err.message : String(err));
            handleFirestoreError(err, OperationType.GET, path);
          }
        };
        syncFromCloud();
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-backup to cloud
  useEffect(() => {
    if (!user || !isLoggedIn) return;

    const timeoutId = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const batch = writeBatch(db);
        const dataCol = (id: string) => doc(db, 'backups', user.uid, 'data', id);
        
        const savePart = (id: string, data: any) => {
          const sanitized = sanitizeData(data);
          if (!Array.isArray(sanitized)) {
            batch.set(dataCol(id), { value: sanitized });
            return;
          }

          const MAX_CHUNK_SIZE = 300000; 
          let currentChunk: any[] = [];
          let currentSize = 0;
          let chunkIdx = 0;

          sanitized.forEach((item) => {
            let itemToSave = item;
            let itemSize = JSON.stringify(itemToSave).length;

            // If a single item is too large (e.g. > 800KB), we must split it or truncate it
            if (itemSize > 800000 && id === 'customers' && itemToSave.transactions) {
               const transactions = itemToSave.transactions;
               const metadata = { ...itemToSave, transactions: [] };
               batch.set(dataCol(`${id}_cust_${itemToSave.id}_meta`), { value: metadata });
               
               let tChunk: any[] = [];
               let tSize = 0;
               let tIdx = 0;
               transactions.forEach((t: any) => {
                 const ts = JSON.stringify(t).length;
                 if (tChunk.length > 0 && tSize + ts > MAX_CHUNK_SIZE) {
                   batch.set(dataCol(`${id}_cust_${itemToSave.id}_t_${tIdx}`), { value: tChunk });
                   tIdx++;
                   tChunk = [];
                   tSize = 0;
                 }
                 tChunk.push(t);
                 tSize += ts;
               });
               if (tChunk.length > 0) {
                 batch.set(dataCol(`${id}_cust_${itemToSave.id}_t_${tIdx}`), { value: tChunk });
               }
               
               itemToSave = { id: itemToSave.id, _isSplit: true };
               itemSize = JSON.stringify(itemToSave).length;
            } else if (itemSize > 800000) {
               if (itemToSave.photo) {
                 itemToSave = { ...itemToSave, photo: undefined, _photoRemoved: true };
                 itemSize = JSON.stringify(itemToSave).length;
               }
            }

            if (currentChunk.length > 0 && currentSize + itemSize > MAX_CHUNK_SIZE) {
              batch.set(dataCol(`${id}_chunk_${chunkIdx}`), { value: currentChunk });
              chunkIdx++;
              currentChunk = [];
              currentSize = 0;
            }
            
            currentChunk.push(itemToSave);
            currentSize += itemSize;

            if (currentSize > MAX_CHUNK_SIZE) {
              batch.set(dataCol(`${id}_chunk_${chunkIdx}`), { value: currentChunk });
              chunkIdx++;
              currentChunk = [];
              currentSize = 0;
            }
          });

          if (currentChunk.length > 0) {
            batch.set(dataCol(`${id}_chunk_${chunkIdx}`), { value: currentChunk });
          }
          batch.set(dataCol(id), { isChunked: true, value: [] });
        };

        savePart('customers', customers);
        savePart('products', products);
        savePart('categories', categories);
        savePart('dailyStats', dailyStats);
        savePart('expenses', expenses);
        savePart('ownerTransactions', ownerTransactions);
        savePart('purchaseRecords', purchaseRecords);
        savePart('saleRecords', saleRecords);
        savePart('shopProfile', shopProfile);
        
        // Also update the main backup doc for timestamp
        batch.set(doc(db, 'backups', user.uid), { lastBackup: new Date().toISOString() }, { merge: true });

        await batch.commit();
      } catch (err) {
        setCriticalError(language === 'bn' ? 'ব্যাকআপ এরর!' : 'Backup Error!');
        setCriticalErrorInfo(err instanceof Error ? err.message : String(err));
        handleFirestoreError(err, OperationType.WRITE, `backups/${user.uid}`);
      } finally {
        setIsSyncing(false);
      }
    }, 5000); // Debounce 5s

    return () => clearTimeout(timeoutId);
  }, [user, isLoggedIn, customers, products, categories, dailyStats, expenses, ownerTransactions, purchaseRecords, saleRecords, shopProfile]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccessMessage(language === 'bn' ? 'গুগল লগইন সফল হয়েছে!' : 'Google login successful!');
    } catch (err) {
      console.error('Google login error:', err);
      alert(language === 'bn' ? 'লগইন ব্যর্থ হয়েছে!' : 'Login failed!');
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await signOut(auth);
      setSuccessMessage(language === 'bn' ? 'লগআউট সফল হয়েছে!' : 'Logout successful!');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };
  const filteredSales = useMemo(() => {
    return saleRecords
      .filter(r => {
        const rDate = r.date.split('T')[0];
        const matchesDate = !saleDateFilterHeader || rDate === saleDateFilterHeader;
        const matchesSearch = !saleSearchQueryHeader || 
                            r.items.some(i => i.productName.toLowerCase().includes(saleSearchQueryHeader.toLowerCase())) || 
                            r.customerName.toLowerCase().includes(saleSearchQueryHeader.toLowerCase());
        return matchesDate && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return saleSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [saleRecords, saleDateFilterHeader, saleSearchQueryHeader, saleSortOrder]);

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateCashInHand = () => {
    const totalSales = saleRecords.reduce((acc, r) => acc + r.totalAmount, 0);
    const totalCashPurchases = cashPurchases.reduce((acc, r) => acc + r.amount, 0);
    const totalExpenses = expenses.reduce((acc, r) => acc + r.amount, 0);
    const totalOwnerGave = ownerTransactions.filter(t => t.type === 'gave').reduce((acc, t) => acc + t.amount, 0);
    const totalOwnerTook = ownerTransactions.filter(t => t.type === 'took').reduce((acc, t) => acc + t.amount, 0);
    
    const totalCustomerNetCash = customers.reduce((acc, c) => {
      const cashIn = c.transactions.filter(t => t.type === 'cash-in').reduce((tAcc, t) => tAcc + t.amount, 0);
      const cashOut = c.transactions.filter(t => t.type === 'cash-out').reduce((tAcc, t) => tAcc + t.amount, 0);
      return acc + (cashIn - cashOut);
    }, 0);
    
    return (totalOwnerGave - totalOwnerTook) + totalSales - totalCashPurchases - totalExpenses + totalCustomerNetCash;
  };

  const calculateTotalProfit = () => {
    return saleRecords.reduce((acc, record) => {
      const recordProfit = record.items.reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        const pRate = product ? product.purchaseRate : item.rate;
        return itemAcc + ((item.rate - pRate) * item.quantity);
      }, 0);
      return acc + recordProfit;
    }, 0);
  };

  const getProfitTransactions = () => {
    const profitTransactions: any[] = [];
    saleRecords.forEach(record => {
      record.items.forEach((item, idx) => {
        const product = products.find(p => p.id === item.productId);
        const pRate = product ? product.purchaseRate : item.rate;
        const profit = (item.rate - pRate) * item.quantity;
        if (profit !== 0) {
          profitTransactions.push({
            id: `profit-${record.id}-${item.productId}-${idx}`,
            type: 'profit',
            amount: profit,
            note: `${item.productName} (${item.quantity} ${item.unit || ''})`,
            date: record.date,
            productName: item.productName
          });
        }
      });
    });
    return profitTransactions;
  };

  const calculateCurrentCapital = () => {
    const totalOwnerGave = ownerTransactions.filter(t => t.type === 'gave').reduce((acc, t) => acc + t.amount, 0);
    const totalOwnerTook = ownerTransactions.filter(t => t.type === 'took').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = expenses.reduce((acc, r) => acc + r.amount, 0);
    
    // Profit calculation
    const totalProfit = saleRecords.reduce((acc, record) => {
      const recordProfit = record.items.reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        const pRate = product ? product.purchaseRate : item.rate;
        return itemAcc + ((item.rate - pRate) * item.quantity);
      }, 0);
      return acc + recordProfit;
    }, 0);

    return totalOwnerGave - totalOwnerTook + totalProfit - totalExpenses;
  };

  const [isLocked, setIsLocked] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('tally_auto_lock_timeout');
    return saved ? parseInt(saved) : 0; // 0 means always lock on exit
  });
  const [lastActiveTime, setLastActiveTime] = useState<number>(Date.now());
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockFailedAttempts, setLockFailedAttempts] = useState(0);

  useEffect(() => {
    localStorage.setItem('tally_auto_lock_timeout', autoLockTimeout.toString());
  }, [autoLockTimeout]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setLastActiveTime(Date.now());
      } else if (document.visibilityState === 'visible' && isLoggedIn) {
        if (autoLockTimeout === 0) {
          setIsLocked(true);
        } else {
          const inactiveTime = (Date.now() - lastActiveTime) / 1000 / 60; // in minutes
          if (inactiveTime >= autoLockTimeout) {
            setIsLocked(true);
          }
        }
      }
    };

    const handleActivity = () => {
      if (!isLocked) {
        setLastActiveTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isLoggedIn, autoLockTimeout, lastActiveTime, isLocked]);

  const handleUnlock = () => {
    const userData = localStorage.getItem(`tally_user_${phoneNumber}`);
    if (userData) {
      const { pin: savedPin } = JSON.parse(userData);
      if (lockPinInput === savedPin) {
        setIsLocked(false);
        setLockPinInput('');
        setLockFailedAttempts(0);
        setLastActiveTime(Date.now());
      } else {
        setLockPinInput('');
        setLockFailedAttempts(prev => prev + 1);
        // Optional: add vibration or error state
      }
    }
  };

  useEffect(() => {
    if (lockPinInput.length === 4) {
      setTimeout(handleUnlock, 200);
    }
  }, [lockPinInput]);

  const handleSelectContact = async () => {
    try {
      // Check if Contact Picker API is supported
      const supported = 'contacts' in navigator && 'select' in (navigator as any).contacts;
      if (!supported) {
        alert(t.contactPickerNotSupported);
        return;
      }

      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);

      if (contacts.length > 0) {
        const contact = contacts[0];
        const name = contact.name && contact.name.length > 0 ? contact.name[0] : '';
        const phone = contact.tel && contact.tel.length > 0 ? contact.tel[0].replace(/\s+/g, '') : '';
        
        setIsEditingCustomer(prev => ({
          ...(prev || { id: '', name: '', phone: '', address: '', transactions: [], totalBalance: 0 }),
          name: name || prev?.name || '',
          phone: phone || prev?.phone || ''
        }));
      }
    } catch (err) {
      console.error('Contact picker error:', err);
    }
  };
  
  const translations = {
    en: {
      customers: "Customer",
      tallyKhata: "Shop Manager",
      search: "Search customer...",
      all: "All",
      due: "Due",
      savings: "Savings",
      totalDue: "Total Due",
      totalSavings: "Total Savings",
      menu: "Menu",
      addCustomer: "Add New Customer",
      editCustomer: "Edit Customer",
      customerName: "Customer Name",
      phoneNumber: "Phone Number",
      address: "Address",
      optional: "Optional",
      save: "Save",
      update: "Update",
      cancel: "Cancel",
      history: "History",
      cashIn: "Cash In (Deposit)",
      cashOut: "Cash Out (Due)",
      amount: "Amount",
      note: "Note / Description",
      confirm: "Confirm",
      shopProfile: "Shop Profile",
      settings: "Settings",
      dataBackup: "Data Backup",
      helpLine: "Help Line",
      about: "About",
      aboutText: "Assalamu Alaikum, respected user. We hope you are well. Warm greetings and congratulations from the Shop Manager team. Data backup of our app can be kept both offline and online. If your phone has an internet connection, data will be automatically backed up to your Gmail storage, so there is no fear of losing your data. You can also keep manual backups on your phone. For any need, contact us via the helpline.",
      aboutSlides: [
        "Assalamu Alaikum, respected user. We hope you are well. Warm greetings from the Shop Manager team.",
        "Our data backup is fully offline and online. Your data is automatically synced to your Google account when online.",
        "This ensures you never lose your data, even if you lose your phone. You can also export backups manually.",
        "Visit the Helpline section if you need any assistance or have questions. Thank you for choosing us!"
      ],
      thanks: "Thank You",
      logout: "Logout",
      editShop: "Edit Shop Profile",
      shopName: "Shop Name",
      ownerName: "Owner Name",
      shopAddress: "Shop Address",
      shopType: "Shop Type",
      pinChange: "Pin Change",
      numberChange: "Number Change",
      language: "Language",
      currentBalance: "Current Balance",
      paid: "Paid",
      noTransactions: "No transactions yet",
      login: "Login",
      signup: "Sign Up",
      pin: "4-Digit PIN",
      setupShop: "Setup your shop profile",
      startManaging: "Start Managing Khata",
      back: "Back",
      newPin: "New PIN",
      confirmPin: "Confirm PIN",
      newNumber: "New Phone Number",
      change: "Change",
      shop: "Shop",
      productEntry: "Product Entry",
      productSale: "Product Sale",
      stockProduct: "Stock Product",
      productName: "Product Name",
      productUnit: "Product Unit",
      unit: "Unit",
      productPiece: "Quantity",
      rate: "Rate",
      total: "Total",
      add: "Add",
      downloadMemo: "Download Memo",
      clearList: "Clear List",
      productPhoto: "Product Photo",
      purchaseRate: "Product Purchase Rate",
      sellingRate: "Product Selling Rate",
      category: "Category",
      selectCategory: "Select Category",
      addStock: "Purchase",
      stock: "Stock",
      noProducts: "No products in stock",
      totalStockValue: "Total Stock Value",
      totalProfitPotential: "Total Profit Potential",
      addCategory: "Add Category",
      categoryName: "Category Name",
      allCategories: "All Categories",
      editCategory: "Edit Category",
      categoryPhoto: "Category Photo",
      deleteCategory: "Delete Category",
      deleteProduct: "Delete Product",
      editProduct: "Edit Product",
      confirmDelete: "Are you sure you want to delete?",
      confirmDeleteCategory: "Are you sure? This will delete the category and all its products forever.",
      categoryDetails: "Category Details",
      searchProduct: "Search product...",
      deleteCustomer: "Delete Customer",
      confirmDeleteCustomer: "Are you sure? All records for this customer will be lost forever.",
      stockInfo: "Available Stock",
      outOfStock: "This product is not in stock",
      sl: "SL",
      sale: "Sale",
      newSale: "New Sale",
      saleSuccess: "Sale successful!",
      addProductSuccess: "Product purchase completed successfully!",
      thankYou: "Thank you for your business!",
      authorizedSignature: "Authorized Signature",
      memoFooter: "Generated by Shop Manager",
      cashMemo: "CASH MEMO",
      grandTotal: "Grand Total",
      memoNo: "Memo No",
      date: "Date",
      time: "Time",
      qty: "Qty",
      backupAndRestore: "Backup & Restore",
      backupSuccess: "Backup successful!",
      restoreSuccess: "Restore successful!",
      offlineBackup: "Offline Backup",
      exportFile: "Export Backup File",
      importFile: "Import Backup File",
      selectFile: "Select Backup File",
      invalidFile: "Invalid backup file.",
      deviceAuth: "Login with Device Security",
      deviceAuthSuccess: "Device authentication successful!",
      deviceAuthFailed: "Device authentication failed.",
      tooManyAttempts: "Too many failed attempts. Use device security.",
      lowStockAlert: "Low Stock Alert (5 or less)",
      selectContact: "Select from Contacts",
      contactPickerNotSupported: "Contact picker not supported on this device/browser.",
      autoLock: "Auto Lock",
      lockTimeout: "Lock Timeout (Minutes)",
      alwaysLock: "Always Lock on Exit",
      enterPinToUnlock: "Enter PIN to Unlock",
      appLocked: "App Locked",
      minutes: "Minutes",
      always: "Always",
      lockApp: "Lock App",
      totalPurchase: "Total Purchase",
      totalSale: "Total Sale",
      totalExpense: "Total Expense",
      totalCashPurchase: "Total Cash Purchase",
      expenseEntry: "Expense Entry",
      cashPurchaseEntry: "Cash Purchase Entry",
      companyName: "Shop/Company Name",
      cashBox: "Cash Box",
      expenseAmount: "Expense Amount",
      expenseNote: "Expense Note",
      addExpense: "Add Expense",
      expenseHistory: "Expense History",
      totalCash: "Total Cash",
      cashInHand: "Total Cash",
      filterByDate: "Filter by Date",
      expenseDate: "Expense Date",
      details: "Details",
      ownerGave: "Owner Gave",
      ownerTook: "Owner Took",
      ownerTransaction: "Owner Transaction",
      totalOwnerGave: "Total Owner Gave",
      totalOwnerTook: "Total Owner Took",
      initialBalance: "Initial Balance",
      adjustBalance: "Adjust Balance",
      currentCash: "Currently Total Cash",
      newCash: "Actual Total Cash",
      adjustmentNote: "Balance Adjustment",
      purchaseDate: "Purchase Date",
      quantity: "Quantity",
      viewSaleHistory: "View Sale History",
      from: "From",
      to: "To"
    },
    bn: {
      customers: "কাস্টমার",
      tallyKhata: "শপ ম্যানেজার",
      search: "কাস্টমার খুঁজুন...",
      all: "সব",
      due: "বাকি",
      savings: "জমা",
      totalDue: "মোট বাকি",
      totalSavings: "মোট জমা",
      menu: "মেনু",
      addCustomer: "নতুন কাস্টমার",
      editCustomer: "কাস্টমার এডিট",
      customerName: "কাস্টমারের নাম",
      phoneNumber: "মোবাইল নাম্বার",
      address: "ঠিকানা",
      optional: "ঐচ্ছিক",
      save: "সংরক্ষণ করুন",
      update: "আপডেট করুন",
      cancel: "বাতিল",
      history: "ইতিহাস",
      cashIn: "জমা (Cash In)",
      cashOut: "বাকি (Cash Out)",
      amount: "টাকার পরিমাণ",
      note: "নোট / বিবরণ",
      confirm: "নিশ্চিত করুন",
      shopProfile: "দোকানের প্রোফাইল",
      settings: "সেটিংস",
      dataBackup: "ডাটা ব্যাকআপ",
      helpLine: "হেল্প লাইন",
      about: "অ্যাপ সম্পর্কে",
      aboutText: "আসসালামু আলাইকুম সম্মানিত ইউজার আশা করি ভালো আছেন। শপ ম্যানেজারের পক্ষ থেকে আপনাকে আন্তরিকভাবে শুভেচ্ছা ও অভিনন্দন।\n\nআমাদের এই অ্যাপসটির ডাটা ব্যাকআপ সম্পূর্ন অফলাইন এবং অনলাইন ভিত্তিক রাখা যায়, আপনার ফোনে ইন্টারনেট কানেকশন থাকলে অটোমেটিক আপনার জিমেইল স্টোরেজে ডাটা ব্যাকআপ হয়ে যাবে যার ফলে আপনার ডাটা হারানোর ভয় নেই এবং আপনি চাইলে আপনার ফোনে ডাটা ব্যাকআপ দিয়ে রাখতে পারবেন।যেকোনো প্রয়োজনে হেল্পলাইন অপশন থেকে আমাদের সাথে যোগাযোগ করুন।",
      aboutSlides: [
        "আসসালামু আলাইকুম সম্মানিত ইউজার আশা করি ভালো আছেন। শপ ম্যানেজারের পক্ষ থেকে আপনাকে আন্তরিক শুভেচ্ছা ও অভিনন্দন।",
        "আমাদের এই অ্যাপসটির ডাটা ব্যাকআপ সম্পূর্ণ অফলাইন এবং অনলাইন ভিত্তিক রাখা যায় যার ফলে আপনার ডাটা হারানোর ভয় নেই।",
        "আপনার ফোনে ইন্টারনেট কানেকশন থাকলে অটোমেটিক আপনার জিমেইল স্টোরেজে ডাটা ব্যাকআপ হয়ে যাবে যা আপনার তথ্যকে সুরক্ষিত রাখে।",
        "আপনি চাইলে আপনার ফোনে ম্যানুয়ালি ডাটা ব্যাকআপ দিয়ে রাখতে পারবেন। যেকোনো প্রয়োজনে হেল্পলাইন থেকে আমাদের সাথে যোগাযোগ করুন।"
      ],
      thanks: "ধন্যবাদ",
      logout: "লগআউট",
      editShop: "দোকানের প্রোফাইল এডিট",
      shopName: "দোকানের নাম",
      ownerName: "মালিকের নাম",
      shopAddress: "দোকানের ঠিকানা",
      shopType: "দোকানের ধরন",
      pinChange: "পিন পরিবর্তন",
      numberChange: "নাম্বার পরিবর্তন",
      language: "ভাষা",
      currentBalance: "বর্তমান ব্যালেন্স",
      paid: "পরিশোধিত",
      noTransactions: "এখনো কোনো লেনদেন নেই",
      login: "লগইন",
      signup: "সাইন আপ",
      pin: "৪-ডিজিট পিন",
      setupShop: "দোকানের প্রোফাইল সেটআপ করুন",
      startManaging: "খাতা শুরু করুন",
      back: "পিছনে",
      newPin: "নতুন পিন",
      confirmPin: "পিন নিশ্চিত করুন",
      newNumber: "নতুন মোবাইল নাম্বার",
      change: "পরিবর্তন করুন",
      shop: "শপ",
      productEntry: "প্রোডাক্ট এন্ট্রি",
      productSale: "প্রোডাক্ট সেল",
      stockProduct: "স্টক প্রোডাক্ট",
      productName: "প্রোডাক্ট নাম",
      productUnit: "প্রোডাক্ট ইউনিট",
      unit: "ইউনিট",
      productPiece: "পরিমাণ",
      rate: "রেট",
      total: "মোট",
      add: "অ্যাড",
      downloadMemo: "ম্যামো ডাউনলোড",
      clearList: "লিস্ট মুছুন",
      productPhoto: "প্রোডাক্ট ছবি",
      purchaseRate: "প্রোডাক্ট ক্রয় রেট",
      sellingRate: "প্রোডাক্ট বিক্রয় রেট",
      category: "ক্যাটাগরি",
      selectCategory: "ক্যাটাগরি সিলেক্ট",
      addStock: "ক্রয়",
      stock: "স্টক",
      noProducts: "স্টকে কোনো প্রোডাক্ট নেই",
      totalStockValue: "মোট স্টক ভ্যালু",
      totalProfitPotential: "মোট সম্ভাব্য লাভ",
      addCategory: "ক্যাটাগরি যোগ করুন",
      categoryName: "ক্যাটাগরির নাম",
      allCategories: "সব ক্যাটাগরি",
      editCategory: "ক্যাটাগরি এডিট করুন",
      categoryPhoto: "ক্যাটাগরি ছবি",
      deleteCategory: "ক্যাটাগরি ডিলিট করুন",
      deleteProduct: "প্রোডাক্ট ডিলিট করুন",
      editProduct: "প্রোডাক্ট এডিট করুন",
      confirmDelete: "আপনি কি নিশ্চিত যে আপনি এটি ডিলিট করতে চান?",
      confirmDeleteCategory: "আপনি কি নিশ্চিত? এটি ক্যাটাগরি এবং এর সকল প্রোডাক্ট চিরতরে ডিলিট করে দেবে।",
      categoryDetails: "ক্যাটাগরি ডিটেইলস",
      searchProduct: "প্রোডাক্ট খুঁজুন...",
      deleteCustomer: "কাস্টমার ডিলিট করুন",
      confirmDeleteCustomer: "আপনি কি নিশ্চিত? এই কাস্টমারের সকল তথ্য চিরতরে হারিয়ে যাবে।",
      stockInfo: "স্টক আছে",
      outOfStock: "এই প্রোডাক্টটি স্টকে নেই",
      sl: "নং",
      sale: "সেল",
      newSale: "নতুন সেল",
      saleSuccess: "বিক্রয় সফল হয়েছে!",
      addProductSuccess: "প্রোডাক্ট ক্রয় সফলভাবে সম্পন্ন হয়েছে!",
      thankYou: "আমাদের সাথে ব্যবসা করার জন্য ধন্যবাদ!",
      authorizedSignature: "অনুমোদিত স্বাক্ষর",
      memoFooter: "শপ ম্যানেজার দ্বারা তৈরি",
      cashMemo: "ক্যাশ মেমো",
      grandTotal: "সর্বমোট:",
      memoNo: "মেমো নং",
      date: "তারিখ",
      time: "সময়",
      qty: "পরিমাণ",
      backupAndRestore: "ব্যাকআপ এবং রিস্টোর",
      backupSuccess: "ব্যাকআপ সফল হয়েছে!",
      restoreSuccess: "রিস্টোর সফল হয়েছে!",
      offlineBackup: "অফলাইন ব্যাকআপ",
      exportFile: "ব্যাকআপ ফাইল এক্সপোর্ট করুন",
      importFile: "ব্যাকআপ ফাইল ইমপোর্ট করুন",
      selectFile: "ব্যাকআপ ফাইল সিলেক্ট করুন",
      invalidFile: "অকার্যকর ব্যাকআপ ফাইল।",
      deviceAuth: "ফোনের সিকিউরিটি দিয়ে লগইন করুন",
      deviceAuthSuccess: "ডিভাইস অথেনটিকেশন সফল হয়েছে!",
      deviceAuthFailed: "ডিভাইস অথেনটিকেশন ব্যর্থ হয়েছে।",
      tooManyAttempts: "অতিরিক্ত ভুল পিন দিয়েছেন। ফোনের সিকিউরিটি ব্যবহার করুন।",
      lowStockAlert: "স্টক শেষ হওয়ার পথে (৫ পিস বা কম)",
      selectContact: "ফোনবুক থেকে নিন",
      contactPickerNotSupported: "আপনার ডিভাইসে কন্টাক্ট পিকার সাপোর্ট করে না।",
      autoLock: "অটো লক",
      lockTimeout: "লক টাইমআউট (মিনিট)",
      alwaysLock: "বের হলে সবসময় লক করুন",
      enterPinToUnlock: "আনলক করতে পিন দিন",
      appLocked: "অ্যাপ লক করা হয়েছে",
      minutes: "মিনিট",
      always: "সবসময়",
      lockApp: "অ্যাপ লক করুন",
      totalPurchase: "মোট ক্রয়",
      totalSale: "মোট বিক্রয়",
      totalExpense: "মোট খরচ",
      totalCashPurchase: "মোট ক্যাশ কেনা",
      expenseEntry: "খরচ এন্টি",
      cashPurchaseEntry: "ক্যাশ কেনা এন্ট্রি",
      companyName: "দোকান/কোম্পানি নাম",
      cashBox: "ক্যাশ বক্স",
      expenseAmount: "খরচের পরিমাণ",
      expenseNote: "খরচের বিবরণ",
      addExpense: "খরচ যোগ করুন",
      expenseHistory: "খরচের ইতিহাস",
      totalCash: "মোট ক্যাশ",
      cashInHand: "মোট ক্যাশ",
      filterByDate: "তারিখ অনুযায়ী খুঁজুন",
      expenseDate: "খরচের তারিখ",
      details: "বিস্তারিত",
      ownerGave: "মালিক দিল",
      ownerTook: "মালিক নিল",
      ownerTransaction: "মালিকের লেনদেন",
      totalOwnerGave: "মোট মালিক দিল",
      totalOwnerTook: "মোট মালিক নিল",
      currentCapital: "মোট মূলধন",
      totalProfit: "মোট লভ্যাংশ",
      profitHistory: "লভ্যাংশ হিস্টোরি",
      initialBalance: "শুরুর ব্যালেন্স",
      adjustBalance: "ব্যালেন্স সমন্বয়",
      currentCash: "বর্তমানে মোট ক্যাশ",
      newCash: "প্রকৃত মোট ক্যাশ",
      adjustmentNote: "ব্যালেন্স সমন্বয় (অটোমেটিক)",
      purchaseDate: "ক্রয় তারিখ",
      quantity: "পরিমাণ",
      viewSaleHistory: "বিক্রয় হিস্টরি দেখুন",
      from: "থেকে",
      to: "পর্যন্ত"
    }
  };

  const t = translations[language];

  const handleExportOffline = () => {
    const backupData = {
      shopProfile,
      customers,
      products,
      categories,
      dailyStats,
      phoneNumber,
      pin,
      language,
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shop_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage(t.backupSuccess);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleImportOffline = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!data.shopProfile || !data.customers || !data.phoneNumber) {
          alert(t.invalidFile);
          return;
        }

        if (!confirm(language === 'bn' ? 'আপনি কি নিশ্চিত? এটি আপনার বর্তমান ডাটা মুছে ফেলবে।' : 'Are you sure? This will overwrite your current data.')) return;

        setShopProfile(data.shopProfile);
        setCustomers(data.customers);
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setDailyStats(data.dailyStats || {});
        setPhoneNumber(data.phoneNumber);
        setPin(data.pin || '');
        if (data.language) setLanguage(data.language);
        
        // Save to localStorage
        localStorage.setItem('tally_logged_phone', data.phoneNumber);
        if (data.language) localStorage.setItem('tally_language', data.language);
        localStorage.setItem(`tally_shop_profile_${data.phoneNumber}`, JSON.stringify(data.shopProfile));
        localStorage.setItem(`tally_customers_${data.phoneNumber}`, JSON.stringify(data.customers));
        localStorage.setItem(`tally_products_${data.phoneNumber}`, JSON.stringify(data.products || []));
        localStorage.setItem(`tally_categories_${data.phoneNumber}`, JSON.stringify(data.categories || []));
        localStorage.setItem(`tally_daily_stats_${data.phoneNumber}`, JSON.stringify(data.dailyStats || {}));
        localStorage.setItem(`tally_user_${data.phoneNumber}`, JSON.stringify({ phoneNumber: data.phoneNumber, pin: data.pin || '' }));
        
        setSuccessMessage(t.restoreSuccess);
        setTimeout(() => setSuccessMessage(null), 3000);
        setIsBackupModalOpen(false);
      } catch (err) {
        console.error('Import error:', err);
        alert(t.invalidFile);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const shopPhotoRef = useRef<HTMLInputElement>(null);
  const customerPhotoRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  useEffect(() => {
    const savedPhone = localStorage.getItem('tally_logged_phone');
    const savedLang = localStorage.getItem('tally_language') as 'en' | 'bn';
    if (savedLang) setLanguage(savedLang);
    
    if (savedPhone) {
      setIsLoggedIn(true);
      if (autoLockTimeout === 0) setIsLocked(true);
      setPhoneNumber(savedPhone);
      
      const savedProfile = localStorage.getItem(`tally_shop_profile_${savedPhone}`);
      const savedCustomers = localStorage.getItem(`tally_customers_${savedPhone}`);
      
      if (savedProfile) setShopProfile(JSON.parse(savedProfile));
      if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
      
      const savedProducts = localStorage.getItem(`tally_products_${savedPhone}`);
      const savedCategories = localStorage.getItem(`tally_categories_${savedPhone}`);
      
      if (savedProducts) setProducts(JSON.parse(savedProducts));
      if (savedCategories) setCategories(JSON.parse(savedCategories));
      
      const savedStats = localStorage.getItem(`tally_daily_stats_${savedPhone}`);
      if (savedStats) setDailyStats(JSON.parse(savedStats));

      const savedExpenses = localStorage.getItem(`tally_expenses_${savedPhone}`);
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));

      const savedOwnerTransactions = localStorage.getItem(`tally_owner_transactions_${savedPhone}`);
      if (savedOwnerTransactions) setOwnerTransactions(JSON.parse(savedOwnerTransactions));

      const savedPurchaseRecords = localStorage.getItem(`tally_purchase_records_${savedPhone}`);
      if (savedPurchaseRecords) setPurchaseRecords(JSON.parse(savedPurchaseRecords));

      const savedSaleRecords = localStorage.getItem(`tally_sale_records_${savedPhone}`);
      if (savedSaleRecords) setSaleRecords(JSON.parse(savedSaleRecords));
    }
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('tally_language', language);
  }, [language]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_shop_profile_${phoneNumber}`, JSON.stringify(shopProfile));
    }
  }, [shopProfile, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_customers_${phoneNumber}`, JSON.stringify(customers));
    }
  }, [customers, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_products_${phoneNumber}`, JSON.stringify(products));
    }
  }, [products, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_categories_${phoneNumber}`, JSON.stringify(categories));
    }
  }, [categories, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_daily_stats_${phoneNumber}`, JSON.stringify(dailyStats));
    }
  }, [dailyStats, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_expenses_${phoneNumber}`, JSON.stringify(expenses));
    }
  }, [expenses, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_owner_transactions_${phoneNumber}`, JSON.stringify(ownerTransactions));
    }
  }, [ownerTransactions, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_purchase_records_${phoneNumber}`, JSON.stringify(purchaseRecords));
    }
  }, [purchaseRecords, isLoggedIn, phoneNumber]);

  useEffect(() => {
    if (isLoggedIn && phoneNumber) {
      localStorage.setItem(`tally_sale_records_${phoneNumber}`, JSON.stringify(saleRecords));
    }
  }, [saleRecords, isLoggedIn, phoneNumber]);

  const completeLogin = (phone: string) => {
    localStorage.setItem('tally_logged_phone', phone);
    setIsLoggedIn(true);
    
    // Load data for this phone
    const savedProfile = localStorage.getItem(`tally_shop_profile_${phone}`);
    const savedCustomers = localStorage.getItem(`tally_customers_${phone}`);
    
    if (savedProfile) setShopProfile(JSON.parse(savedProfile));
    else setShopProfile({ shopName: '', ownerName: '', isSetup: false });
    
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));
    else setCustomers([]);

    const savedProducts = localStorage.getItem(`tally_products_${phone}`);
    const savedCategories = localStorage.getItem(`tally_categories_${phone}`);
    
    if (savedProducts) setProducts(JSON.parse(savedProducts));
    else setProducts([]);
    
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    else setCategories([
      { id: '1', name: 'General' },
      { id: '2', name: 'Grocery' },
      { id: '3', name: 'Electronics' }
    ]);

    const savedOwnerTransactions = localStorage.getItem(`tally_owner_transactions_${phone}`);
    if (savedOwnerTransactions) setOwnerTransactions(JSON.parse(savedOwnerTransactions));
    else setOwnerTransactions([]);

    const savedPurchaseRecords = localStorage.getItem(`tally_purchase_records_${phone}`);
    if (savedPurchaseRecords) setPurchaseRecords(JSON.parse(savedPurchaseRecords));
    else setPurchaseRecords([]);

    const savedSaleRecords = localStorage.getItem(`tally_sale_records_${phone}`);
    if (savedSaleRecords) setSaleRecords(JSON.parse(savedSaleRecords));
    else setSaleRecords([]);
  };

  const handleDeviceAuth = async () => {
    try {
      if (!window.PublicKeyCredential) {
        setAuthError(language === 'bn' ? 'আপনার ব্রাউজার ডিভাইস সিকিউরিটি সাপোর্ট করে না।' : 'Your browser does not support device security.');
        return;
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setAuthError(language === 'bn' ? 'ডিভাইস সিকিউরিটি (ফিঙ্গারপ্রিন্ট/পিন) পাওয়া যায়নি।' : 'Device security (fingerprint/PIN) not available.');
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const options: any = {
        publicKey: {
          challenge,
          rp: { name: "Shop Manager" },
          user: {
            id: new Uint8Array(16),
            name: phoneNumber,
            displayName: phoneNumber
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            userVerification: "required",
            authenticatorAttachment: "platform"
          },
          timeout: 60000
        }
      };

      const credential = await navigator.credentials.create(options);
      if (credential) {
        if (isLocked) {
          setIsLocked(false);
          setLockFailedAttempts(0);
          setLastActiveTime(Date.now());
        } else {
          setFailedAttempts(0);
          completeLogin(phoneNumber);
        }
      }
    } catch (err) {
      console.error(err);
      setAuthError(t.deviceAuthFailed);
    }
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'signup') {
      const existingUser = localStorage.getItem(`tally_user_${phoneNumber}`);
      if (existingUser) {
        setAuthError('This number is already registered. Please login.');
        return;
      }
      if (pin.length !== 4) {
        setAuthError('PIN must be 4 digits.');
        return;
      }
      
      // Save user credentials
      localStorage.setItem(`tally_user_${phoneNumber}`, JSON.stringify({ phoneNumber, pin }));
      setFailedAttempts(0);
      completeLogin(phoneNumber);
      setShopProfile({ shopName: '', ownerName: '', isSetup: false });
      setCustomers([]);
    } else {
      const userData = localStorage.getItem(`tally_user_${phoneNumber}`);
      if (!userData) {
        setAuthError('User not found. Please sign up.');
        return;
      }
      
      const user = JSON.parse(userData);
      if (user.pin !== pin) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 3) {
          setAuthError(t.tooManyAttempts);
        } else {
          setAuthError(language === 'bn' ? `ভুল পিন। আরও ${3 - newAttempts} বার চেষ্টা করতে পারবেন।` : `Incorrect PIN. ${3 - newAttempts} attempts left.`);
        }
        return;
      }

      setFailedAttempts(0);
      completeLogin(phoneNumber);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tally_logged_phone');
    setIsLoggedIn(false);
    setPhoneNumber('');
    setShopProfile({ shopName: '', ownerName: '', isSetup: false });
    setCustomers([]);
  };

  // --- Handlers ---
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetupProfile = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setShopProfile(prev => ({
      ...prev,
      shopName: formData.get('shopName') as string,
      ownerName: formData.get('ownerName') as string,
      shopAddress: formData.get('shopAddress') as string,
      shopType: formData.get('shopType') as string,
      isSetup: true
    }));
  };

  const handleUpdateShopProfile = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setShopProfile(prev => ({
      ...prev,
      shopName: formData.get('shopName') as string,
      ownerName: formData.get('ownerName') as string,
      shopAddress: formData.get('shopAddress') as string,
      shopType: formData.get('shopType') as string,
    }));
    setIsEditingShop(false);
  };

  const handleAddCustomer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const photo = formData.get('photo_base64') as string;
    const newCustomer: Customer = {
      id: generateId(),
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      address: formData.get('address') as string,
      photo: photo || undefined,
      transactions: [],
      totalBalance: 0
    };
    setCustomers([...customers, newCustomer]);
    setIsAddingCustomer(false);
    setIsEditingCustomer(null);
  };

  const handleUpdateCustomer = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEditingCustomer) return;
    const formData = new FormData(e.currentTarget);
    const photo = formData.get('photo_base64') as string;
    const updatedCustomers = customers.map(c => 
      c.id === isEditingCustomer.id 
        ? { 
            ...c, 
            name: formData.get('name') as string, 
            phone: formData.get('phone') as string, 
            address: formData.get('address') as string,
            photo: photo || c.photo
          } 
        : c
    );
    setCustomers(updatedCustomers);
    setIsEditingCustomer(null);
  };

  const handleDeleteCustomer = (id: string) => {
    setDeleteConfirmation({ type: 'customer', id });
  };

  const confirmDeleteCustomer = (id: string) => {
    setCustomers(customers.filter(c => c.id !== id));
    if (selectedCustomerId === id) setSelectedCustomerId(null);
    setDeleteConfirmation(null);
  };

  const handleAddTransaction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomerId || !isAddingTransaction) return;
    
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const type = isAddingTransaction.type;
    const note = formData.get('note') as string;
    const selectedDate = formData.get('date') as string;

    // Capital Check for Cash Out (Baki)
    if (type === 'cash-out') {
      const currentCapital = calculateCashInHand();
      if (currentCapital < amount) {
        alert(language === 'bn' ? 'পর্যাপ্ত পরিমাণ ক্যাশ নেই' : 'Insufficient Cash Amount');
        return;
      }
    }
    
    const updatedCustomers = customers.map(c => {
      if (c.id === selectedCustomerId) {
        let newTransactions = [...c.transactions];
        let balanceAdjustment = 0;

        if (isAddingTransaction.editId) {
          // Editing existing transaction
          const oldIndex = newTransactions.findIndex(t => t.id === isAddingTransaction.editId);
          const oldTransaction = newTransactions[oldIndex];
          
          // Reverse old balance impact
          balanceAdjustment -= oldTransaction.type === 'cash-out' ? oldTransaction.amount : -oldTransaction.amount;
          
          // Apply new balance impact
          balanceAdjustment += type === 'cash-out' ? amount : -amount;

          newTransactions[oldIndex] = {
            ...oldTransaction,
            amount,
            type,
            note,
            date: selectedDate ? new Date(selectedDate).toISOString() : oldTransaction.date
          };
        } else {
          // Adding new transaction
          const newTransaction: Transaction = {
            id: generateId(),
            amount,
            type,
            date: selectedDate ? new Date(selectedDate).toISOString() : new Date().toISOString(),
            note
          };
          newTransactions = [newTransaction, ...newTransactions];
          balanceAdjustment = type === 'cash-out' ? amount : -amount;
        }

        return {
          ...c,
          transactions: newTransactions,
          totalBalance: c.totalBalance + balanceAdjustment
        };
      }
      return c;
    });

    setCustomers(updatedCustomers);
    setIsAddingTransaction(null);
  };

  const [isSaleConfirmed, setIsSaleConfirmed] = useState(false);

  const handleAddSaleItem = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('productName') as string;
    const quantity = Number(formData.get('productPiece'));
    const rate = Number(formData.get('rate'));
    
    // Find product in stock to check quantity
    const stockProduct = products.find(p => p.name === name);
    
    if (!stockProduct) {
      alert(t.outOfStock);
      return;
    }

    // Calculate how many of this product are already in the sale list
    const alreadyInList = saleItems
      .filter(item => item.name === name)
      .reduce((sum, item) => sum + item.quantity, 0);

    if (stockProduct.quantity < (alreadyInList + quantity)) {
      alert(t.outOfStock);
      return;
    }

    if (name && quantity > 0 && rate > 0) {
      const newItem = {
        id: generateId(),
        name,
        category: stockProduct.category,
        quantity,
        rate,
        total: quantity * rate
      };
      setSaleItems(prev => [...prev, newItem]);
      setIsSaleConfirmed(false); // Reset confirmation if new item added
      
      e.currentTarget.reset();
      setSaleSearchQuery('');
      setSelectedProductForSale(null);
    }
  };

  const handleConfirmSale = () => {
    if (saleItems.length === 0 || isSaleConfirmed) return;

    // Deduct all items from stock
    setProducts(prev => {
      const updatedProducts = [...prev];
      saleItems.forEach(saleItem => {
        const productIndex = updatedProducts.findIndex(p => p.name === saleItem.name);
        if (productIndex !== -1) {
          updatedProducts[productIndex] = {
            ...updatedProducts[productIndex],
            quantity: updatedProducts[productIndex].quantity - saleItem.quantity
          };
        }
      });
      return updatedProducts;
    });

    setIsSaleConfirmed(true);
    setSuccessMessage(t.saleSuccess);
    
    // Add Sale Record
    const saleTotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const newSaleRecord: SaleRecord = {
      id: generateId(),
      items: saleItems.map(item => {
        const product = products.find(p => p.name === item.name);
        return {
          productId: product?.id || '',
          productName: item.name,
          quantity: item.quantity,
          rate: item.rate,
          total: item.total
        };
      }),
      totalAmount: saleTotal,
      customerName: saleCustomerName,
      customerPhone: saleCustomerPhone,
      date: new Date().toISOString()
    };
    setSaleRecords(prev => [newSaleRecord, ...prev]);
    
    // Update Daily Stats
    const today = new Date().toISOString().split('T')[0];
    setDailyStats(prev => ({
      ...prev,
      [today]: {
        sales: (prev[today]?.sales || 0) + saleTotal,
        purchases: prev[today]?.purchases || 0,
        expenses: prev[today]?.expenses || 0
      }
    }));

    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const generateMemoPDF = async (cName?: string, cPhone?: string, items?: any[], customDate?: string) => {
    const itemsToUse = items || saleItems;
    if (itemsToUse.length === 0) return null;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Function to convert ArrayBuffer to Base64
    const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    let fontName = 'helvetica';
    try {
      // Fetch a Bengali font (Hind Siliguri) from a reliable source
      const fontUrl = 'https://cdn.jsdelivr.net/gh/googlefonts/hind-siliguri@master/fonts/ttf/HindSiliguri-Regular.ttf';
      const response = await fetch(fontUrl);
      if (response.ok) {
        const fontBuffer = await response.arrayBuffer();
        const fontBase64 = arrayBufferToBase64(fontBuffer);
        doc.addFileToVFS('HindSiliguri.ttf', fontBase64);
        doc.addFont('HindSiliguri.ttf', 'HindSiliguri', 'normal');
        fontName = 'HindSiliguri';
      }
    } catch (e) {
      console.error('Failed to load Bengali font, falling back to helvetica', e);
    }

    doc.setFont(fontName);
    
    // Header Background
    doc.setFillColor(100, 50, 200);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Shop Name
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontName, 'bold');
    doc.text(shopProfile.shopName, pageWidth / 2, 20, { align: 'center' });
    
    // Shop Details
    doc.setFontSize(10);
    doc.setTextColor(230, 230, 230);
    doc.setFont(fontName, 'normal');
    doc.text(shopProfile.shopAddress || '', pageWidth / 2, 28, { align: 'center' });
    doc.text(`Phone: ${phoneNumber}`, pageWidth / 2, 34, { align: 'center' });
    
    // Memo Title
    doc.setFontSize(18);
    doc.setTextColor(50, 50, 50);
    doc.setFont(fontName, 'bold');
    doc.text('CASH MEMO', pageWidth / 2, 60, { align: 'center' });
    
    // Customer Info
    if (cName || cPhone) {
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.setFont(fontName, 'bold');
      doc.text('Customer Details:', 14, 72);
      doc.setFont(fontName, 'normal');
      doc.setFontSize(10);
      if (cName) doc.text(`Name: ${cName}`, 14, 78);
      if (cPhone) doc.text(`Phone: ${cPhone}`, 14, 83);
    }

    // Date & Memo No
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont(fontName, 'normal');
    const dateY = (cName || cPhone) ? 72 : 72;
    const memoX = pageWidth - 14;
    doc.text(`Date: ${new Date(customDate || Date.now()).toLocaleDateString()}`, memoX, 72, { align: 'right' });
    doc.text(`Time: ${new Date(customDate || Date.now()).toLocaleTimeString()}`, memoX, 77, { align: 'right' });
    doc.text(`Memo No: #${generateId().slice(-6)}`, memoX, 82, { align: 'right' });
    
    const tableData = itemsToUse.map((item: any, index) => [
      index + 1,
      new Date(customDate || Date.now()).toLocaleDateString(),
      item.name || item.productName,
      item.category || '-',
      item.quantity,
      item.rate.toLocaleString(),
      item.total.toLocaleString()
    ]);
    
    const startY = (cName || cPhone) ? 90 : 85;

    autoTable(doc, {
      startY: startY,
      head: [[
        'SL',
        'Date',
        'Description',
        'Category',
        'Qty',
        'Rate',
        'Total'
      ]],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [100, 50, 200], 
        textColor: 255, 
        fontSize: 10, 
        fontStyle: 'bold',
        halign: 'center',
        font: fontName
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'left' },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'right', cellWidth: 25 },
        6: { halign: 'right', cellWidth: 25 }
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
        font: fontName
      },
      foot: [[
        '', '', '', '', '',
        'Grand Total',
        saleItems.reduce((sum, item) => sum + item.total, 0).toLocaleString()
      ]],
      footStyles: { 
        fillColor: [245, 245, 245], 
        textColor: [100, 50, 200], 
        fontSize: 11, 
        fontStyle: 'bold',
        halign: 'right',
        font: fontName
      }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // Thank You Note
    doc.setFontSize(12);
    doc.setTextColor(100, 50, 200);
    doc.setFont(fontName, 'italic');
    doc.text('Thank you for your business!', pageWidth / 2, finalY + 20, { align: 'center' });
    
    // Signature Line
    doc.setDrawColor(200);
    doc.line(pageWidth - 65, finalY + 45, pageWidth - 15, finalY + 45);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont(fontName, 'normal');
    doc.text('Authorized Signature', pageWidth - 40, finalY + 50, { align: 'center' });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont(fontName, 'normal');
    doc.text('Generated by Shop Manager', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    return doc;
  };

  const handleAddProduct = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const photo = formData.get('productPhoto_base64') as string;
    const name = formData.get('productName') as string;
    const newQuantity = Number(formData.get('productPiece'));
    const newPurchaseRate = Number(formData.get('purchaseRate'));
    const newSellingRate = Number(formData.get('sellingRate'));
    const unit = formData.get('unit') as string;
    const category = formData.get('category') as string;
    const purchaseDate = formData.get('purchaseDate') as string;
    const dateToUse = purchaseDate ? new Date(purchaseDate).toISOString() : new Date().toISOString();

    const purchaseTotal = newQuantity * newPurchaseRate;

    // Capital Check
    const currentCapital = calculateCashInHand();
    if (currentCapital < purchaseTotal) {
      alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই!' : 'Insufficient Cash!');
      return;
    }

    let productId = '';
    let isNewProduct = false;
    let purchaseRecord: PurchaseRecord | null = null;

    setProducts(prev => {
      const existingProductIndex = prev.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
      
      if (existingProductIndex !== -1) {
        // Update existing product
        const updatedProducts = [...prev];
        const existingProduct = updatedProducts[existingProductIndex];
        productId = existingProduct.id;
        updatedProducts[existingProductIndex] = {
          ...existingProduct,
          quantity: existingProduct.quantity + newQuantity,
          purchaseRate: newPurchaseRate,
          sellingRate: newSellingRate,
          unit: unit || existingProduct.unit,
          photo: photo || existingProduct.photo,
          category: category || existingProduct.category,
          dateAdded: dateToUse
        };
        
        purchaseRecord = {
          id: generateId(),
          productId: productId,
          productName: name,
          quantity: newQuantity,
          purchaseRate: newPurchaseRate,
          totalAmount: newQuantity * newPurchaseRate,
          date: dateToUse
        };

        return updatedProducts;
      } else {
        // Add new product
        productId = generateId();
        isNewProduct = true;
        const newProduct: Product = {
          id: productId,
          name: name,
          photo: photo || undefined,
          quantity: newQuantity,
          purchaseRate: newPurchaseRate,
          sellingRate: newSellingRate,
          unit: unit,
          category: category,
          dateAdded: dateToUse
        };

        purchaseRecord = {
          id: generateId(),
          productId: productId,
          productName: name,
          quantity: newQuantity,
          purchaseRate: newPurchaseRate,
          totalAmount: newQuantity * newPurchaseRate,
          date: dateToUse
        };

        return [...prev, newProduct];
      }
    });

    if (purchaseRecord) {
      setPurchaseRecords(prevRecs => [purchaseRecord!, ...prevRecs]);
    }

    setSuccessMessage(t.addProductSuccess);
    
    // Update Daily Stats
    const statsDate = dateToUse.split('T')[0];
    setDailyStats(prev => ({
      ...prev,
      [statsDate]: {
        sales: prev[statsDate]?.sales || 0,
        purchases: (prev[statsDate]?.purchases || 0) + purchaseTotal,
        expenses: prev[statsDate]?.expenses || 0
      }
    }));

    setTimeout(() => setSuccessMessage(null), 3000);
    e.currentTarget.reset();
    const preview = document.getElementById('product-photo-preview') as HTMLImageElement;
    if (preview) preview.classList.add('hidden');
  };

  const handleAddCashPurchase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const companyName = formData.get('companyName') as string;
    const note = formData.get('note') as string;
    const date = formData.get('date') as string;
    const photo = (document.getElementById('cash-purchase-photo-input') as HTMLInputElement)?.value;

    const newPurchase: CashPurchase = {
      id: generateId(),
      amount,
      companyName,
      note,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      photo: photo || undefined
    };

    setCashPurchases(prev => [newPurchase, ...prev]);
    e.currentTarget.reset();
    const preview = document.getElementById('cash-purchase-photo-preview') as HTMLImageElement;
    if (preview) preview.src = '';
    const input = document.getElementById('cash-purchase-photo-input') as HTMLInputElement;
    if (input) input.value = '';
    
    setSuccessMessage(language === 'bn' ? 'ক্যাশ কেনা এন্ট্রি সফল হয়েছে!' : 'Cash purchase added successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUpdateCashPurchase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCashPurchase) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const companyName = formData.get('companyName') as string;
    const note = formData.get('note') as string;
    const date = formData.get('date') as string;
    const photo = (document.getElementById('edit-cash-purchase-photo-input') as HTMLInputElement)?.value;

    const updatedPurchase: CashPurchase = {
      ...editingCashPurchase,
      amount,
      companyName,
      note,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      photo: photo || editingCashPurchase.photo
    };

    setCashPurchases(prev => prev.map(p => p.id === editingCashPurchase.id ? updatedPurchase : p));
    setEditingCashPurchase(null);
    setSuccessMessage(language === 'bn' ? 'আপডেট সফল হয়েছে!' : 'Update successful!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteCashPurchase = (id: string) => {
    setCashPurchases(prev => prev.filter(p => p.id !== id));
    setDeleteConfirmation(null);
  };

  const handleAddExpense = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('expenseAmount'));
    const note = formData.get('expenseNote') as string;
    const selectedDate = formData.get('expenseDate') as string;
    const today = selectedDate || new Date().toISOString().split('T')[0];

    const newExpense = {
      id: generateId(),
      amount,
      note,
      date: new Date(today).toISOString()
    };

    setExpenses(prev => [newExpense, ...prev]);
    
    // Update Daily Stats
    const statsDate = today;
    setDailyStats(prev => ({
      ...prev,
      [statsDate]: {
        sales: prev[statsDate]?.sales || 0,
        purchases: prev[statsDate]?.purchases || 0,
        expenses: (prev[statsDate]?.expenses || 0) + amount
      }
    }));

    setSuccessMessage(language === 'bn' ? 'খরচ সফলভাবে যোগ করা হয়েছে!' : 'Expense added successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
    e.currentTarget.reset();
  };

  const handleUpdateExpense = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('expenseAmount'));
    const note = formData.get('expenseNote') as string;
    const selectedDate = formData.get('expenseDate') as string;
    const today = selectedDate || new Date().toISOString().split('T')[0];

    const oldAmount = editingExpense.amount;
    const oldDate = editingExpense.date.split('T')[0];

    setExpenses(prev => prev.map(ex => 
      ex.id === editingExpense.id ? {
        ...ex,
        amount,
        note,
        date: new Date(today).toISOString()
      } : ex
    ));

    // Update Daily Stats
    setDailyStats(prev => {
      const updated = { ...prev };
      
      // Remove old amount
      if (updated[oldDate]) {
        updated[oldDate] = {
          ...updated[oldDate],
          expenses: Math.max(0, (updated[oldDate].expenses || 0) - oldAmount)
        };
      }

      // Add new amount
      const statsDate = today;
      updated[statsDate] = {
        ...updated[statsDate],
        sales: updated[statsDate]?.sales || 0,
        purchases: updated[statsDate]?.purchases || 0,
        expenses: (updated[statsDate]?.expenses || 0) + amount
      };

      return updated;
    });

    setEditingExpense(null);
    setSuccessMessage(language === 'bn' ? 'খরচ সফলভাবে আপডেট করা হয়েছে!' : 'Expense updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteExpense = (id: string) => {
    setDeleteConfirmation({ type: 'expense', id });
  };

  const confirmDeleteExpense = (id: string) => {
    const expenseToDelete = expenses.find(ex => ex.id === id);
    if (expenseToDelete) {
      const amount = expenseToDelete.amount;
      const date = expenseToDelete.date.split('T')[0];

      setExpenses(prev => prev.filter(ex => ex.id !== id));

      // Update Daily Stats
      setDailyStats(prev => {
        if (prev[date]) {
          return {
            ...prev,
            [date]: {
              ...prev[date],
              expenses: Math.max(0, (prev[date].expenses || 0) - amount)
            }
          };
        }
        return prev;
      });
    }
    setDeleteConfirmation(null);
  };

  const handleAddOwnerTransaction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isOwnerTransactionModalOpen) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const note = formData.get('note') as string;
    const date = formData.get('date') as string;
    const type = isOwnerTransactionModalOpen.type;

    // Capital Check for 'took'
    if (type === 'took') {
      const currentCash = calculateCashInHand();
      if (currentCash < amount) {
        alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই!' : 'Insufficient Cash!');
        return;
      }
    }

    const newTransaction: OwnerTransaction = {
      id: generateId(),
      amount,
      type: isOwnerTransactionModalOpen.type,
      note,
      date: date ? new Date(date).toISOString() : new Date().toISOString()
    };

    setOwnerTransactions(prev => [newTransaction, ...prev]);
    setIsOwnerTransactionModalOpen(null);
    setSuccessMessage(language === 'bn' ? 'লেনদেন সফলভাবে যোগ করা হয়েছে!' : 'Transaction added successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAdjustBalance = (currentCash: number) => {
    const newCash = Number(adjustmentValue);
    if (isNaN(newCash)) return;

    const diff = newCash - currentCash;
    if (diff === 0) {
      setIsAdjustBalanceModalOpen(false);
      return;
    }

    const newTransaction: OwnerTransaction = {
      id: generateId(),
      amount: Math.abs(diff),
      type: diff > 0 ? 'gave' : 'took',
      note: t.adjustmentNote,
      date: new Date().toISOString()
    };

    setOwnerTransactions(prev => [newTransaction, ...prev]);
    setIsAdjustBalanceModalOpen(false);
    setAdjustmentValue('');
    setSuccessMessage(language === 'bn' ? 'ব্যালেন্স সমন্বয় সফল হয়েছে!' : 'Balance adjusted successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteOwnerTransaction = (id: string) => {
    setOwnerTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateOwnerTransaction = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingOwnerTransaction) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const note = formData.get('note') as string;
    const date = formData.get('date') as string;

    setOwnerTransactions(prev => prev.map(t => 
      t.id === editingOwnerTransaction.id ? {
        ...t,
        amount,
        note,
        date: date ? new Date(date).toISOString() : t.date
      } : t
    ));

    setEditingOwnerTransaction(null);
    setSuccessMessage(language === 'bn' ? 'লেনদেন সফলভাবে আপডেট করা হয়েছে!' : 'Transaction updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeletePurchase = (record: PurchaseRecord) => {
    // 1. Remove from purchaseRecords
    setPurchaseRecords(prev => prev.filter(r => r.id !== record.id));

    // 2. Adjust Stock
    setProducts(prev => prev.map(p => 
      p.id === record.productId ? { ...p, quantity: Math.max(0, p.quantity - record.quantity) } : p
    ));

    // 3. Adjust Daily Stats
    const date = record.date.split('T')[0];
    setDailyStats(prev => {
      if (prev[date]) {
        return {
          ...prev,
          [date]: {
            ...prev[date],
            purchases: Math.max(0, (prev[date].purchases || 0) - record.totalAmount)
          }
        };
      }
      return prev;
    });

    setSuccessMessage(language === 'bn' ? 'ক্রয় রেকর্ড ডিলিট করা হয়েছে!' : 'Purchase record deleted!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUpdateSale = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSale) return;
    const formData = new FormData(e.currentTarget);
    const customerName = formData.get('customerName') as string;
    const date = formData.get('date') as string;

    setSaleRecords(prev => prev.map(s => {
      if (s.id === editingSale.id) {
        const updatedSale = { ...s, customerName, date: `${date}T${new Date(s.date).toISOString().split('T')[1]}` };
        if (selectedSaleForDetails?.id === s.id) {
          setSelectedSaleForDetails(updatedSale);
        }
        return updatedSale;
      }
      return s;
    }));
    setEditingSale(null);
    setSuccessMessage(language === 'bn' ? 'বিক্রয় তথ্য আপডেট করা হয়েছে!' : 'Sale updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleUpdatePurchase = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPurchase) return;
    const formData = new FormData(e.currentTarget);
    const newQuantity = Number(formData.get('quantity'));
    const newRate = Number(formData.get('rate'));
    const newTotal = newQuantity * newRate;
    const newDate = formData.get('date') as string;

    // Capital Check if amount increased
    if (newTotal > editingPurchase.totalAmount) {
      const currentCapital = calculateCashInHand();
      if (currentCapital < (newTotal - editingPurchase.totalAmount)) {
        alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই!' : 'Insufficient Cash!');
        return;
      }
    }

    // 1. Adjust Stock
    setProducts(prev => prev.map(p => 
      p.id === editingPurchase.productId ? { 
        ...p, 
        quantity: Math.max(0, p.quantity - editingPurchase.quantity + newQuantity),
        purchaseRate: newRate
      } : p
    ));

    // 2. Adjust Daily Stats
    const oldDate = editingPurchase.date.split('T')[0];
    const updatedDate = newDate || oldDate;
    
    setDailyStats(prev => {
      const updated = { ...prev };
      // Remove old
      if (updated[oldDate]) {
        updated[oldDate] = {
          ...updated[oldDate],
          purchases: Math.max(0, (updated[oldDate].purchases || 0) - editingPurchase.totalAmount)
        };
      }
      // Add new
      updated[updatedDate] = {
        ...updated[updatedDate],
        purchases: (updated[updatedDate]?.purchases || 0) + newTotal,
        sales: updated[updatedDate]?.sales || 0,
        expenses: updated[updatedDate]?.expenses || 0
      };
      return updated;
    });

    // 3. Update Record
    setPurchaseRecords(prev => prev.map(r => 
      r.id === editingPurchase.id ? {
        ...r,
        quantity: newQuantity,
        purchaseRate: newRate,
        totalAmount: newTotal,
        date: newDate ? new Date(newDate).toISOString() : r.date
      } : r
    ));

    setEditingPurchase(null);
    setSuccessMessage(language === 'bn' ? 'ক্রয় রেকর্ড আপডেট করা হয়েছে!' : 'Purchase record updated!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteSale = (record: SaleRecord) => {
    // 1. Remove from saleRecords
    const currentCash = calculateCashInHand();
    if (currentCash < record.totalAmount) {
      alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই! বিক্রয় রেকর্ড ডিলিট করা যাবে না।' : 'Insufficient Cash! Cannot delete sale record.');
      return;
    }
    setSaleRecords(prev => prev.filter(r => r.id !== record.id));

    // 2. Adjust Stock
    setProducts(prev => {
      const updated = [...prev];
      record.items.forEach(item => {
        const idx = updated.findIndex(p => p.id === item.productId);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + item.quantity };
        }
      });
      return updated;
    });

    // 3. Adjust Daily Stats
    const date = record.date.split('T')[0];
    setDailyStats(prev => {
      if (prev[date]) {
        return {
          ...prev,
          [date]: {
            ...prev[date],
            sales: Math.max(0, (prev[date].sales || 0) - record.totalAmount)
          }
        };
      }
      return prev;
    });

    setSuccessMessage(language === 'bn' ? 'বিক্রয় রেকর্ড ডিলিট করা হয়েছে!' : 'Sale record deleted!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteSaleItem = (saleId: string, itemIndex: number) => {
    setSaleRecords(prev => prev.map(sale => {
      if (sale.id === saleId) {
        const item = sale.items[itemIndex];
        const itemTotal = item.quantity * item.rate;
        
        // Cash Check
        const currentCash = calculateCashInHand();
        if (currentCash < itemTotal) {
          alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই! পণ্যটি ডিলিট করা যাবে না।' : 'Insufficient Cash! Cannot delete item.');
          return sale;
        }

        // 1. Adjust Stock
        setProducts(pList => pList.map(p => 
          p.id === item.productId ? { ...p, quantity: p.quantity + item.quantity } : p
        ));

        // 2. Remove item and update total
        const updatedItems = sale.items.filter((_, idx) => idx !== itemIndex);
        const updatedTotal = updatedItems.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
        
        // 3. Update Daily Stats
        const date = sale.date.split('T')[0];
        setDailyStats(stats => ({
          ...stats,
          [date]: {
            ...stats[date],
            sales: Math.max(0, (stats[date]?.sales || 0) - (item.quantity * item.rate))
          }
        }));

        const updatedSale = { ...sale, items: updatedItems, totalAmount: updatedTotal };
        if (selectedSaleForDetails?.id === saleId) {
          setSelectedSaleForDetails(updatedSale);
        }
        return updatedSale;
      }
      return sale;
    }));
    setSuccessMessage(language === 'bn' ? 'পণ্যটি ডিলিট করা হয়েছে!' : 'Item deleted!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleQuickUpdateSaleItem = (saleId: string, itemIndex: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setSaleRecords(prev => prev.map(sale => {
      if (sale.id === saleId) {
        const item = sale.items[itemIndex];
        const qtyDiff = newQuantity - item.quantity;
        const amountDiff = (newQuantity * item.rate) - (item.quantity * item.rate);

        // Cash Check for reduction in sale amount (which reduces cash)
        if (amountDiff < 0) {
          const currentCash = calculateCashInHand();
          if (currentCash < Math.abs(amountDiff)) {
            alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই! পরিমাণ কমানো যাবে না।' : 'Insufficient Cash! Cannot reduce quantity.');
            return sale;
          }
        }

        // 1. Adjust Stock
        setProducts(pList => pList.map(p => 
          p.id === item.productId ? { ...p, quantity: Math.max(0, p.quantity - qtyDiff) } : p
        ));

        // 2. Update item and total
        const updatedItems = [...sale.items];
        updatedItems[itemIndex] = { ...item, quantity: newQuantity };
        const updatedTotal = updatedItems.reduce((sum, i) => sum + (i.quantity * i.rate), 0);

        // 3. Update Daily Stats
        const date = sale.date.split('T')[0];
        setDailyStats(stats => ({
          ...stats,
          [date]: {
            ...stats[date],
            sales: (stats[date]?.sales || 0) + amountDiff
          }
        }));

        const updatedSale = { ...sale, items: updatedItems, totalAmount: updatedTotal };
        if (selectedSaleForDetails?.id === saleId) {
          setSelectedSaleForDetails(updatedSale);
        }
        return updatedSale;
      }
      return sale;
    }));
  };

  const handleUpdateSaleItem = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSaleItem) return;
    const { saleId, itemIndex } = editingSaleItem;
    const formData = new FormData(e.currentTarget);
    const newQuantity = Number(formData.get('quantity'));
    const newRate = Number(formData.get('rate'));
    const newProductName = formData.get('productName') as string;

    setSaleRecords(prev => prev.map(sale => {
      if (sale.id === saleId) {
        const item = sale.items[itemIndex];
        const qtyDiff = newQuantity - item.quantity;
        const amountDiff = (newQuantity * newRate) - (item.quantity * item.rate);

        // Cash Check for reduction in sale amount
        if (amountDiff < 0) {
          const currentCash = calculateCashInHand();
          if (currentCash < Math.abs(amountDiff)) {
            alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই! আপডেট করা যাবে না।' : 'Insufficient Cash! Cannot update.');
            return sale;
          }
        }

        // 1. Adjust Stock
        setProducts(pList => pList.map(p => 
          p.id === item.productId ? { ...p, quantity: Math.max(0, p.quantity - qtyDiff) } : p
        ));

        // 2. Update item and total
        const updatedItems = [...sale.items];
        updatedItems[itemIndex] = { ...item, quantity: newQuantity, rate: newRate, productName: newProductName };
        const updatedTotal = updatedItems.reduce((sum, i) => sum + (i.quantity * i.rate), 0);

        // 3. Update Daily Stats
        const date = sale.date.split('T')[0];
        setDailyStats(stats => ({
          ...stats,
          [date]: {
            ...stats[date],
            sales: (stats[date]?.sales || 0) + amountDiff
          }
        }));

        const updatedSale = { ...sale, items: updatedItems, totalAmount: updatedTotal };
        if (selectedSaleForDetails?.id === saleId) {
          setSelectedSaleForDetails(updatedSale);
        }
        return updatedSale;
      }
      return sale;
    }));

    setEditingSaleItem(null);
    setSuccessMessage(language === 'bn' ? 'পণ্যটি আপডেট করা হয়েছে!' : 'Item updated!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEditProduct = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;
    const formData = new FormData(e.currentTarget);
    const photo = formData.get('productPhoto_base64') as string;
    
    setProducts(prev => prev.map(p => 
      p.id === editingProduct.id ? {
        ...p,
        name: formData.get('productName') as string,
        photo: photo || p.photo,
        quantity: Number(formData.get('productPiece')),
        purchaseRate: Number(formData.get('purchaseRate')),
        sellingRate: Number(formData.get('sellingRate')),
        unit: formData.get('unit') as string,
        category: formData.get('category') as string,
      } : p
    ));
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    setDeleteConfirmation({ type: 'product', id: productId });
  };

  const confirmDeleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
    setSaleItems(prev => prev.filter(item => item.id !== productId));
    setDeleteConfirmation(null);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setDeleteConfirmation({ type: 'category', id: categoryId });
  };

  const confirmDeleteCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      const productsToDelete = products.filter(p => p.category === category.name).map(p => p.id);
      setProducts(prev => prev.filter(p => p.category !== category.name));
      setSaleItems(prev => prev.filter(item => !productsToDelete.includes(item.id)));
    }
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    setEditingCategory(null);
    setSelectedCategoryForDetails(null);
    setShopAction('stock');
    setDeleteConfirmation(null);
  };

  const handleAddCategory = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('categoryName') as string;
    const photo = formData.get('categoryPhoto_base64') as string;
    
    if (name) {
      if (typeof editingCategory === 'object' && editingCategory !== null) {
        // Update existing
        setCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id ? { ...cat, name, photo: photo || cat.photo } : cat
        ));
        // Also update products with this category name if it changed
        if (editingCategory.name !== name) {
          setProducts(prev => prev.map(p => 
            p.category === editingCategory.name ? { ...p, category: name } : p
          ));
        }
      } else {
        // Add new
        const newCategory: Category = {
          id: generateId(),
          name,
          photo: photo || undefined
        };
        setCategories(prev => [...prev, newCategory]);
      }
      setEditingCategory(null);
    }
  };

  const handleDeleteTransaction = (customerId: string, transactionId: string) => {
    const updatedCustomers = customers.map(c => {
      if (c.id === customerId) {
        const transaction = c.transactions.find(t => t.id === transactionId);
        if (!transaction) return c;
        
        const newBalance = transaction.type === 'cash-out'
          ? c.totalBalance - transaction.amount
          : c.totalBalance + transaction.amount;
          
        return {
          ...c,
          transactions: c.transactions.filter(t => t.id !== transactionId),
          totalBalance: newBalance
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);
  };

  // --- Derived State ---
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           c.phone.includes(searchQuery);
      
      if (!matchesSearch) return false;
      
      if (filterType === 'due') return c.totalBalance > 0;
      if (filterType === 'advance') return c.totalBalance < 0;
      if (filterType === 'balanced') return c.totalBalance === 0;
      
      return true;
    });
  }, [customers, searchQuery, filterType]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const totalReceivable = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.totalBalance > 0 ? c.totalBalance : 0), 0);
  }, [customers]);

  const totalPayable = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.totalBalance < 0 ? Math.abs(c.totalBalance) : 0), 0);
  }, [customers]);

  const generateCustomerPDF = (customer: Customer) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(shopProfile.shopName, 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${shopProfile.shopAddress || ''}`, 105, 22, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Customer Ledger: ${customer.name}`, 14, 35);
    doc.setFontSize(10);
    doc.text(`Phone: ${customer.phone}`, 14, 42);
    doc.text(`Address: ${customer.address || '-'}`, 14, 47);
    const balanceText = customer.totalBalance > 0 ? `-${customer.totalBalance}` : customer.totalBalance < 0 ? `+${Math.abs(customer.totalBalance)}` : '0';
    doc.text(`Current Balance: ${balanceText}`, 14, 52);

    const tableData = customer.transactions.map((t, index) => [
      index + 1,
      new Date(t.date).toLocaleDateString(),
      t.note || (t.type === 'cash-out' ? 'Purchased' : 'Received'),
      t.type === 'cash-out' ? `${t.amount}` : '-',
      t.type === 'cash-in' ? `${t.amount}` : '-',
      t.type === 'cash-out' ? `-${t.amount}` : `+${t.amount}`,
    ]);

    autoTable(doc, {
      startY: 60,
      head: [[
        'SL No',
        'Date',
        'Description',
        'Cash Out',
        'Cash In',
        'Total'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [106, 27, 154] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'left' },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
        5: { halign: 'right', cellWidth: 25 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Balance: ${balanceText}`, 14, finalY + 10);

    return doc;
  };

  const generateAllCustomersPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(shopProfile.shopName, 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text('All Customers Summary', 14, 30);
    doc.setFontSize(10);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 35);

    const tableData = customers.map(c => [
      c.name,
      c.address || '-',
      c.phone,
      c.totalBalance < 0 ? Math.abs(c.totalBalance) : '-',
      c.totalBalance > 0 ? c.totalBalance : '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [[
        'Customer Name', 
        'Address', 
        'Phone', 
        'Total Savings',
        'Total Due'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [106, 27, 154] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Due: -${totalReceivable}`, 14, finalY + 10);
    doc.text(`Total Savings: +${totalPayable}`, 14, finalY + 18);

    return doc;
  };

  const handleShareAllCustomersReport = async () => {
    const doc = generateAllCustomersPDF();
    const pdfBlob = doc.output('blob');
    const fileName = `all_customers_report.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'All Customers Report',
          files: [file]
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      doc.save(fileName);
    }
  };

  const generateOwnerTransactionsPDF = (type: 'gave' | 'took' | 'capital' | 'profit') => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(shopProfile.shopName, 105, 15, { align: 'center' });
    doc.setFontSize(14);
    let title = '';
    if (type === 'gave') title = 'Owner Gave History';
    else if (type === 'took') title = 'Owner Took History';
    else if (type === 'profit') title = 'Profit History';
    else title = 'Capital History';
    
    doc.text(title, 14, 30);

    let filteredData: any[] = [];
    if (type === 'profit') {
      filteredData = getProfitTransactions();
    } else if (type === 'capital') {
      filteredData = [...ownerTransactions, ...getProfitTransactions()];
    } else {
      filteredData = ownerTransactions.filter(t => t.type === type);
    }

    filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    const tableData = filteredData.map((t, index) => [
      index + 1,
      new Date(t.date).toLocaleDateString(),
      t.note || (t.type === 'gave' ? 'Owner Gave' : (t.type === 'took' ? 'Owner Took' : 'Profit')),
      `${(t.type === 'gave' || t.type === 'profit') ? '+' : '-'}৳${t.amount.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [[
        'SL',
        'Date',
        'Description',
        'Amount'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [106, 27, 154] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'left' },
        3: { halign: 'right', cellWidth: 30 }
      }
    });

    return doc;
  };

  const handleShareLedger = async (customer: Customer) => {
    const doc = generateCustomerPDF(customer);
    const pdfBlob = doc.output('blob');
    const fileName = `${customer.name}_ledger.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const balanceText = customer.totalBalance > 0 ? `-${customer.totalBalance}` : customer.totalBalance < 0 ? `+${Math.abs(customer.totalBalance)}` : '0';
    const text = `Ledger for ${customer.name} at ${shopProfile.shopName}\nTotal Balance: ৳${balanceText}\nLast 5 transactions:\n${customer.transactions.slice(0, 5).map(t => `- ${new Date(t.date).toLocaleDateString()}: ${t.type === 'cash-in' ? '+' : '-'}৳${t.amount} (${t.note})`).join('\n')}`;
    
    if (navigator.share) {
      try {
        const shareData: any = {
          title: 'Customer Ledger',
          text: text,
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }

        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      alert('Sharing not supported on this browser. Copying to clipboard instead.');
      navigator.clipboard.writeText(text);
    }
  };

  // --- UI Components ---
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-between p-8 overflow-hidden relative">
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" 
        />

        <div className="w-full max-w-md flex flex-col items-center mt-6 relative z-10">
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-20 h-20 purple-gradient rounded-[1.5rem] shadow-xl flex items-center justify-center mb-6 relative"
          >
            <div className="absolute inset-0 bg-white/20 rounded-[1.5rem] animate-pulse" />
            <Smartphone className="w-8 h-8 text-white relative z-10" />
          </motion.div>
          
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl font-black text-gray-800 mb-0.5 tracking-tight">Shop Manager</h1>
            <p className="text-primary font-bold tracking-[0.3em] uppercase text-[9px]">
              {authMode === 'login' ? t.login : t.signup}
            </p>
          </motion.div>

          <motion.form 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleLogin} 
            className="w-full space-y-4"
          >
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.phoneNumber}</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xs">+88</span>
                <input 
                  required
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none font-bold transition-all text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.pin}</label>
              <input 
                required
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="XXXX"
                className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none font-bold text-center tracking-[1rem] text-lg"
              />
            </div>

            {authError && (
              <motion.p 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-500 text-[10px] font-bold text-center bg-red-50 py-1.5 rounded-lg"
              >
                {authError}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full purple-gradient text-white py-3.5 rounded-xl font-black shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
            >
              {authMode === 'login' ? t.login : t.signup}
            </button>

            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError('');
                }}
                className="text-gray-400 text-[11px] font-bold hover:text-primary transition-colors"
              >
                {authMode === 'login' ? (language === 'bn' ? "অ্যাকাউন্ট নেই? সাইন আপ করুন" : "Don't have an account? Sign Up") : (language === 'bn' ? "অ্যাকাউন্ট আছে? লগইন করুন" : "Already have an account? Login")}
              </button>
            </div>
          </motion.form>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pb-4 relative z-10"
        >
          <p className="text-gray-300 text-[8px] font-bold uppercase tracking-[0.4em] mb-1">Power By</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-800 font-black text-lg tracking-tighter">Sarker™</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black italic tracking-tight">CashMoney</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!shopProfile.isSetup) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center p-8 overflow-y-auto relative">
        {/* Animated Background Elements */}
        <div className="absolute top-[-5%] right-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] left-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10 py-8">
          {/* Back Button */}
          <button 
            onClick={() => {
              localStorage.removeItem('tally_logged_phone');
              setIsLoggedIn(false);
              setPhoneNumber('');
            }}
            className="mb-8 p-3 bg-gray-50 rounded-2xl text-gray-500 hover:bg-gray-100 transition-colors inline-flex items-center gap-2 font-bold text-sm"
          >
            <ChevronLeft className="w-5 h-5" />
            {t.back}
          </button>

          <div className="flex flex-col items-center mb-10">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 purple-gradient rounded-3xl flex items-center justify-center mb-4 shadow-xl border-4 border-white"
            >
              <Store className="text-white w-10 h-10" />
            </motion.div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Shop Manager</h1>
            <p className="text-gray-400 font-bold text-sm mt-1">{t.setupShop}</p>
          </div>

          <form onSubmit={handleSetupProfile} className="space-y-6" autoComplete="off">
            <div className="flex flex-col items-center mb-2">
              <div 
                onClick={() => shopPhotoRef.current?.click()}
                className="w-28 h-28 bg-gray-50 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 overflow-hidden hover:border-primary/50 transition-colors group relative"
              >
                {shopProfile.shopPhoto ? (
                  <>
                    <img src={shopProfile.shopPhoto || undefined} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="text-white w-6 h-6" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-primary/10 p-3 rounded-2xl mb-2 group-hover:scale-110 transition-transform">
                      <Camera className="text-primary w-6 h-6" />
                    </div>
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Add Logo</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                ref={shopPhotoRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleImageUpload(e, (base64) => setShopProfile(prev => ({ ...prev, shopPhoto: base64 })))}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.shopName}</label>
                <input 
                  required
                  name="shopName"
                  autoComplete="off"
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none font-bold transition-all"
                  placeholder="e.g. Rahim Store"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.ownerName}</label>
                <input 
                  required
                  name="ownerName"
                  autoComplete="off"
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none font-bold transition-all"
                  placeholder="e.g. Md. Rahim"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.shopAddress}</label>
                <input 
                  name="shopAddress"
                  autoComplete="off"
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none font-bold transition-all"
                  placeholder="e.g. Dhaka, Bangladesh"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.shopType}</label>
                <select 
                  name="shopType"
                  className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none font-bold transition-all appearance-none"
                >
                  <option value="Grocery">Grocery</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full purple-gradient text-white py-4 rounded-2xl font-black shadow-xl shadow-primary/25 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg mt-4"
            >
              {t.startManaging}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLocked && isLoggedIn) {
    return (
      <div className="fixed inset-0 bg-white z-[1000] flex flex-col items-center justify-between p-6 overflow-hidden">
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" 
        />
        
        <div className="w-full max-w-md flex flex-col items-center mt-4 relative z-10">
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-16 h-16 purple-gradient rounded-2xl shadow-xl flex items-center justify-center mb-4 relative"
          >
            <div className="absolute inset-0 bg-white/20 rounded-2xl animate-pulse" />
            <Lock className="w-8 h-8 text-white relative z-10" />
          </motion.div>
          
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-4"
          >
            <h1 className="text-2xl font-black text-gray-800 mb-0.5 tracking-tight">{shopProfile.shopName || t.tallyKhata}</h1>
            <p className="text-primary font-bold tracking-[0.3em] uppercase text-[9px]">{t.tallyKhata}</p>
          </motion.div>
          
          <div className="w-full space-y-4">
            <div className="text-center space-y-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.enterPinToUnlock}</h2>
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 4].map((_, i) => (
                  <motion.div 
                    key={i} 
                    animate={lockPinInput.length > i ? { scale: [1, 1.2, 1] } : {}}
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${lockPinInput.length > i ? 'bg-primary border-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-transparent border-gray-200'}`} 
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((num) => (
                <motion.button
                  key={num}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (num === 'C') setLockPinInput('');
                    else if (num === 'OK') handleUnlock();
                    else if (lockPinInput.length < 4) setLockPinInput(prev => prev + num);
                  }}
                  className={`h-14 w-14 mx-auto rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                    num === 'OK' ? 'purple-gradient text-white shadow-lg shadow-primary/30' : 
                    num === 'C' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {num}
                </motion.button>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleDeviceAuth}
              className="w-full max-w-[280px] mx-auto bg-gray-50 text-gray-600 py-3.5 rounded-xl font-bold border-2 border-transparent hover:border-primary/10 transition-all flex items-center justify-center gap-2 mt-4 text-sm"
            >
              <Fingerprint className="w-5 h-5 text-primary" />
              {language === 'bn' ? 'ফোনের লক দিয়ে আনলক' : 'Unlock with Phone Lock'}
            </motion.button>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pb-2 relative z-10"
        >
          <p className="text-gray-300 text-[8px] font-bold uppercase tracking-[0.4em] mb-1">Power By</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-800 font-black text-lg tracking-tighter">Sarker™</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black italic tracking-tight">CashMoney</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto border-x border-gray-100 shadow-sm relative pb-20">
      {/* Header */}
      <header className={`purple-gradient text-white p-6 rounded-b-[2.5rem] shadow-lg sticky top-0 z-10 transition-all duration-300 ${selectedCustomerId ? 'pb-8' : 'pb-6'}`}>
        <div className="flex justify-between items-center mb-6 relative">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg overflow-hidden w-10 h-10 flex items-center justify-center">
              {shopProfile.shopPhoto ? (
                <img src={shopProfile.shopPhoto || undefined} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{shopProfile.shopName}</h2>
              <p className="text-white/70 text-[10px] flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> {shopProfile.shopAddress || (language === 'bn' ? 'ঠিকানা নেই' : 'No Address')} • {shopProfile.shopType || (language === 'bn' ? 'সাধারণ' : 'General')}
              </p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Customer Balance in Header (Styled like Home Stats) */}
        {selectedCustomerId && selectedCustomer && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-gray-500 text-[10px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">
                {selectedCustomer.totalBalance > 0 ? t.due : selectedCustomer.totalBalance < 0 ? t.savings : t.paid}
              </p>
              <p className={`text-2xl font-black ${selectedCustomer.totalBalance > 0 ? 'text-red-500' : selectedCustomer.totalBalance < 0 ? 'text-green-600' : 'text-gray-800'}`}>
                ৳{Math.abs(selectedCustomer.totalBalance).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}

        {/* Conditionally show stats only on Home Page and when not in Shop View */}
        {!selectedCustomerId && !isShopView && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-3 overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-gray-500 text-[10px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">{t.totalDue}</p>
              <p className="text-xl font-black text-red-500">৳{totalReceivable.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-gray-500 text-[10px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">{t.totalSavings}</p>
              <p className="text-xl font-black text-green-600">৳{totalPayable.toLocaleString()}</p>
            </div>
          </motion.div>
        )}

        {/* Show Stock Stats in Header when in Stock View */}
        {!selectedCustomerId && isShopView && shopAction === 'stock' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-3 overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-gray-500 text-[10px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">
                {language === 'bn' ? 'মোট স্টক ভ্যালু' : 'Total Stock Value'}
              </p>
              <p className="text-xl font-black text-blue-600">
                ৳{products.reduce((sum, p) => sum + (p.quantity * p.purchaseRate), 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-gray-500 text-[10px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">
                {language === 'bn' ? 'মোট সম্ভাব্য লাভ' : 'Total Potential Profit'}
              </p>
              <p className="text-xl font-black text-green-600">
                ৳{products.reduce((sum, p) => sum + (p.quantity * (p.sellingRate - p.purchaseRate)), 0).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}

        {/* Show Cash Purchase Stats in Header when in Cash Purchase View */}
        {!selectedCustomerId && isShopView && shopAction === 'cash_purchase' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex justify-center mb-4"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center min-w-[200px]">
              <p className="text-gray-500 text-[10px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">{t.totalCashPurchase}</p>
              <p className="text-2xl font-black text-indigo-600">৳{cashPurchases.reduce((acc, r) => acc + r.amount, 0).toLocaleString()}</p>
            </div>
          </motion.div>
        )}

        {/* Show Total Cash, Purchase, Sale, and Expense in Header when in Cash Box */}
        {!selectedCustomerId && isShopView && shopAction === 'cashbox' && cashboxHistoryType === 'none' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm w-full text-center">
              <p className="text-gray-500 text-[10px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">
                {t.cashInHand}
              </p>
              <p className={`text-2xl font-black ${calculateCashInHand() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ৳{calculateCashInHand().toLocaleString()}
              </p>
              <button 
                onClick={() => {
                  setAdjustmentValue(calculateCashInHand().toString());
                  setIsAdjustBalanceModalOpen(true);
                }}
                className="text-[8px] font-bold text-primary mt-1 uppercase tracking-widest flex items-center justify-center gap-1 mx-auto"
              >
                <Edit2 className="w-2 h-2" /> {language === 'bn' ? 'সমন্বয় করুন' : 'Adjust'}
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center border border-gray-50">
                <p className="text-gray-400 text-[8px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">
                  {t.totalCashPurchase}
                </p>
                <p className="text-sm font-black text-blue-600">
                  ৳{cashPurchases.reduce((acc, r) => acc + r.amount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center border border-gray-100">
                <p className="text-gray-400 text-[8px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">
                  {t.totalSale}
                </p>
                <p className="text-sm font-black text-green-600">
                  ৳{saleRecords.reduce((acc, r) => acc + r.totalAmount, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-3 shadow-sm text-center border border-gray-100">
                <p className="text-gray-400 text-[8px] mb-1 font-bold whitespace-nowrap uppercase tracking-tight">
                  {t.totalExpense}
                </p>
                <p className="text-xl font-black text-red-500" style={{ fontSize: '0.875rem', lineHeight: '1.25rem' }}>
                  ৳{expenses.reduce((acc, r) => acc + r.amount, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Daily Stats for Shop View removed as per user request */}
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 relative">
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-4 right-4 z-[100] bg-green-500 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold"
            >
              <div className="bg-white/20 p-1.5 rounded-full">
                <Check className="w-5 h-5" />
              </div>
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedCustomerId ? (
          isShopView ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {shopAction === 'menu' ? (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl purple-gradient flex items-center justify-center text-white shadow-lg">
                      <Store className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-gray-800 tracking-tight">{t.shop}</h2>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <button 
                      onClick={() => {
                        navigateToShopAction('entry');
                        setIsViewingAllPurchases(false);
                      }}
                      className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-primary/30 transition-all group text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <PackagePlus className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-[10px] leading-tight">{t.productEntry}</h3>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => {
                        navigateToShopAction('sale');
                        setIsViewingAllSales(false);
                      }}
                      className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-primary/30 transition-all group text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-[10px] leading-tight">{t.productSale}</h3>
                      </div>
                    </button>

                    <button 
                      onClick={() => navigateToShopAction('stock')}
                      className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-primary/30 transition-all group text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-[10px] leading-tight">{t.stockProduct}</h3>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        navigateToShopAction('expense');
                        setIsViewingExpenseHistory(false);
                      }}
                      className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-primary/30 transition-all group text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <TrendingDown className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-[10px] leading-tight">{t.expenseEntry}</h3>
                      </div>
                    </button>

                    <button 
                      onClick={() => {
                        navigateToShopAction('cash_purchase');
                        setIsViewingCashPurchaseHistory(false);
                      }}
                      className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-primary/30 transition-all group text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-[10px] leading-tight">{t.cashPurchaseEntry}</h3>
                      </div>
                    </button>

                    <button 
                      onClick={() => navigateToShopAction('cashbox')}
                      className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:border-primary/30 transition-all group text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-[10px] leading-tight">{t.cashBox}</h3>
                      </div>
                    </button>
                  </div>

                  {/* Low Stock Alert Section */}
                  {products.filter(p => p.quantity <= 5).length > 0 && (
                    <div className="mt-8 bg-white rounded-[2.5rem] p-6 shadow-sm border border-red-100">
                      <div className="flex items-center gap-2 mb-4 text-red-500">
                        <Package className="w-5 h-5" />
                        <h3 className="font-black text-sm uppercase tracking-wider">{t.lowStockAlert}</h3>
                      </div>
                      <div className="space-y-3">
                        {products.filter(p => p.quantity <= 5).map(product => (
                          <div key={`low-stock-${product.id}`} className="flex justify-between items-center p-3 bg-red-50 rounded-2xl border border-red-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-red-100">
                                {product.photo ? (
                                  <img src={product.photo || undefined} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="w-5 h-5 text-red-300" />
                                )}
                              </div>
                              <span className="font-bold text-gray-800">{product.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-red-600">{product.quantity} Pcs</span>
                              <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">{t.stock}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : shopAction === 'sale' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => isViewingAllSales ? navigateToAllSales(false) : navigateToShopAction('menu')} className="p-2 bg-gray-100 rounded-full">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">
                        {isViewingAllSales ? (language === 'bn' ? 'সকল বিক্রয় হিস্টরি' : 'All Sale History') : t.productSale}
                      </h2>
                    </div>
                    {!isViewingAllSales && (
                      <button 
                        onClick={() => navigateToAllSales(true)}
                        className="p-2 bg-white text-green-600 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-all"
                      >
                        <History className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {isViewingAllSales ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input 
                            type="text"
                            placeholder={language === 'bn' ? 'কাস্টমার বা পণ্য খুঁজুন' : 'Search Customer or Product'}
                            value={saleSearchQueryHeader}
                            onChange={(e) => setSaleSearchQueryHeader(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
                          />
                        </div>
                        <input 
                          type="date"
                          value={saleDateFilterHeader}
                          onChange={(e) => setSaleDateFilterHeader(e.target.value)}
                          className="px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-primary outline-none text-sm font-bold"
                        />
                        <button 
                          onClick={() => setSaleSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                          className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-600 active:scale-95 transition-all"
                          title={saleSortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {filteredSales.map(record => (
                          <div 
                            key={record.id} 
                            onClick={() => setSelectedSaleForDetails(record)}
                            className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{record.customerName || (language === 'bn' ? 'সাধারণ কাস্টমার' : 'Regular Customer')}</p>
                                <p className="text-[10px] text-gray-400">
                                  {record.items.length} {language === 'bn' ? 'টি পণ্য' : 'Items'} • {new Date(record.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-green-600">৳{record.totalAmount.toLocaleString()}</p>
                              <div className="flex gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSale(record);
                                  }} 
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSale(record);
                                  }} 
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleAddSaleItem} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
                    <div className="space-y-1 relative">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productName}</label>
                      <input 
                        required
                        name="productName"
                        value={saleSearchQuery}
                        onChange={(e) => {
                          setSaleSearchQuery(e.target.value);
                          setShowSaleSuggestions(true);
                          const prod = products.find(p => p.name === e.target.value);
                          if (prod) setSelectedProductForSale(prod);
                          else setSelectedProductForSale(null);
                        }}
                        onFocus={() => setShowSaleSuggestions(true)}
                        placeholder={t.productName}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                      />
                      {showSaleSuggestions && saleSearchQuery && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-60 overflow-y-auto overflow-x-hidden">
                          {products.filter(p => p.name.toLowerCase().includes(saleSearchQuery.toLowerCase())).length > 0 ? (
                            products.filter(p => p.name.toLowerCase().includes(saleSearchQuery.toLowerCase())).map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSaleSearchQuery(p.name);
                                  setSelectedProductForSale(p);
                                  setShowSaleSuggestions(false);
                                }}
                                className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-none"
                              >
                                <span className="font-bold text-gray-700">{p.name}</span>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg uppercase">
                                    {p.quantity} Pcs
                                  </span>
                                  <span className="text-[9px] font-bold text-gray-400 uppercase">
                                    {t.purchaseRate}: ৳{p.purchaseRate}
                                  </span>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-6 py-4 text-gray-400 text-sm italic">{t.outOfStock}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productUnit}</label>
                        <input 
                          required
                          type="number"
                          name="productPiece"
                          placeholder="0"
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                        />
                        {selectedProductForSale && (
                          <p className="text-[10px] font-bold text-primary ml-1 mt-1">
                            {t.stockInfo}: {selectedProductForSale.quantity} {selectedProductForSale.unit || 'Pcs'} • {t.purchaseRate}: ৳{selectedProductForSale.purchaseRate}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.rate}</label>
                        <input 
                          required
                          type="number"
                          name="rate"
                          defaultValue={selectedProductForSale?.sellingRate || ''}
                          key={selectedProductForSale?.id || 'empty'}
                          placeholder="0.00"
                          className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                    </div>
                    <button 
                      type="submit"
                      className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" /> {t.add}
                    </button>
                  </form>

                  {saleItems.length > 0 && (
                    <div className="space-y-4 pb-10">
                      <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Items List ({saleItems.length})</h3>
                        <button onClick={() => setSaleItems([])} className="text-red-500 text-xs font-bold">{t.clearList}</button>
                      </div>
                      <div className="space-y-3">
                        {saleItems.map((item, index) => (
                          <div key={`sale-item-${item.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{item.quantity} pcs x ৳{item.rate}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <p className="font-bold text-primary">৳{item.total.toLocaleString()}</p>
                              </div>
                              <button 
                                onClick={() => setSaleItems(prev => prev.filter(i => i.id !== item.id))}
                                className="text-red-400 p-1 bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="bg-primary/5 p-6 rounded-[2.5rem] border border-primary/10 space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-gray-500 uppercase text-xs tracking-widest">{t.total}</p>
                          <p className="text-2xl font-black text-primary">৳{saleItems.reduce((sum, i) => sum + i.total, 0).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-3">
                          {!isSaleConfirmed ? (
                            <button 
                              onClick={() => setIsSaleCustomerModalOpen(true)}
                              className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                            >
                              <ShoppingCart className="w-5 h-5" /> {t.sale}
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={async () => {
                                  const doc = await generateMemoPDF(saleCustomerName, saleCustomerPhone);
                                  if (doc) doc.save(`Memo_${Date.now()}.pdf`);
                                }}
                                className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                              >
                                <Download className="w-5 h-5" /> {t.downloadMemo}
                              </button>
                              <button 
                                onClick={async () => {
                                  const doc = await generateMemoPDF(saleCustomerName, saleCustomerPhone);
                                  if (doc) {
                                    const pdfBlob = doc.output('blob');
                                    const file = new File([pdfBlob], `Memo_${Date.now()}.pdf`, { type: 'application/pdf' });
                                    if (navigator.share && navigator.canShare({ files: [file] })) {
                                      await navigator.share({
                                        title: 'Cash Memo',
                                        files: [file]
                                      });
                                    } else {
                                      alert('Sharing not supported');
                                    }
                                  }
                                }}
                                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                              >
                                <Share2 className="w-5 h-5" /> {language === 'bn' ? 'শেয়ার' : 'Share'}
                              </button>
                            </>
                          )}
                        </div>
                        {isSaleConfirmed && (
                          <button 
                            onClick={() => {
                              setSaleItems([]);
                              setIsSaleConfirmed(false);
                              setSaleCustomerName('');
                              setSaleCustomerPhone('');
                            }}
                            className="w-full bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold border border-gray-200 flex items-center justify-center gap-2 mt-2"
                          >
                            <Plus className="w-4 h-4" /> {t.newSale}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : shopAction === 'entry' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => navigateToShopAction('menu')} className="p-2 bg-gray-100 rounded-full">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">
                        {t.productEntry}
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
                        <div className="flex flex-col items-center gap-4 mb-4">
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                              <input 
                                type="file" 
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64 = reader.result as string;
                                      const preview = document.getElementById('product-photo-preview') as HTMLImageElement;
                                      const input = document.getElementById('product-photo-input') as HTMLInputElement;
                                      if (preview) {
                                        preview.src = base64;
                                        preview.classList.remove('hidden');
                                      }
                                      if (input) input.value = base64;
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <img id="product-photo-preview" src={undefined} className="w-full h-full object-cover hidden" />
                              <Camera className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" />
                              <input type="hidden" name="productPhoto_base64" id="product-photo-input" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 mt-2 text-center uppercase tracking-widest">{t.productPhoto}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.purchaseDate}</label>
                            <input 
                              required
                              type="date"
                              name="purchaseDate"
                              defaultValue={new Date().toISOString().split('T')[0]}
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.category}</label>
                            <select 
                              required
                              name="category"
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none appearance-none font-bold"
                            >
                              <option value="">{t.selectCategory}</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productName}</label>
                            <input 
                              required
                              name="productName"
                              placeholder={t.productName}
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productUnit}</label>
                            <input 
                              required
                              name="unit"
                              defaultValue="Piece"
                              placeholder={t.productUnit}
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.quantity}</label>
                            <input 
                              required
                              type="number"
                              name="productPiece"
                              placeholder="0"
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.purchaseRate}</label>
                            <input 
                              required
                              type="number"
                              name="purchaseRate"
                              placeholder="0.00"
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.sellingRate}</label>
                          <input 
                            required
                            type="number"
                            name="sellingRate"
                            placeholder="0.00"
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4"
                        >
                          <PackagePlus className="w-5 h-5" /> {t.addStock}
                        </button>
                      </form>

                      <div className="space-y-6">
                      </div>
                    </div>
                </div>
              ) : shopAction === 'stock' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShopAction('menu')} className="p-2 bg-gray-100 rounded-full">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">{t.stockProduct}</h2>
                    </div>
                    <button 
                      onClick={() => setEditingCategory(true)}
                      className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> {t.addCategory}
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      placeholder={t.searchProduct}
                      className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  {/* Horizontal Category List */}
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
                    <button
                      onClick={() => setSelectedStockCategory('all')}
                      className={`flex flex-col items-center gap-2 min-w-[70px] p-3 rounded-2xl transition-all ${
                        selectedStockCategory === 'all' 
                          ? 'purple-gradient text-white shadow-lg scale-105' 
                          : 'bg-white text-gray-500 border border-gray-100'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedStockCategory === 'all' ? 'bg-white/20' : 'bg-gray-50'}`}>
                        <Filter className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{t.all}</span>
                    </button>
                    {categories.map(cat => (
                      <div key={`filter-${cat.id}`} className="relative group/cat">
                        <button
                          onClick={() => {
                            setSelectedCategoryForDetails(cat);
                            setShopAction('category_details');
                          }}
                          className={`flex flex-col items-center gap-2 min-w-[70px] p-3 rounded-2xl transition-all ${
                            selectedStockCategory === cat.name 
                              ? 'purple-gradient text-white shadow-lg scale-105' 
                              : 'bg-white text-gray-500 border border-gray-100'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden ${selectedStockCategory === cat.name ? 'bg-white/20' : 'bg-gray-50'}`}>
                            {cat.photo ? (
                              <img src={cat.photo || undefined} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center px-1">{cat.name}</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id);
                          }}
                          className="absolute -top-1 -right-1 bg-white shadow-md p-1.5 rounded-full text-red-500 z-10 border border-gray-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {products.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                      <Package className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 font-medium">{t.noProducts}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Products by Category */}
                      {(selectedStockCategory === 'all' ? categories : categories.filter(c => c.name === selectedStockCategory)).map(cat => {
                        const catProducts = products.filter(p => 
                          p.category === cat.name && 
                          p.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
                        );
                        if (catProducts.length === 0) return null;
                        return (
                          <div key={`section-stock-${cat.id}`} className="space-y-3">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" /> {cat.name}
                            </h3>
                            <div className="space-y-3">
                              {catProducts.map(product => (
                                <div key={`prod-stock-${product.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                                      {product.photo ? (
                                        <img src={product.photo || undefined} className="w-full h-full object-cover" />
                                      ) : (
                                        <Package className="w-6 h-6 text-gray-200" />
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-800">{product.name}</h4>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                        {product.quantity} Pcs • ৳{product.sellingRate} / Pc
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right mr-2">
                                      <p className="text-sm font-black text-primary">৳{(product.quantity * product.sellingRate).toLocaleString()}</p>
                                      <p className="text-[8px] font-bold text-gray-400 uppercase">{t.total}</p>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button 
                                        onClick={() => setSelectedProductForHistory(product)}
                                        className="p-1.5 text-primary hover:bg-primary/5 rounded-lg transition-colors"
                                        title={language === 'bn' ? 'ক্রয় হিস্টরি' : 'Purchase History'}
                                      >
                                        <History className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => setEditingProduct(product)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : shopAction === 'category_details' && selectedCategoryForDetails ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShopAction('stock')} className="p-2 bg-gray-100 rounded-full">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">{selectedCategoryForDetails.name}</h2>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEditingCategory(selectedCategoryForDetails)}
                        className="p-2 bg-blue-50 text-blue-500 rounded-xl"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(selectedCategoryForDetails.id)}
                        className="p-2 bg-red-50 text-red-500 rounded-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                      type="text"
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      placeholder={t.searchProduct}
                      className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-3">
                    {products.filter(p => 
                      p.category === selectedCategoryForDetails.name && 
                      p.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                        <Package className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 font-medium">{t.noProducts}</p>
                      </div>
                    ) : (
                      products.filter(p => 
                        p.category === selectedCategoryForDetails.name && 
                        p.name.toLowerCase().includes(stockSearchQuery.toLowerCase())
                      ).map(product => (
                        <div key={`cat-detail-${product.id}`} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                              {product.photo ? (
                                <img src={product.photo || undefined} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-6 h-6 text-gray-200" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800">{product.name}</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                {product.quantity} Pcs • ৳{product.sellingRate} / Pc
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingProduct(product)}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : shopAction === 'cash_purchase' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (isViewingCashPurchaseHistory) {
                            navigateToCashPurchaseHistory(false);
                          } else {
                            navigateToShopAction('menu');
                          }
                        }} 
                        className="p-2 bg-gray-100 rounded-full"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">
                        {isViewingCashPurchaseHistory ? (language === 'bn' ? 'ক্যাশ কেনা হিস্টরি' : 'Cash Purchase History') : t.cashPurchaseEntry}
                      </h2>
                    </div>
                    {!isViewingCashPurchaseHistory && (
                      <button 
                        onClick={() => navigateToCashPurchaseHistory(true)}
                        className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-all"
                      >
                        <History className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {isViewingCashPurchaseHistory ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">{language === 'bn' ? 'তারিখ দিয়ে খুঁজুন' : 'Search by Date'}</label>
                        <input 
                          type="date"
                          value={cashPurchaseDateFilter}
                          onChange={(e) => setCashPurchaseDateFilter(e.target.value)}
                          className="w-full px-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-primary outline-none font-bold"
                        />
                      </div>

                      <div className="space-y-3">
                        {cashPurchases
                          .filter(cp => 
                            (!cashPurchaseDateFilter || cp.date.split('T')[0] === cashPurchaseDateFilter)
                          )
                          .map(purchase => (
                            <div key={purchase.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center overflow-hidden">
                                  {purchase.photo ? (
                                    <img src={purchase.photo} className="w-full h-full object-cover" />
                                  ) : (
                                    <ShoppingBag className="w-5 h-5" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{purchase.companyName}</p>
                                  <p className="text-[10px] text-gray-400">{new Date(purchase.date).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-indigo-600">৳{purchase.amount.toLocaleString()}</p>
                                <div className="flex gap-1">
                                  <button onClick={() => setEditingCashPurchase(purchase)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setDeleteConfirmation({ type: 'cash_purchase', id: purchase.id })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleAddCashPurchase} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
                        <div className="flex flex-col items-center gap-4 mb-4">
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                              <input 
                                type="file" 
                                accept="image/*"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64 = reader.result as string;
                                      const preview = document.getElementById('cash-purchase-photo-preview') as HTMLImageElement;
                                      const input = document.getElementById('cash-purchase-photo-input') as HTMLInputElement;
                                      if (preview) preview.src = base64;
                                      if (input) input.value = base64;
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <img id="cash-purchase-photo-preview" className="w-full h-full object-cover absolute inset-0 pointer-events-none" />
                              <Camera className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" />
                              <input type="hidden" id="cash-purchase-photo-input" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 text-center">{language === 'bn' ? 'ছবি' : 'Photo'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                            <input 
                              required
                              type="date"
                              name="date"
                              defaultValue={new Date().toISOString().split('T')[0]}
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.amount}</label>
                            <input 
                              required
                              type="number"
                              name="amount"
                              placeholder="0.00"
                              className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.companyName}</label>
                          <input 
                            required
                            name="companyName"
                            placeholder={t.companyName}
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.note}</label>
                          <input 
                            required
                            name="note"
                            placeholder={t.note}
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4"
                        >
                          <Plus className="w-5 h-5" /> {t.add}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              ) : shopAction === 'expense' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (isViewingExpenseHistory) {
                            navigateToExpenseHistory(false);
                          } else {
                            navigateToShopAction('menu');
                          }
                        }} 
                        className="p-2 bg-gray-100 rounded-full"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">
                        {isViewingExpenseHistory ? (language === 'bn' ? 'খরচ হিস্টরি' : 'Expense History') : t.expenseEntry}
                      </h2>
                    </div>
                    {!isViewingExpenseHistory && (
                      <button 
                        onClick={() => navigateToExpenseHistory(true)}
                        className="p-2 bg-white text-primary rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-all"
                      >
                        <History className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {isViewingExpenseHistory ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-400 uppercase ml-1">{language === 'bn' ? 'তারিখ দিয়ে খুঁজুন' : 'Search by Date'}</label>
                        <input 
                          type="date"
                          value={expenseDateFilter}
                          onChange={(e) => setExpenseDateFilter(e.target.value)}
                          className="w-full px-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-primary outline-none font-bold"
                        />
                      </div>

                      <div className="space-y-3">
                        {expenses
                          .filter(ex => 
                            (!expenseDateFilter || ex.date.split('T')[0] === expenseDateFilter)
                          )
                          .map(expense => (
                            <div key={expense.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                                  <TrendingDown className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{expense.note}</p>
                                  <p className="text-[10px] text-gray-400">{new Date(expense.date).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-red-500">৳{expense.amount.toLocaleString()}</p>
                                <div className="flex gap-1">
                                  <button onClick={() => setEditingExpense(expense)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleDeleteExpense(expense.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleAddExpense} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.expenseAmount}</label>
                          <input 
                            required
                            type="number"
                            name="expenseAmount"
                            placeholder="0.00"
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.expenseDate}</label>
                          <input 
                            required
                            type="date"
                            name="expenseDate"
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.expenseNote}</label>
                          <input 
                            required
                            name="expenseNote"
                            placeholder={t.expenseNote}
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4"
                        >
                          <Plus className="w-5 h-5" /> {t.addExpense}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              ) : shopAction === 'cashbox' ? (
                <div className="space-y-6">
                  {(() => {
                    const totalSales = saleRecords.reduce((acc, r) => acc + r.totalAmount, 0);
                    // User requested to use Total Purchase (All Time) from purchaseRecords
                    const totalPurchases = purchaseRecords.reduce((acc, r) => acc + r.totalAmount, 0);
                    const totalExpenses = expenses.reduce((acc, r) => acc + r.amount, 0);
                    const totalOwnerGave = ownerTransactions.filter(t => t.type === 'gave').reduce((acc, t) => acc + t.amount, 0);
                    const totalOwnerTook = ownerTransactions.filter(t => t.type === 'took').reduce((acc, t) => acc + t.amount, 0);
                    const totalCustomerCashIn = customers.reduce((acc, c) => {
                      return acc + c.transactions.filter(t => t.type === 'cash-in').reduce((tAcc, t) => tAcc + t.amount, 0);
                    }, 0);
                    
                    const cashInHand = calculateCashInHand();

                    if (cashboxHistoryType !== 'none') {
                      let historyData: any[] = [];
                      let title = '';
                      let renderItem: (item: any) => React.ReactNode = () => null;

                      if (cashboxHistoryType === 'sale') {
                        historyData = saleRecords.filter(r => 
                          (!historyDateFilter || r.date.split('T')[0] === historyDateFilter) &&
                          (!historySearchQuery || (r.customerName || '').toLowerCase().includes(historySearchQuery.toLowerCase()))
                        );
                        title = t.totalSale;
                        renderItem = (sale: SaleRecord) => (
                          <div 
                            key={sale.id} 
                            onClick={() => setSelectedSaleForDetails(sale)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all"
                          >
                            <div>
                              <p className="font-bold text-gray-800">{sale.customerName || (language === 'bn' ? 'সাধারণ কাস্টমার' : 'Regular Customer')}</p>
                              <p className="text-[10px] text-gray-400">{new Date(sale.date).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-purple-600">৳{sale.totalAmount.toLocaleString()}</p>
                              <div className="flex gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSale(sale);
                                  }} 
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSale(sale);
                                  }} 
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (cashboxHistoryType === 'purchase') {
                        historyData = purchaseRecords.filter(r => 
                          (!historyDateFilter || r.date.split('T')[0] === historyDateFilter) &&
                          (!historySearchQuery || r.productName.toLowerCase().includes(historySearchQuery.toLowerCase()))
                        );
                        title = t.totalPurchase;
                        renderItem = (purchase: PurchaseRecord) => (
                          <div key={purchase.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-gray-800">{purchase.productName}</p>
                              <p className="text-[10px] text-gray-400">
                                {purchase.quantity} Pcs • ৳{purchase.purchaseRate} • {new Date(purchase.date).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-blue-600">৳{purchase.totalAmount.toLocaleString()}</p>
                              <div className="flex gap-1">
                                <button onClick={() => setEditingPurchase(purchase)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeletePurchase(purchase)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (cashboxHistoryType === 'expense') {
                        historyData = expenses.filter(r => 
                          (!historyDateFilter || r.date.split('T')[0] === historyDateFilter)
                        );
                        title = t.totalExpense;
                        renderItem = (expense: Expense) => (
                          <div key={expense.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                                <TrendingDown className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{expense.note}</p>
                                <p className="text-[10px] text-gray-400">{new Date(expense.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-red-600">৳{expense.amount.toLocaleString()}</p>
                              <div className="flex gap-1">
                                <button onClick={() => setEditingExpense(expense)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteExpense(expense.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      } else if (cashboxHistoryType === 'profit') {
                        historyData = getProfitTransactions().filter(tr => 
                          (!historyDateFilter || tr.date.split('T')[0] === historyDateFilter) &&
                          (!historySearchQuery || tr.note.toLowerCase().includes(historySearchQuery.toLowerCase()))
                        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        title = language === 'bn' ? 'লভ্যাংশ হিস্টোরি' : 'Profit History';
                        renderItem = (transaction: any) => (
                          <div key={transaction.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{transaction.note}</p>
                                <p className="text-[10px] text-gray-400">{new Date(transaction.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-black text-green-600">৳{transaction.amount.toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      } else if (cashboxHistoryType === 'owner_gave' || cashboxHistoryType === 'owner_took' || cashboxHistoryType === 'capital') {
                        const type = cashboxHistoryType === 'owner_gave' ? 'gave' : (cashboxHistoryType === 'owner_took' ? 'took' : 'all');
                        
                        let baseData = [...ownerTransactions];
                        if (type === 'all') {
                          baseData = [...baseData, ...getProfitTransactions()];
                        } else {
                          baseData = baseData.filter(tr => tr.type === type);
                        }

                        historyData = baseData.filter(tr => 
                          (!historyDateFilter || tr.date.split('T')[0] === historyDateFilter) &&
                          (!historySearchQuery || tr.note.toLowerCase().includes(historySearchQuery.toLowerCase()))
                        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        title = type === 'gave' ? t.ownerGave : (type === 'took' ? t.ownerTook : (language === 'bn' ? 'মূলধন হিস্টোরি' : 'Capital History'));
                        renderItem = (transaction: any) => (
                          <div key={transaction.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${transaction.type === 'gave' ? 'bg-indigo-50 text-indigo-500' : (transaction.type === 'took' ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-600')}`}>
                                {transaction.type === 'gave' ? <TrendingDown className="w-5 h-5" /> : (transaction.type === 'took' ? <TrendingUp className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{transaction.note || (transaction.type === 'gave' ? t.ownerGave : t.ownerTook)}</p>
                                <p className="text-[10px] text-gray-400">{new Date(transaction.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className={`font-black ${transaction.type === 'gave' ? 'text-indigo-500' : (transaction.type === 'took' ? 'text-orange-500' : 'text-green-600')}`}>
                                {transaction.type === 'profit' ? '+' : (transaction.type === 'gave' ? '+' : '-')}৳{transaction.amount.toLocaleString()}
                              </p>
                              {transaction.type !== 'profit' && (
                                <div className="flex gap-1">
                                  <button onClick={() => setEditingOwnerTransaction(transaction)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteOwnerTransaction(transaction.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button onClick={() => {
                                if (isViewingOwnerHistory) {
                                  if (['capital', 'profit'].includes(cashboxHistoryType)) {
                                    navigateToOwnerHistory('none', false);
                                  } else {
                                    navigateToOwnerHistory(cashboxHistoryType, false);
                                  }
                                } else {
                                  navigateToShopAction('cashbox');
                                }
                              }} className="p-2 bg-gray-100 rounded-full">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                              </button>
                              <h2 className="text-xl font-black text-gray-800 tracking-tight">
                                {isViewingOwnerHistory ? (['capital', 'profit'].includes(cashboxHistoryType) ? title : (language === 'bn' ? 'হিস্টরি' : 'History')) : title}
                              </h2>
                            </div>
                            <button 
                              onClick={() => {
                                if (cashboxHistoryType === 'owner_gave' || cashboxHistoryType === 'owner_took' || cashboxHistoryType === 'capital' || cashboxHistoryType === 'profit') {
                                  const type = cashboxHistoryType === 'owner_gave' ? 'gave' : (cashboxHistoryType === 'owner_took' ? 'took' : (cashboxHistoryType === 'profit' ? 'profit' : 'capital'));
                                  const doc = generateOwnerTransactionsPDF(type);
                                  doc.save(`${type}_history.pdf`);
                                } else {
                                  downloadCSV(historyData, `${title}_history.csv`);
                                }
                              }}
                              className="p-2 bg-primary/10 text-primary rounded-xl flex items-center gap-2 text-xs font-bold"
                            >
                              <Download className="w-4 h-4" /> {t.download}
                            </button>
                          </div>

                          {(cashboxHistoryType === 'owner_gave' || cashboxHistoryType === 'owner_took') && !isViewingOwnerHistory && (
                            <div className="space-y-4">
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const formData = new FormData(e.currentTarget);
                                  const amount = Number(formData.get('amount'));
                                  const note = formData.get('note') as string;
                                  const date = formData.get('date') as string;
                                  const type = cashboxHistoryType === 'owner_gave' ? 'gave' : 'took';

                                  // Capital Check for 'took'
                                  if (type === 'took') {
                                    const currentCash = calculateCashInHand();
                                    if (currentCash < amount) {
                                      alert(language === 'bn' ? 'পর্যাপ্ত ক্যাশ নেই!' : 'Insufficient Cash!');
                                      return;
                                    }
                                  }

                                  const newTransaction: OwnerTransaction = {
                                    id: generateId(),
                                    amount,
                                    type,
                                    note,
                                    date: date ? new Date(date).toISOString() : new Date().toISOString()
                                  };

                                  setOwnerTransactions(prev => [newTransaction, ...prev]);
                                  e.currentTarget.reset();
                                  setSuccessMessage(language === 'bn' ? 'লেনদেন সফলভাবে যোগ করা হয়েছে!' : 'Transaction added successfully!');
                                  setTimeout(() => setSuccessMessage(null), 3000);
                                }}
                                className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4"
                              >
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.amount}</label>
                                    <input 
                                      required
                                      type="number"
                                      name="amount"
                                      placeholder="0.00"
                                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                                    <input 
                                      required
                                      type="date"
                                      name="date"
                                      defaultValue={new Date().toISOString().split('T')[0]}
                                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.note}</label>
                                  <input 
                                    required
                                    name="note"
                                    placeholder={t.note}
                                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                                  />
                                </div>
                                <button 
                                  type="submit"
                                  className={`w-full ${cashboxHistoryType === 'owner_gave' ? 'bg-indigo-600' : 'bg-orange-600'} text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4`}
                                >
                                  <Plus className="w-5 h-5" /> {language === 'bn' ? 'অ্যাড করুন' : 'Add'}
                                </button>
                              </form>

                              <button 
                                onClick={() => navigateToOwnerHistory(cashboxHistoryType, true)}
                                className="w-full bg-white text-gray-600 py-4 rounded-2xl font-bold shadow-sm border border-gray-100 flex items-center justify-center gap-2"
                              >
                                <History className="w-5 h-5" /> {language === 'bn' ? 'হিস্টরি' : 'History'}
                              </button>
                            </div>
                          )}

                          {/* Search and Filter */}
                          {(!['owner_gave', 'owner_took'].includes(cashboxHistoryType) || isViewingOwnerHistory) && (
                            <div className="flex justify-center">
                              <div className="relative w-full max-w-xs">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                  type="date"
                                  value={historyDateFilter}
                                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                                  className="w-full pl-9 pr-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm text-xs font-bold outline-none"
                                />
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            {(!['owner_gave', 'owner_took'].includes(cashboxHistoryType) || isViewingOwnerHistory) && (
                              historyData.length === 0 ? (
                                <div className="bg-white p-8 rounded-[2.5rem] text-center border border-dashed border-gray-200">
                                  <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                  <p className="text-gray-400 font-bold">{t.noTransactions}</p>
                                </div>
                              ) : (
                                <>
                                  {historyDateFilter && cashboxHistoryType === 'capital' && (
                                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-4 text-center">
                                      <p className="text-[10px] font-bold text-gray-500 uppercase">
                                        {language === 'bn' ? `${historyDateFilter} তারিখের মোট মূলধন এড` : `Total Capital Added on ${historyDateFilter}`}
                                      </p>
                                      <p className="text-lg font-black text-primary">
                                        ৳{historyData.reduce((acc, item) => {
                                          const amount = item.amount || 0;
                                          if (item.type === 'took') return acc - amount;
                                          return acc + amount;
                                        }, 0).toLocaleString()}
                                      </p>
                                    </div>
                                  )}
                                  {historyData.map(item => renderItem(item))}
                                </>
                              )
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3">
                              <button onClick={() => {
                                navigateToShopAction('menu');
                              }} className="p-2 bg-gray-100 rounded-full">
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                              </button>
                            <h2 className="text-xl font-black text-gray-800 tracking-tight">{t.cashBox}</h2>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-black text-sm uppercase tracking-wider text-gray-400 px-1">
                            {language === 'bn' ? 'লেনদেন বিবরণ' : 'Transaction Details'}
                          </h3>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center relative group">
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.currentCapital}</p>
                              <p className="text-xl font-black text-primary">৳{calculateCurrentCapital().toLocaleString()}</p>
                              <button 
                                onClick={() => navigateToOwnerHistory('capital', true)}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-primary transition-colors bg-gray-50 rounded-lg"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center relative group">
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.totalProfit}</p>
                              <p className="text-xl font-black text-green-600">৳{calculateTotalProfit().toLocaleString()}</p>
                              <button 
                                onClick={() => navigateToOwnerHistory('profit', true)}
                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-green-600 transition-colors bg-gray-50 rounded-lg"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>

                            <button 
                              onClick={() => navigateToOwnerHistory('owner_gave', false)}
                              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <Plus className="w-4 h-4" />
                              </div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.ownerGave}</p>
                              <p className="text-sm font-black text-gray-800">৳{totalOwnerGave.toLocaleString()}</p>
                            </button>

                            <button 
                              onClick={() => navigateToOwnerHistory('owner_took', false)}
                              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                <ArrowUpCircle className="w-4 h-4" />
                              </div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.ownerTook}</p>
                              <p className="text-sm font-black text-gray-800">৳{totalOwnerTook.toLocaleString()}</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : shopAction === 'stats_history' ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => {
                        navigateToShopAction('menu');
                        setStatsDateFilter('');
                      }} className="p-2 bg-gray-100 rounded-full">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">
                        {statsHistoryType === 'purchase' ? t.totalPurchase : statsHistoryType === 'sale' ? t.totalSale : t.totalExpense}
                      </h2>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">{t.filterByDate}</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                          type="date"
                          value={statsDateFilter}
                          onChange={(e) => setStatsDateFilter(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-800"
                        />
                        {statsDateFilter && (
                          <button 
                            onClick={() => setStatsDateFilter('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(dailyStats)
                      .filter(([date]) => !statsDateFilter || date === statsDateFilter)
                      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                      .map(([date, stats]) => {
                        const s = stats as { purchases?: number, sales?: number, expenses?: number };
                        const value = statsHistoryType === 'purchase' ? s.purchases : statsHistoryType === 'sale' ? s.sales : s.expenses;
                        if (!value || value === 0) return null;
                        return (
                          <button 
                            key={date} 
                            onClick={() => {
                              setSelectedStatsDetails({ date, type: statsHistoryType });
                              setIsStatsDetailsModalOpen(true);
                            }}
                            className="w-full bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                statsHistoryType === 'purchase' ? 'bg-blue-50 text-blue-500' : 
                                statsHistoryType === 'sale' ? 'bg-purple-50 text-purple-500' : 
                                'bg-red-50 text-red-500'
                              }`}>
                                <History className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">{new Date(date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={`font-black ${
                                statsHistoryType === 'purchase' ? 'text-blue-600' : 
                                statsHistoryType === 'sale' ? 'text-purple-600' : 
                                'text-red-600'
                              }`}>৳{value.toLocaleString()}</p>
                              <ChevronLeft className="w-4 h-4 text-gray-300 rotate-180" />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <button onClick={() => setShopAction('menu')} className="text-primary font-bold flex items-center gap-2 mx-auto">
                    <ChevronLeft className="w-5 h-5" /> {t.back}
                  </button>
                  <p className="mt-4 text-gray-400">Feature coming soon...</p>
                </div>
              )}
            </motion.div>
          ) : (
            <>
              {/* Search & Stats */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search}
                    className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <button 
                  onClick={() => {
                    setIsAddingCustomer(true);
                    setIsEditingCustomer({ id: '', name: '', phone: '', address: '', transactions: [], totalBalance: 0 });
                  }}
                  className="bg-secondary text-white p-3 rounded-2xl shadow-md hover:bg-opacity-90 transition-all"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { id: 'all', label: t.all, icon: Filter },
                  { id: 'due', label: t.due, icon: TrendingUp },
                  { id: 'advance', label: t.savings, icon: TrendingDown },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      filterType === f.id 
                        ? 'purple-gradient text-white shadow-md' 
                        : 'bg-white text-gray-500 border border-gray-100'
                    }`}
                  >
                    <f.icon className="w-3.5 h-3.5" />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer List */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t.customers} ({filteredCustomers.length})</h3>
                <button 
                  onClick={handleShareAllCustomersReport}
                  className="text-primary text-xs font-bold flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" /> {language === 'bn' ? 'শেয়ার' : 'Share'}
                </button>
                <button 
                  onClick={() => generateAllCustomersPDF().save('all_customers_report.pdf')}
                  className="text-primary text-xs font-bold flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> {language === 'bn' ? 'ডাউনলোড' : 'Download'}
                </button>
              </div>
              <AnimatePresence mode="popLayout">
                {filteredCustomers.map((customer) => (
                  <motion.div
                    key={customer.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => navigateToCustomer(customer.id)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden ${customer.totalBalance >= 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                        {customer.photo ? (
                          <img src={customer.photo || undefined} className="w-full h-full object-cover" />
                        ) : (
                          "AJH"
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800">{customer.name}</h4>
                        <p className="text-gray-400 text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {customer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className={`text-lg font-black ${customer.totalBalance > 0 ? 'text-red-500' : customer.totalBalance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {customer.totalBalance === 0 ? '৳0' : `৳${Math.abs(customer.totalBalance).toLocaleString()}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          {customer.totalBalance > 0 ? t.due : customer.totalBalance < 0 ? t.savings : 'Balanced'}
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmation({ type: 'customer', id: customer.id });
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filteredCustomers.length === 0 && (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                  <p className="text-gray-400">{language === 'bn' ? 'কোনো কাস্টমার পাওয়া যায়নি' : 'No customers found'}</p>
                </div>
              )}
            </div>
          </>
        )
      ) : (
        /* Customer Detail View */
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Detail Header */}
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => navigateToCustomer(null)}
                className="bg-white p-2 rounded-xl shadow-sm"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex-1 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                  {selectedCustomer?.photo ? (
                    <img src={selectedCustomer.photo || undefined} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                      AJH
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 leading-tight">{selectedCustomer?.name}</h3>
                  <p className="text-gray-400 text-xs">{selectedCustomer?.phone}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => handleShareLedger(selectedCustomer!)}
                  className="bg-green-50 p-2 rounded-xl text-green-600"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => generateCustomerPDF(selectedCustomer!).save(`${selectedCustomer?.name}_ledger.pdf`)}
                  className="bg-purple-50 p-2 rounded-xl text-primary"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsEditingCustomer(selectedCustomer)}
                  className="bg-blue-50 p-2 rounded-xl text-blue-500"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setIsAddingTransaction({ type: 'cash-out' })}
                className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-4 rounded-2xl font-bold border-2 border-red-100 hover:bg-red-100 transition-colors"
              >
                <ArrowUpCircle className="w-5 h-5" /> {t.cashOut}
              </button>
              <button 
                onClick={() => setIsAddingTransaction({ type: 'cash-in' })}
                className="flex items-center justify-center gap-2 bg-green-50 text-green-600 py-4 rounded-2xl font-bold border-2 border-green-100 hover:bg-green-100 transition-colors"
              >
                <ArrowDownCircle className="w-5 h-5" /> {t.cashIn}
              </button>
            </div>

            {/* Transaction History */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4" /> {t.history}
                </h3>
              </div>
              <div className="space-y-3">
                {selectedCustomer?.transactions.map((t) => (
                  <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${t.type === 'cash-out' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                        {t.type === 'cash-out' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{t.note || (t.type === 'cash-out' ? (language === 'bn' ? 'দেওয়া হয়েছে' : 'Given') : (language === 'bn' ? 'পাওয়া গেছে' : 'Received'))}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{new Date(t.date).toLocaleDateString()} • {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-lg ${t.type === 'cash-out' ? 'text-red-500' : 'text-green-600'}`}>
                        {t.type === 'cash-out' ? '-' : '+'}৳{t.amount.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1 ml-2">
                        <button 
                          onClick={() => setIsAddingTransaction({ type: t.type, editId: t.id })}
                          className="text-gray-300 hover:text-blue-400 transition-colors p-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTransaction(selectedCustomer.id, t.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedCustomer?.transactions.length === 0 && (
                  <div className="text-center py-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">{language === 'bn' ? 'এখনও কোনো লেনদেন নেই' : 'No transactions yet'}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* More Menu Drawer */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="purple-gradient p-4 text-white">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-black tracking-tight">Menu</h2>
                  <button onClick={() => setIsMoreMenuOpen(false)} className="bg-white/20 p-1.5 rounded-full">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center overflow-hidden">
                    {shopProfile.shopPhoto ? (
                      <img src={shopProfile.shopPhoto || undefined} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold leading-tight">{shopProfile.shopName || 'My Shop'}</p>
                    <p className="text-xs text-white/70">{phoneNumber}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <button 
                  onClick={() => { setIsMoreMenuOpen(false); setIsEditingShop(true); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-bold"
                >
                  <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                    <Store className="w-5 h-5" />
                  </div>
                  {t.shopProfile}
                </button>
                <button 
                  onClick={() => { setIsMoreMenuOpen(false); navigateToSettings(true); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-bold"
                >
                  <div className="bg-purple-50 p-2 rounded-xl text-primary">
                    <Globe className="w-5 h-5" />
                  </div>
                  {t.settings}
                </button>
                <button 
                  onClick={() => { setIsMoreMenuOpen(false); setIsHelpModalOpen(true); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-bold"
                >
                  <div className="bg-orange-50 p-2 rounded-xl text-orange-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  {t.helpLine}
                </button>
                <button 
                  onClick={() => { setIsMoreMenuOpen(false); setIsAboutModalOpen(true); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-bold"
                >
                  <div className="bg-gray-50 p-2 rounded-xl text-gray-500">
                    <UserCircle className="w-5 h-5" />
                  </div>
                  {t.about}
                </button>

                <div className="pt-4 pb-2 px-4">
                  <p className="text-gray-300 text-[8px] font-bold uppercase tracking-[0.4em] mb-1">Power By</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 font-black text-lg tracking-tighter">Sarker™</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black italic tracking-tight">CashMoney</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={() => { setIsMoreMenuOpen(false); setIsLocked(true); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors text-gray-700 font-bold"
                >
                  <div className="bg-red-50 p-2 rounded-xl text-red-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  {t.lockApp}
                </button>
                <button 
                  onClick={() => { setIsMoreMenuOpen(false); handleLogout(); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  {t.logout}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Backup Modal */}
      <AnimatePresence>
        {isSaleCustomerModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaleCustomerModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="purple-gradient p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{language === 'bn' ? 'গ্রাহকের তথ্য' : 'Customer Info'}</h2>
                <p className="text-white/70 text-sm mt-1">{language === 'bn' ? 'মেমোর জন্য তথ্য দিন' : 'Enter info for memo'}</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{language === 'bn' ? 'গ্রাহকের নাম' : 'Customer Name'}</label>
                    <input 
                      type="text"
                      value={saleCustomerName}
                      onChange={(e) => setSaleCustomerName(e.target.value)}
                      placeholder={language === 'bn' ? 'নাম লিখুন' : 'Enter name'}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{language === 'bn' ? 'মোবাইল নাম্বার' : 'Mobile Number'}</label>
                    <input 
                      type="tel"
                      value={saleCustomerPhone}
                      onChange={(e) => setSaleCustomerPhone(e.target.value)}
                      placeholder={language === 'bn' ? 'নাম্বার লিখুন' : 'Enter number'}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    handleConfirmSale();
                    setIsSaleCustomerModalOpen(false);
                  }}
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> {language === 'bn' ? 'Confirm' : 'Confirm'}
                </button>
                
                <button 
                  onClick={() => setIsSaleCustomerModalOpen(false)}
                  className="w-full bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isBackupModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBackupModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => { setIsBackupModalOpen(false); navigateToSettings(true); }}
                className="absolute right-6 top-6 z-10 bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="purple-gradient p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Save className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{t.backupAndRestore}</h2>
                <p className="text-white/70 text-sm mt-1">{language === 'bn' ? 'আপনার ডাটা সুরক্ষিত রাখুন' : 'Keep your data safe'}</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Google Backup Section */}
                <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl shadow-sm">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{language === 'bn' ? 'গুগল ব্যাকআপ' : 'Google Backup'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {user ? (language === 'bn' ? 'অটোমেটিক ব্যাকআপ চালু' : 'Auto-backup active') : (language === 'bn' ? 'বন্ধ আছে' : 'Inactive')}
                        </p>
                        {user && (
                          <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">
                            {language === 'bn' ? 'শেষ ব্যাকআপ: ' : 'Last Sync: '} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSyncing && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    )}
                  </div>

                  {user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                        <img src={user.photoURL || undefined} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{user.displayName}</p>
                          <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                        </div>
                        <button 
                          onClick={handleGoogleLogout}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-center text-gray-400 font-bold">
                        {language === 'bn' ? 'ইন্টারনেট থাকলে ডাটা অটোমেটিক ব্যাকআপ হবে' : 'Data will sync automatically when online'}
                      </p>
                    </div>
                  ) : (
                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-700 hover:border-primary/30 transition-all active:scale-[0.98]"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
                      {language === 'bn' ? 'গুগল দিয়ে লগইন করুন' : 'Sign in with Google'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleExportOffline}
                    className="flex flex-col items-center gap-3 p-6 bg-green-50 rounded-3xl border-2 border-transparent hover:border-green-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                      <ArrowUpCircle className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-green-700 text-sm">{t.exportFile}</span>
                  </button>

                  <label className="flex flex-col items-center gap-3 p-6 bg-blue-50 rounded-3xl border-2 border-transparent hover:border-blue-200 transition-all group cursor-pointer">
                    <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                      <ArrowDownCircle className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-blue-700 text-sm">{t.importFile}</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={handleImportOffline}
                    />
                  </label>
                </div>

                <button 
                  onClick={() => setIsBackupModalOpen(false)}
                  className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-orange-500 p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{t.helpLine}</h2>
                <p className="text-white/70 text-sm mt-1">Contact us for any assistance</p>
              </div>

              <div className="p-8 space-y-4">
                <a 
                  href="https://www.facebook.com/share/1DpTkqRcaP/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                    <Facebook className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-blue-900">Fb Page</p>
                    <p className="text-xs text-blue-600/70">Follow us on Facebook</p>
                  </div>
                </a>

                <a 
                  href="https://wa.me/8801632733807" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border-2 border-transparent hover:border-green-200 transition-all group"
                >
                  <div className="w-12 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-green-900">Whatsapp</p>
                    <p className="text-xs text-green-600/70">Message us on Whatsapp</p>
                  </div>
                </a>

                <a 
                  href="tel:01632733807" 
                  className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border-2 border-transparent hover:border-orange-200 transition-all group"
                >
                  <div className="w-12 h-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-orange-900">Call</p>
                    <p className="text-xs text-orange-600/70">01632733807</p>
                  </div>
                </a>
                
                <button 
                  onClick={() => setIsHelpModalOpen(false)}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors mt-2"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {isAboutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAboutModalOpen(false);
                setActiveAboutSlide(0);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-gray-800 p-8 text-white text-center relative">
                <button 
                  onClick={() => {
                    setIsAboutModalOpen(false);
                    setActiveAboutSlide(0);
                  }}
                  className="absolute right-5 top-5 bg-red-500 text-white w-10 h-10 rounded-full shadow-2xl hover:bg-red-600 transition-all active:scale-90 z-10 border-2 border-white flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{t.about}</h2>
              </div>

              <div className="p-8 space-y-6">
                <div className="relative h-44 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeAboutSlide}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex items-center justify-center px-4"
                    >
                      <p className="text-gray-700 leading-relaxed text-center font-medium text-lg">
                        {t.aboutSlides[activeAboutSlide]}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="flex justify-center gap-2">
                  {t.aboutSlides.map((_, i) => (
                    <button
                      key={`about-ind-${i}`}
                      onClick={() => setActiveAboutSlide(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        activeAboutSlide === i ? 'w-8 bg-primary' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-center pt-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold mb-1">Power By</p>
                  <p className="text-lg font-black bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                    Sarker™ Cashmoney
                  </p>
                </div>
                
                <div className="flex gap-3">
                  {activeAboutSlide < t.aboutSlides.length - 1 ? (
                    <button 
                      onClick={() => setActiveAboutSlide(prev => prev + 1)}
                      className="w-full py-5 purple-gradient text-white rounded-2xl font-bold shadow-lg hover:opacity-90 transition-all active:scale-[0.98] text-lg flex items-center justify-center gap-2"
                    >
                      {language === 'bn' ? 'পরবর্তী' : 'Next'} <ChevronRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsAboutModalOpen(false);
                        setActiveAboutSlide(0);
                      }}
                      className="w-full py-5 bg-green-500 text-white rounded-2xl font-bold shadow-lg hover:bg-green-600 transition-all active:scale-[0.98] text-lg"
                    >
                      {t.thanks}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Add/Edit Customer Modal */}
        {(isAddingCustomer || isEditingCustomer) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{isEditingCustomer?.id ? t.editCustomer : t.addCustomer}</h3>
                <button onClick={() => { setIsAddingCustomer(false); setIsEditingCustomer(null); }} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={isEditingCustomer?.id ? handleUpdateCustomer : handleAddCustomer} className="space-y-4">
                <div className="flex flex-col items-center mb-2">
                  <div 
                    onClick={() => customerPhotoRef.current?.click()}
                    className="w-20 h-20 bg-gray-100 rounded-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 overflow-hidden"
                  >
                    {isEditingCustomer?.photo ? (
                      <img src={isEditingCustomer.photo || undefined} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="text-gray-400 w-6 h-6" />
                        <span className="text-[8px] text-gray-400 font-bold">Add Photo</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={customerPhotoRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (base64) => {
                      const input = document.getElementById('photo_base64_input') as HTMLInputElement;
                      if (input) input.value = base64;
                      // Force re-render for preview if editing
                      if (isEditingCustomer) setIsEditingCustomer({ ...isEditingCustomer, photo: base64 });
                    })}
                  />
                  <input type="hidden" name="photo_base64" id="photo_base64_input" defaultValue={isEditingCustomer?.photo} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.customerName}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      required
                      name="name"
                      value={isEditingCustomer?.name || ''}
                      onChange={(e) => setIsEditingCustomer(prev => ({ ...(prev || { id: '', name: '', phone: '', address: '', transactions: [], totalBalance: 0 }), name: e.target.value }))}
                      placeholder={t.customerName}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">{t.phoneNumber}</label>
                    <button 
                      type="button"
                      onClick={handleSelectContact}
                      className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <UserCircle className="w-3 h-3" /> {t.selectContact}
                    </button>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      required
                      name="phone"
                      value={isEditingCustomer?.phone || ''}
                      onChange={(e) => setIsEditingCustomer(prev => ({ ...(prev || { id: '', name: '', phone: '', address: '', transactions: [], totalBalance: 0 }), phone: e.target.value }))}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.address} ({t.optional})</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      name="address"
                      value={isEditingCustomer?.address || ''}
                      onChange={(e) => setIsEditingCustomer(prev => ({ ...(prev || { id: '', name: '', phone: '', address: '', transactions: [], totalBalance: 0 }), address: e.target.value }))}
                      placeholder={t.address}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4"
                >
                  <Save className="w-5 h-5" /> {isEditingCustomer ? t.update : t.save}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Shop Modal */}
        {isEditingShop && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.editShop}</h3>
                <button onClick={() => setIsEditingShop(false)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateShopProfile} className="space-y-4">
                <div className="flex flex-col items-center mb-4">
                  <div 
                    onClick={() => shopPhotoRef.current?.click()}
                    className="w-24 h-24 bg-gray-100 rounded-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 overflow-hidden"
                  >
                    {shopProfile.shopPhoto ? (
                      <img src={shopProfile.shopPhoto || undefined} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="text-gray-400 w-8 h-8" />
                        <span className="text-[10px] text-gray-400 font-bold">Add Logo</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={shopPhotoRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (base64) => setShopProfile(prev => ({ ...prev, shopPhoto: base64 })))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shopName}</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      required
                      name="shopName"
                      value={shopProfile.shopName || ''}
                      onChange={(e) => setShopProfile(prev => ({ ...prev, shopName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.phoneNumber}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      disabled
                      value={phoneNumber}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.ownerName}</label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      required
                      name="ownerName"
                      value={shopProfile.ownerName || ''}
                      onChange={(e) => setShopProfile(prev => ({ ...prev, ownerName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shopAddress}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                      name="shopAddress"
                      value={shopProfile.shopAddress || ''}
                      onChange={(e) => setShopProfile(prev => ({ ...prev, shopAddress: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.shopType}</label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select 
                      name="shopType"
                      value={shopProfile.shopType || 'Grocery'}
                      onChange={(e) => setShopProfile(prev => ({ ...prev, shopType: e.target.value }))}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="Grocery">Grocery</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit"
                    className="w-full purple-gradient text-white py-4 rounded-xl font-bold shadow-lg"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.settings}</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setIsChangingPin(true)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                      <Key className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700">{t.pinChange}</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </button>

                <button 
                  onClick={() => setIsChangingNumber(true)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-2 rounded-xl text-green-500">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700">{t.numberChange}</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </button>

                <button 
                  onClick={() => { setIsSettingsOpen(false); setIsBackupModalOpen(true); }}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-2 rounded-xl text-green-600">
                      <Save className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700">{t.dataBackup}</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </button>

                <div className="p-4 bg-gray-50 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-50 p-2 rounded-xl text-orange-500">
                        <Lock className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-gray-700">{t.autoLock}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 5, 10].map((min) => (
                      <button
                        key={min}
                        onClick={() => setAutoLockTimeout(min)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${autoLockTimeout === min ? 'purple-gradient text-white' : 'bg-white text-gray-500 border border-gray-100'}`}
                      >
                        {min === 0 ? t.always : `${min} ${t.minutes}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-50 p-2 rounded-xl text-primary">
                      <Globe className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-700">{t.language}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setLanguage('bn')}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all ${language === 'bn' ? 'purple-gradient text-white' : 'bg-white text-gray-500 border border-gray-100'}`}
                    >
                      বাংলা
                    </button>
                    <button 
                      onClick={() => setLanguage('en')}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all ${language === 'en' ? 'purple-gradient text-white' : 'bg-white text-gray-500 border border-gray-100'}`}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Cash Purchase Edit Modal */}
        <AnimatePresence>
          {editingCashPurchase && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
              >
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-indigo-50/50">
                  <h3 className="text-lg font-black text-gray-800 tracking-tight">{language === 'bn' ? 'ক্যাশ কেনা এডিট' : 'Edit Cash Purchase'}</h3>
                  <button onClick={() => setEditingCashPurchase(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <form onSubmit={handleUpdateCashPurchase} className="p-6 space-y-4">
                  <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const base64 = reader.result as string;
                                const preview = document.getElementById('edit-cash-purchase-photo-preview') as HTMLImageElement;
                                const input = document.getElementById('edit-cash-purchase-photo-input') as HTMLInputElement;
                                if (preview) preview.src = base64;
                                if (input) input.value = base64;
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <img 
                          id="edit-cash-purchase-photo-preview" 
                          src={editingCashPurchase.photo} 
                          className={`w-full h-full object-cover absolute inset-0 pointer-events-none ${!editingCashPurchase.photo ? 'hidden' : ''}`} 
                        />
                        {!editingCashPurchase.photo && <Camera className="w-8 h-8 text-gray-300 group-hover:text-primary transition-colors" />}
                        <input type="hidden" id="edit-cash-purchase-photo-input" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                      <input 
                        required
                        type="date"
                        name="date"
                        defaultValue={editingCashPurchase.date.split('T')[0]}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.amount}</label>
                      <input 
                        required
                        type="number"
                        name="amount"
                        defaultValue={editingCashPurchase.amount}
                        className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.companyName}</label>
                    <input 
                      required
                      name="companyName"
                      defaultValue={editingCashPurchase.companyName}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.note}</label>
                    <input 
                      required
                      name="note"
                      defaultValue={editingCashPurchase.note}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setEditingCashPurchase(null)}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                    >
                      {t.update}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        {deleteConfirmation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {deleteConfirmation.type === 'category' ? t.deleteCategory : 
                 deleteConfirmation.type === 'product' ? t.deleteProduct : t.deleteCustomer}
              </h3>
              <p className="text-gray-500 text-sm mb-8">
                {deleteConfirmation.type === 'category' ? t.confirmDeleteCategory : 
                 deleteConfirmation.type === 'product' ? t.confirmDelete : t.confirmDeleteCustomer}
              </p>
                <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={() => {
                    if (deleteConfirmation.type === 'category') {
                      confirmDeleteCategory(deleteConfirmation.id);
                    } else if (deleteConfirmation.type === 'product') {
                      confirmDeleteProduct(deleteConfirmation.id);
                    } else if (deleteConfirmation.type === 'expense') {
                      confirmDeleteExpense(deleteConfirmation.id);
                    } else if (deleteConfirmation.type === 'cash_purchase') {
                      handleDeleteCashPurchase(deleteConfirmation.id);
                    } else {
                      confirmDeleteCustomer(deleteConfirmation.id);
                    }
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200"
                >
                  {t.confirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Product Modal */}
        {editingProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.editProduct}</h3>
                <button onClick={() => setEditingProduct(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result as string;
                              const preview = document.getElementById('edit-product-photo-preview') as HTMLImageElement;
                              const input = document.getElementById('edit-product-photo-input') as HTMLInputElement;
                              if (preview) {
                                preview.src = base64;
                                preview.classList.remove('hidden');
                              }
                              if (input) input.value = base64;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <img 
                        id="edit-product-photo-preview" 
                        src={editingProduct.photo || undefined}
                        className={`w-full h-full object-cover ${editingProduct.photo ? '' : 'hidden'}`} 
                      />
                      <Camera className={`w-8 h-8 text-gray-300 group-hover:text-primary transition-colors ${editingProduct.photo ? 'hidden' : ''}`} />
                      <input 
                        type="hidden" 
                        name="productPhoto_base64" 
                        id="edit-product-photo-input" 
                        defaultValue={editingProduct.photo || ''}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-2 text-center uppercase tracking-widest">{t.productPhoto}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productName}</label>
                  <input 
                    required
                    name="productName"
                    defaultValue={editingProduct.name}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.unit}</label>
                  <input 
                    required
                    name="unit"
                    defaultValue={editingProduct.unit || 'Piece'}
                    placeholder={t.unit}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productPiece}</label>
                    <input 
                      required
                      type="number"
                      name="productPiece"
                      defaultValue={editingProduct.quantity}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.category}</label>
                    <select 
                      required
                      name="category"
                      defaultValue={editingProduct.category}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none appearance-none"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.purchaseRate}</label>
                    <input 
                      required
                      type="number"
                      name="purchaseRate"
                      defaultValue={editingProduct.purchaseRate}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.sellingRate}</label>
                    <input 
                      required
                      type="number"
                      name="sellingRate"
                      defaultValue={editingProduct.sellingRate}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                >
                  {t.update}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Expense Modal */}
        {editingExpense && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{language === 'bn' ? 'খরচ এডিট করুন' : 'Edit Expense'}</h3>
                <button onClick={() => setEditingExpense(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.expenseDate}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      required
                      type="date"
                      name="expenseDate"
                      defaultValue={editingExpense.date.split('T')[0]}
                      className="w-full pl-12 pr-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-800"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.expenseAmount}</label>
                  <input 
                    required
                    type="number"
                    name="expenseAmount"
                    defaultValue={editingExpense.amount}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.expenseNote}</label>
                  <input 
                    required
                    name="expenseNote"
                    defaultValue={editingExpense.note}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-800"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-black shadow-lg shadow-purple-200 active:scale-[0.98] transition-all"
                >
                  {t.update}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Add/Edit Category Modal */}
        {editingCategory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {typeof editingCategory === 'object' ? t.editCategory : t.addCategory}
                </h3>
                <button onClick={() => setEditingCategory(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="flex flex-col items-center gap-4 mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64 = reader.result as string;
                              const preview = document.getElementById('category-photo-preview') as HTMLImageElement;
                              const input = document.getElementById('category-photo-input') as HTMLInputElement;
                              if (preview) {
                                preview.src = base64;
                                preview.classList.remove('hidden');
                              }
                              if (input) input.value = base64;
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <img 
                        id="category-photo-preview" 
                        src={typeof editingCategory === 'object' ? editingCategory.photo || undefined : undefined}
                        className={`w-full h-full object-cover ${(typeof editingCategory === 'object' && editingCategory.photo) ? '' : 'hidden'}`} 
                      />
                      <Camera className={`w-8 h-8 text-gray-300 group-hover:text-primary transition-colors ${(typeof editingCategory === 'object' && editingCategory.photo) ? 'hidden' : ''}`} />
                      <input 
                        type="hidden" 
                        name="categoryPhoto_base64" 
                        id="category-photo-input" 
                        defaultValue={typeof editingCategory === 'object' ? editingCategory.photo : ''}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-2 text-center uppercase tracking-widest">{t.categoryPhoto}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.categoryName}</label>
                  <input 
                    required
                    autoFocus
                    name="categoryName"
                    defaultValue={typeof editingCategory === 'object' ? editingCategory.name : ''}
                    placeholder={t.categoryName}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                  >
                    {typeof editingCategory === 'object' ? t.update : t.add}
                  </button>
                  {typeof editingCategory === 'object' && (
                    <button 
                      type="button"
                      onClick={() => handleDeleteCategory(editingCategory.id)}
                      className="px-6 bg-red-50 text-red-500 rounded-2xl font-bold flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Owner Transaction Modal */}
        {editingOwnerTransaction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.ownerTransaction} (Edit)</h3>
                <button onClick={() => setEditingOwnerTransaction(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateOwnerTransaction} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.amount}</label>
                  <input 
                    required
                    type="number"
                    name="amount"
                    defaultValue={editingOwnerTransaction.amount}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                  <input 
                    type="date"
                    name="date"
                    defaultValue={editingOwnerTransaction.date.split('T')[0]}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.note}</label>
                  <input 
                    required
                    name="note"
                    defaultValue={editingOwnerTransaction.note}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                >
                  {t.update}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Purchase Record Modal */}
        {editingPurchase && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.recentPurchases} (Edit)</h3>
                <button onClick={() => setEditingPurchase(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleUpdatePurchase} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productName}</label>
                  <input 
                    disabled
                    value={editingPurchase.productName}
                    className="w-full px-6 py-4 bg-gray-100 rounded-2xl border-none font-bold text-gray-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.quantity}</label>
                    <input 
                      required
                      type="number"
                      name="quantity"
                      defaultValue={editingPurchase.quantity}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.rate}</label>
                    <input 
                      required
                      type="number"
                      name="rate"
                      defaultValue={editingPurchase.purchaseRate}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                  <input 
                    type="date"
                    name="date"
                    defaultValue={editingPurchase.date.split('T')[0]}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                >
                  {t.update}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Sale Record Modal */}
        {editingSale && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{language === 'bn' ? 'বিক্রয় তথ্য এডিট' : 'Edit Sale Info'}</h3>
                <button onClick={() => setEditingSale(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleUpdateSale} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.customerName}</label>
                  <input 
                    required
                    name="customerName"
                    defaultValue={editingSale.customerName}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                  <input 
                    type="date"
                    name="date"
                    defaultValue={editingSale.date.split('T')[0]}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.totalAmount}</label>
                  <input 
                    disabled
                    value={editingSale.totalAmount}
                    className="w-full px-6 py-4 bg-gray-100 rounded-2xl border-none font-bold text-gray-500"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                >
                  {language === 'bn' ? 'সেভ' : 'Save'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Pin Change Modal */}
        {isChangingPin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.pinChange}</h3>
                <button onClick={() => setIsChangingPin(false)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newPin = formData.get('newPin') as string;
                const confirmPin = formData.get('confirmPin') as string;
                if (newPin === confirmPin && newPin.length === 4) {
                  localStorage.setItem(`tally_user_${phoneNumber}`, JSON.stringify({ phoneNumber, pin: newPin }));
                  setIsChangingPin(false);
                  alert('PIN changed successfully!');
                } else {
                  alert('PINs do not match or invalid length!');
                }
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.newPin}</label>
                  <input 
                    required
                    type="password"
                    name="newPin"
                    maxLength={4}
                    placeholder="XXXX"
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold text-center tracking-[1rem]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.confirmPin}</label>
                  <input 
                    required
                    type="password"
                    name="confirmPin"
                    maxLength={4}
                    placeholder="XXXX"
                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold text-center tracking-[1rem]"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                >
                  {t.change}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Number Change Modal */}
        {isChangingNumber && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">{t.numberChange}</h3>
                <button onClick={() => setIsChangingNumber(false)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newPhone = formData.get('newPhone') as string;
                if (newPhone && newPhone !== phoneNumber) {
                  const userData = localStorage.getItem(`tally_user_${phoneNumber}`);
                  if (userData) {
                    const user = JSON.parse(userData);
                    // Move data to new phone
                    localStorage.setItem(`tally_user_${newPhone}`, JSON.stringify({ phoneNumber: newPhone, pin: user.pin }));
                    localStorage.setItem(`tally_shop_profile_${newPhone}`, JSON.stringify(shopProfile));
                    localStorage.setItem(`tally_customers_${newPhone}`, JSON.stringify(customers));
                    
                    // Remove old data
                    localStorage.removeItem(`tally_user_${phoneNumber}`);
                    localStorage.removeItem(`tally_shop_profile_${phoneNumber}`);
                    localStorage.removeItem(`tally_customers_${phoneNumber}`);
                    
                    localStorage.setItem('tally_logged_phone', newPhone);
                    setPhoneNumber(newPhone);
                    setIsChangingNumber(false);
                    alert('Phone number changed successfully!');
                  }
                }
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.newNumber}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">+88</span>
                    <input 
                      required
                      type="tel"
                      name="newPhone"
                      placeholder="017XXXXXXXX"
                      className="w-full pl-14 pr-4 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg"
                >
                  {t.change}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Add/Edit Transaction Modal */}
        {isAddingTransaction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isAddingTransaction.type === 'cash-out' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {isAddingTransaction.type === 'cash-out' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {isAddingTransaction.editId ? t.update : (isAddingTransaction.type === 'cash-out' ? `${t.cashOut}` : `${t.cashIn}`)}
                  </h3>
                </div>
                <button onClick={() => setIsAddingTransaction(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.amount}</label>
                  <input 
                    required
                    autoFocus
                    type="number"
                    name="amount"
                    defaultValue={isAddingTransaction.editId ? selectedCustomer?.transactions.find(t => t.id === isAddingTransaction.editId)?.amount : ''}
                    placeholder="0.00"
                    className="w-full px-6 py-5 bg-gray-50 rounded-2xl border-none text-3xl font-black text-center focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                  <input 
                    required
                    type="date"
                    name="date"
                    defaultValue={isAddingTransaction.editId ? new Date(selectedCustomer?.transactions.find(t => t.id === isAddingTransaction.editId)?.date || new Date()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.note}</label>
                  <input 
                    name="note"
                    defaultValue={isAddingTransaction.editId ? selectedCustomer?.transactions.find(t => t.id === isAddingTransaction.editId)?.note : ''}
                    placeholder={t.note}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className={`w-full py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4 text-white ${isAddingTransaction.type === 'cash-out' ? 'bg-red-500' : 'bg-green-600'}`}
                >
                  <Save className="w-5 h-5" /> {isAddingTransaction.editId ? t.update : t.confirm}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Edit Sale Item Modal */}
        <AnimatePresence>
          {editingSaleItem && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingSaleItem(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="text-lg font-black text-gray-800">
                    {language === 'bn' ? 'পণ্য এডিট করুন' : 'Edit Item'}
                  </h3>
                  <button 
                    onClick={() => setEditingSaleItem(null)}
                    className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleUpdateSaleItem} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.productName}</label>
                    <input 
                      required
                      type="text"
                      name="productName"
                      defaultValue={editingSaleItem.productName}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.quantity}</label>
                    <input 
                      required
                      type="number"
                      name="quantity"
                      defaultValue={editingSaleItem.quantity}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.rate}</label>
                    <input 
                      required
                      type="number"
                      name="rate"
                      defaultValue={editingSaleItem.rate}
                      className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none font-bold"
                    />
                  </div>
                  <div className="pt-2">
                    <button 
                      type="submit"
                      className="w-full purple-gradient text-white py-4 rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all"
                    >
                      {language === 'bn' ? 'সেভ' : 'Save'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sale Details Modal */}
        <AnimatePresence>
          {selectedSaleForDetails && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedSaleForDetails(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h3 className="text-lg font-black text-gray-800">
                      {language === 'bn' ? 'বিক্রয় বিবরণ' : 'Sale Details'}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                      {new Date(selectedSaleForDetails.date).toLocaleString()}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedSaleForDetails(null)}
                    className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                  <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">
                        {language === 'bn' ? 'কাস্টমার' : 'Customer'}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-800">
                          {selectedSaleForDetails.customerName || (language === 'bn' ? 'সাধারণ কাস্টমার' : 'Regular Customer')}
                        </p>
                        <button 
                          onClick={() => setEditingSale(selectedSaleForDetails)}
                          className="p-1 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">
                        {language === 'bn' ? 'মোট টাকা' : 'Total Amount'}
                      </p>
                      <p className="text-xl font-black text-green-600">
                        ৳{selectedSaleForDetails.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      {language === 'bn' ? 'বিক্রিত পণ্যসমূহ' : 'Sold Items'}
                    </h4>
                    <div className="space-y-2">
                      {selectedSaleForDetails.items.map((item, idx) => (
                        <div key={`${selectedSaleForDetails.id}-item-${idx}`} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <button 
                                  onClick={() => handleQuickUpdateSaleItem(selectedSaleForDetails.id, idx, item.quantity - 1)}
                                  className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 active:scale-90 transition-all"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] font-black text-gray-800 min-w-[20px] text-center">
                                  {item.quantity}
                                </span>
                                <button 
                                  onClick={() => handleQuickUpdateSaleItem(selectedSaleForDetails.id, idx, item.quantity + 1)}
                                  className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 active:scale-90 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">
                                  • ৳{item.rate} / Pc
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-black text-gray-800">৳{(item.quantity * item.rate).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button 
                                onClick={() => setEditingSaleItem({ saleId: selectedSaleForDetails.id, itemIndex: idx, quantity: item.quantity, rate: item.rate, productName: item.productName })}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteSaleItem(selectedSaleForDetails.id, idx)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 space-y-3">
                  <div className="flex gap-3">
                    <button 
                      onClick={async () => {
                        const doc = await generateMemoPDF(selectedSaleForDetails.customerName, selectedSaleForDetails.customerPhone, selectedSaleForDetails.items, selectedSaleForDetails.date);
                        if (doc) doc.save(`Memo_${Date.now()}.pdf`);
                      }}
                      className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Download className="w-5 h-5" /> {t.downloadMemo}
                    </button>
                    <button 
                      onClick={async () => {
                        const doc = await generateMemoPDF(selectedSaleForDetails.customerName, selectedSaleForDetails.customerPhone, selectedSaleForDetails.items, selectedSaleForDetails.date);
                        if (doc) {
                          const pdfBlob = doc.output('blob');
                          const file = new File([pdfBlob], `Memo_${Date.now()}.pdf`, { type: 'application/pdf' });
                          if (navigator.share && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                              title: 'Cash Memo',
                              files: [file]
                            });
                          } else {
                            alert('Sharing not supported');
                          }
                        }
                      }}
                      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Share2 className="w-5 h-5" /> {language === 'bn' ? 'শেয়ার' : 'Share'}
                    </button>
                  </div>
                  <button 
                    onClick={() => setSelectedSaleForDetails(null)}
                    className="w-full bg-white text-gray-800 py-4 rounded-2xl font-bold shadow-sm border border-gray-200 active:scale-[0.98] transition-all"
                  >
                    {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Purchase History Modal */}
        <AnimatePresence>
          {selectedProductForHistory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setSelectedProductForHistory(null)}
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl purple-gradient flex items-center justify-center text-white shadow-lg">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-gray-800 tracking-tight">
                        {language === 'bn' ? 'ক্রয় হিস্টরি' : 'Purchase History'}
                      </h3>
                      <p className="text-primary font-bold text-[10px] uppercase tracking-widest">{selectedProductForHistory.name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedProductForHistory(null)}
                    className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {purchaseRecords.filter(r => r.productId === selectedProductForHistory.id).length === 0 ? (
                    <div className="text-center py-10">
                      <Package className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 font-bold">{language === 'bn' ? 'কোনো ক্রয় হিস্টরি পাওয়া যায়নি' : 'No purchase history found'}</p>
                    </div>
                  ) : (
                    purchaseRecords
                      .filter(r => r.productId === selectedProductForHistory.id)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record) => (
                        <div key={record.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{new Date(record.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase">
                                {record.quantity} {selectedProductForHistory.unit} • ৳{record.purchaseRate} / {selectedProductForHistory.unit}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-primary">৳{record.totalAmount.toLocaleString()}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{t.total}</p>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{language === 'bn' ? 'মোট ক্রয়' : 'Total Purchased'}</p>
                    <p className="text-lg font-black text-gray-800">
                      {purchaseRecords.filter(r => r.productId === selectedProductForHistory.id).reduce((sum, r) => sum + r.quantity, 0)} {selectedProductForHistory.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{language === 'bn' ? 'মোট খরচ' : 'Total Investment'}</p>
                    <p className="text-lg font-black text-primary">
                      ৳{purchaseRecords.filter(r => r.productId === selectedProductForHistory.id).reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Adjust Balance Modal */}
        {isAdjustBalanceModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="purple-gradient p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight">{t.adjustBalance}</h3>
                <button onClick={() => setIsAdjustBalanceModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.currentCash}</label>
                  <div className="w-full px-5 py-4 bg-gray-50 rounded-2xl font-bold text-gray-500">
                    ৳{(() => {
                      const totalSales = saleRecords.reduce((acc, r) => acc + r.totalAmount, 0);
                      const totalPurchases = purchaseRecords.reduce((acc, r) => acc + r.totalAmount, 0);
                      const totalOwnerGave = ownerTransactions.filter(t => t.type === 'gave').reduce((acc, t) => acc + t.amount, 0);
                      const totalOwnerTook = ownerTransactions.filter(t => t.type === 'took').reduce((acc, t) => acc + t.amount, 0);
                      const totalCustomerCashIn = customers.reduce((acc, c) => {
                        return acc + c.transactions.filter(t => t.type === 'cash-in').reduce((tAcc, t) => tAcc + t.amount, 0);
                      }, 0);
                      return (totalOwnerGave - totalOwnerTook + totalSales - totalPurchases + totalCustomerCashIn).toLocaleString();
                    })()}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.newCash}</label>
                  <input 
                    type="number"
                    value={adjustmentValue}
                    onChange={(e) => setAdjustmentValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-800"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={() => {
                    const totalSales = saleRecords.reduce((acc, r) => acc + r.totalAmount, 0);
                    const totalPurchases = purchaseRecords.reduce((acc, r) => acc + r.totalAmount, 0);
                    const totalOwnerGave = ownerTransactions.filter(t => t.type === 'gave').reduce((acc, t) => acc + t.amount, 0);
                    const totalOwnerTook = ownerTransactions.filter(t => t.type === 'took').reduce((acc, t) => acc + t.amount, 0);
                    const totalCustomerCashIn = customers.reduce((acc, c) => {
                      return acc + c.transactions.filter(t => t.type === 'cash-in').reduce((tAcc, t) => tAcc + t.amount, 0);
                    }, 0);
                    const currentCash = totalOwnerGave - totalOwnerTook + totalSales - totalPurchases + totalCustomerCashIn;
                    handleAdjustBalance(currentCash);
                  }}
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-black shadow-lg shadow-purple-200 active:scale-[0.98] transition-all"
                >
                  {t.confirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Owner Transaction Modal */}
        {isOwnerTransactionModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isOwnerTransactionModalOpen.type === 'gave' ? 'bg-indigo-50 text-indigo-500' : 'bg-orange-50 text-orange-500'}`}>
                    {isOwnerTransactionModalOpen.type === 'gave' ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">
                    {isOwnerTransactionModalOpen.type === 'gave' ? t.ownerGave : t.ownerTook}
                  </h3>
                </div>
                <button onClick={() => setIsOwnerTransactionModalOpen(null)} className="bg-gray-100 p-2 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleAddOwnerTransaction} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.amount}</label>
                  <input 
                    required
                    autoFocus
                    type="number"
                    name="amount"
                    placeholder="0.00"
                    className="w-full px-6 py-5 bg-gray-50 rounded-2xl border-none text-3xl font-black text-center focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.date}</label>
                  <input 
                    required
                    type="date"
                    name="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">{t.note}</label>
                  <input 
                    name="note"
                    placeholder={t.note}
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className={`w-full py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 mt-4 text-white ${isOwnerTransactionModalOpen.type === 'gave' ? 'bg-indigo-500' : 'bg-orange-500'}`}
                >
                  <Save className="w-5 h-5" /> {t.confirm}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Stats Details Modal */}
        {isStatsDetailsModalOpen && selectedStatsDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-gray-50 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="purple-gradient p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black">{t.details}</h3>
                  <p className="text-white/70 text-xs font-bold uppercase tracking-widest">
                    {new Date(selectedStatsDetails.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setIsStatsDetailsModalOpen(false)} className="bg-white/20 p-2 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                {selectedStatsDetails.type === 'expense' ? (
                  expenses.filter(e => e.date.split('T')[0] === selectedStatsDetails.date).length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-400">{t.noTransactions}</p>
                    </div>
                  ) : (
                    expenses.filter(e => e.date.split('T')[0] === selectedStatsDetails.date).map(expense => (
                      <div key={expense.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{expense.note}</p>
                            <p className="text-[10px] text-gray-400">{new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-red-500">৳{expense.amount.toLocaleString()}</p>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                setEditingExpense(expense);
                                setIsStatsDetailsModalOpen(false);
                              }}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-3.5 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                handleDeleteExpense(expense.id);
                                setIsStatsDetailsModalOpen(false);
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : selectedStatsDetails.type === 'sale' ? (
                  <div className="text-center py-10">
                    <p className="text-gray-400">{language === 'bn' ? 'বিক্রয়ের বিস্তারিত তথ্য শীঘ্রই আসছে...' : 'Sale details coming soon...'}</p>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-400">{language === 'bn' ? 'ক্রয়ের বিস্তারিত তথ্য শীঘ্রই আসছে...' : 'Purchase details coming soon...'}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Critical Error Modal */}
        <AnimatePresence>
          {criticalError && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center"
              >
                <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">{criticalError}</h2>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  {language === 'bn' 
                    ? 'দুঃখিত, ডাটাবেসের সাথে সংযোগ করা যাচ্ছে না। দয়া করে আপনার ইন্টারনেট কানেকশন চেক করুন এবং আবার চেষ্টা করুন।' 
                    : 'Sorry, we could not connect to the database. Please check your internet connection and try again.'}
                </p>
                
                {criticalErrorInfo && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-6 text-left overflow-auto max-h-32">
                    <p className="text-[10px] font-mono text-gray-400 break-all">{criticalErrorInfo}</p>
                  </div>
                )}

                <button 
                  onClick={() => window.location.reload()}
                  className="w-full purple-gradient text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Try Again'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Bottom Navigation (Mobile App Feel) */}
      {!selectedCustomerId && (
        <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white/80 backdrop-blur-lg border-t border-gray-100 p-4 flex justify-around items-center z-10">
          <button 
            onClick={() => navigateToShop(false)}
            className={`flex flex-col items-center gap-1 ${!isShopView ? 'text-primary' : 'text-gray-400'}`}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">{t.tallyKhata}</span>
          </button>
          <button 
            onClick={() => navigateToShop(true)}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl -mt-10 border-4 border-white transition-all ${isShopView ? 'purple-gradient text-white' : 'bg-white text-gray-400'}`}
          >
            <Store className="w-6 h-6" />
            <span className="text-[8px] font-bold uppercase">{t.shop}</span>
          </button>
          <button 
            onClick={() => setIsMoreMenuOpen(true)}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase">{t.menu}</span>
          </button>
        </div>
      )}
    </div>
  );
}
