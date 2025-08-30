
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const stockUpdateSchema = z.object({
  stock: z.coerce.number().min(0, 'Stock must be a non-negative number.'),
});

export async function updateStock(id: string, newStock: number) {
    if (!id) {
        return { success: false, message: 'Invalid item ID.' };
    }

    try {
        const parsed = stockUpdateSchema.parse({ stock: newStock });
        
        const menuItemRef = doc(db, 'menuItems', id);
        await updateDoc(menuItemRef, { stock: parsed.stock });

        revalidatePath('/admin/stock');
        revalidatePath('/admin/menu'); // Also revalidate menu page as it shows stock
        return { success: true, message: 'Stock updated successfully.' };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors[0].message };
        }
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
