
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/firebase';
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
});


// Actions for Membership Plans
export async function getMembershipPlans(): Promise<MembershipPlan[]> {
  const plansCollection = collection(db, 'membershipPlans');
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
  await addDoc(collection(db, 'membershipPlans'), parsed);
  revalidatePath('/admin/memberships');
  return { success: true, message: 'Membership plan added.' };
}

// Actions for Members
export async function getMembers(): Promise<Member[]> {
  const membersCollection = collection(db, 'members');
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
  });


  const data = {
      ...parsed,
      remainingHours: selectedPlan.totalHours,
  };

  await addDoc(collection(db, 'members'), data);
  revalidatePath('/admin/memberships');
  return { success: true, message: 'New member added.' };
}
