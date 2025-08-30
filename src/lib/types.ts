
export interface Table {
  id: string;
  name: string;
  category: string;
  rate: number; // per hour
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export interface ActiveSession {
  startTime: Date;
  elapsedSeconds: number;
  items: OrderItem[];
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
  price: number;
  totalHours: number;
}

export interface Member {
  id: string;
  name: string;
  planId: string;
  remainingHours: number;
}
