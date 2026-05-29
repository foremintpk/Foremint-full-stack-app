import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ExpenseCategory } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchExpenseCategoriesQuery(
  supabase: SupabaseClient<Database>
): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('getExpenseCategories error:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
  }));
}

async function getCachedExpenseCategories(): Promise<ExpenseCategory[]> {
  const supabase = await createClient();

  return unstable_cache(
    async () => {
      return fetchExpenseCategoriesQuery(supabase);
    },
    ['expense-categories'],
    { revalidate: 300, tags: ['expense-categories'] }
  )();
}

export const getExpenseCategories = cache(getCachedExpenseCategories);
