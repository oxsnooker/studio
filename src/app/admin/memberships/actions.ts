
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { MembershipPlan, Member } from '@/lib/types';

// Schemas for validation
const planSchema = z.object({
  name: z.string().min(1, 'Plan name is required.'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number.'),
  totalHours: z.coerce.number().min(1, 'Total hours must be at least 1.'),
  color: z.string().optional(),
});

const memberSchema = z.object({
  name: z.string().min(1, 'Customer name is required.'),
  planId: z.string().min(1, 'A membership plan must be selected.'),
  mobileNumber: z.string().optional(),
  validityDate: z.coerce.date().optional(),
});

const memberUpdateSchema = z.object({
    name: z.string().min(1, 'Customer name is required.'),
    planId: z.string().min(1, 'A membership plan must be selected.'),
    mobileNumber: z.string().optional(),
    validityDate: z.coerce.date().optional(),
    remainingHours: z.coerce.number().min(0, 'Remaining hours must be a positive number.'),
});


// Actions for Membership Plans
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const plansCollection = collection(adminDb, 'membershipPlans');
  const q = query(plansCollection, orderBy('price'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as MembershipPlan));
}

export async function addMembershipPlan(formData: FormData) {
  const parsed = planSchema.parse({
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    totalHours: formData.get('totalHours'),
    color: formData.get('color'),
  });
  await addDoc(collection(adminDb, 'membershipPlans'), parsed);
  revalidatePath('/admin/memberships');
  return { success: true, message: 'Membership plan added.' };
}

// Actions for Members
export async function getMembers(): Promise<Member[]> {
  const membersCollection = collection(adminDb, 'members');
  const q = query(membersCollection, orderBy('name'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Member));
}

export async function addMember(formData: FormData) {
  const plans = await getMembershipPlans();
  const selectedPlanId = formData.get('planId') as string;
  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  if (!selectedPlan) {
    return { success: false, message: 'Invalid plan selected.' };
  }
  
  const parsed = memberSchema.parse({
    name: formData.get('name'),
    planId: selectedPlanId,
    mobileNumber: formData.get('mobileNumber'),
    validityDate: formData.get('validityDate') ? new Date(formData.get('validityDate') as string) : undefined,
  });


  const data = {
      name: parsed.name,
      planId: parsed.planId,
      mobileNumber: parsed.mobileNumber,
      remainingHours: selectedPlan.totalHours,
      validityDate: parsed.validityDate ? parsed.validityDate.getTime() : undefined,
  };

  await addDoc(collection(adminDb, 'members'), data);
  revalidatePath('/admin/memberships');
  return { success: true, message: 'New member added.' };
}

export async function updateMember(id: string, formData: FormData) {
    if (!id) {
        return { success: false, message: 'Invalid member ID.' };
    }

    const parsed = memberUpdateSchema.parse({
        name: formData.get('name'),
        planId: formData.get('planId'),
        mobileNumber: formData.get('mobileNumber'),
        validityDate: formData.get('validityDate') ? new Date(formData.get('validityDate') as string) : undefined,
        remainingHours: formData.get('remainingHours'),
    });

    const data = {
        name: parsed.name,
        planId: parsed.planId,
        mobileNumber: parsed.mobileNumber,
        remainingHours: parsed.remainingHours,
        validityDate: parsed.validityDate ? parsed.validityDate.getTime() : undefined,
    };

    const memberRef = doc(adminDb, 'members', id);
    await updateDoc(memberRef, data);
    revalidatePath('/admin/memberships');
    return { success: true, message: 'Member details updated.' };
}
