
export interface Table {
  id: string;
  name: string;
  category: string;
  rate: number; // per hour
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export interface ActiveSession {
  id?: string; // Firestore document ID
  tableId: string;
  startTime: number; // Timestamp
  elapsedSeconds: number;
  items: OrderItem[];
  status: 'running' | 'paused' | 'stopped';
  pauseTime?: number; // Timestamp
  totalPauseDuration: number;
  customerName: string;
  memberId: string | null;
}


export interface Transaction {
    id?: string;
    tableId: string;
    tableName: string;
    startTime: number; // Use number (timestamp) for Firestore
    endTime: number; // Use number (timestamp) for Firestore
    durationSeconds: number;
    tableCost: number;
    itemsCost: number;
    totalAmount: number;
    paymentMethod: string;
    cashAmount?: number; // For Split Pay
    upiAmount?: number; // For Split Pay
    items: OrderItem[];
    customerName: string;
    createdAt: number; // Use number (timestamp) for Firestore
}


export interface Admin {
  id:string;
  email: string;
  name: string;
  role: 'admin';
}

export interface Staff {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string;
  role: 'staff';
}

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  totalHours: number;
  color?: string;
}

export interface Member {
  id: string;
  name: string;
  planId: string;
  remainingHours: number;
  mobileNumber?: string;
  validityDate?: number; // Expiration timestamp
}
