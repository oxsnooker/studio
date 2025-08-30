
import type { Table, MenuItem, Admin, Staff, MembershipPlan, Member } from './types';

// This data is now fetched from Firestore. This file can be removed later,
// but is kept for type exports.

export const admins: Admin[] = [
    { id: 'admin-1', username: 'admin', password: 'password' },
];

// Mock data for dashboard analytics, which are not stored in the database yet.
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
