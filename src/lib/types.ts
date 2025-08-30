

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
  startTime: Date;
  elapsedSeconds: number;
  items: OrderItem[];
  status: 'running' | 'paused' | 'stopped';
  pauseTime?: Date;
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
    items: OrderItem[];
    customerName: string;
    createdAt: number; // Use number (timestamp) for Firestore
}


export interface Admin {
  id:string;
  username: string;
  password?: string; // Should not be sent to client
}

export interface Staff {
  id: string;
  name: string;
  username: string;
  password?: string; // Should not be sent to client
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

    