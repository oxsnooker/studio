'use server';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Table } from '@/lib/types';
import { getMenuItems as getAllMenuItems } from '@/app/admin/menu/actions';
import type { MenuItem } from '@/lib/types';

export async function getTableById(id: string): Promise<Table | null> {
  if (!id) return null;
  const tableRef = doc(db, 'tables', id);
  const tableSnap = await getDoc(tableRef);

  if (!tableSnap.exists()) {
    return null;
  }

  return { id: tableSnap.id, ...tableSnap.data() } as Table;
}


export async function getMenuItems(): Promise<MenuItem[]> {
    return getAllMenuItems();
}
