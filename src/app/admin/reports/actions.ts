
'use server';

import { getStaff as getAllStaff } from '../staff/actions';
import type { Staff } from '@/lib/types';

export async function getStaffList(): Promise<Staff[]> {
    try {
        const staff = await getAllStaff();
        return staff;
    } catch (error) {
        console.error("Error fetching staff list for reports:", error);
        return [];
    }
}
