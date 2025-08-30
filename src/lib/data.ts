
import type { Table, MenuItem, Admin, Staff, MembershipPlan, Member } from './types';

// This file is now mainly for exporting types.
// Most data is fetched from Firestore.

export const admins: Admin[] = [
    { id: 'admin-1', username: 'admin', password: 'password' },
];

export type { Table, MenuItem, Admin, Staff, MembershipPlan, Member, ActiveSession, OrderItem, Transaction } from './types';
