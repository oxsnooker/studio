import type { Table, MenuItem, Admin, Staff, MembershipPlan, Member } from './types';

export const initialTables: Table[] = [
  { id: 'table-1', name: 'Table 1', rate: 120 },
  { id: 'table-2', name: 'Table 2', rate: 120 },
  { id: 'table-3', name: 'Table 3', rate: 120 },
  { id: 'table-4', name: 'Table 4', rate: 120 },
  { id: 'vip-table-1', name: 'VIP Table', rate: 200 },
  { id: 'snooker-table-1', name: 'Snooker Table', rate: 150 },
];

export const initialMenuItems: MenuItem[] = [
  { id: 'item-1', name: 'Chips', price: 20 },
  { id: 'item-2', name: 'Cold Drink', price: 30 },
  { id: 'item-3', name: 'Water Bottle', price: 10 },
  { id: 'item-4', name: 'Coffee', price: 40 },
  { id: 'item-5', name: 'Sandwich', price: 60 },
];

export const admins: Admin[] = [
    { id: 'admin-1', username: 'admin', password: 'password' },
];

export const initialStaff: Staff[] = [
    { id: 'staff-1', name: 'Rajesh Kumar', username: 'staff', password: 'password' },
    { id: 'staff-2', name: 'Sunita Sharma', username: 'sunita', password: 'password' },
];

export const initialMembershipPlans: MembershipPlan[] = [
    { id: 'plan-1', name: 'Silver', price: 999, totalHours: 45 },
    { id: 'plan-2', name: 'Gold', price: 1999, totalHours: 100 },
    { id: 'plan-3', name: 'Platinum', price: 4999, totalHours: 300 },
];

export const initialMembers: Member[] = [
    { id: 'member-1', name: 'Rajesh Kumar', planId: 'plan-1', remainingHours: 27.5 },
    { id: 'member-2', name: 'Priya Singh', planId: 'plan-2', remainingHours: 80 },
    { id: 'member-3', name: 'Amit Patel', planId: 'plan-1', remainingHours: 40 },
];

// Mock data for dashboard
export const dailyRevenue = {
    total: 1820,
    tableTime: 1200,
    chips: 320,
    drinks: 300,
};

export const itemWiseSales = [
    { name: 'Chips', quantity: 16 },
    { name: 'Cold Drink', quantity: 8 },
    { name: 'Water Bottle', quantity: 6 },
    { name: 'Coffee', quantity: 0 },
    { name: 'Sandwich', quantity: 0 },
];

export type { Table, MenuItem, Admin, Staff, MembershipPlan, Member, ActiveSession, OrderItem } from './types';
