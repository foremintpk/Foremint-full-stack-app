import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ExpenseFilters, ExpenseListResult, Expense } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchExpensesQuery(
  supabase: SupabaseClient<Database>,
  filters: ExpenseFilters
): Promise<ExpenseListResult> {
  const { categoryId, search, dateRange, page = 1, pageSize = 25 } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('expenses')
    .select(`
      id, description, date, amount, created_by, created_at, updated_at,
      category_id,
      expense_categories ( id, name, icon, color )
    `, { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (categoryId && categoryId !== 'all') {
    query = query.eq('category_id', categoryId);
  }

  if (search) {
    query = query.ilike('description', `%${search}%`);
  }

  if (dateRange && dateRange !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateRange === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      query = query.eq('date', todayStr);
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      query = query.eq('date', yStr);
    } else {
      const days = parseInt(dateRange.replace('d', ''), 10);
      if (!isNaN(days)) {
        const since = new Date(today);
        since.setDate(since.getDate() - days);
        query = query.gte('date', since.toISOString().split('T')[0]);
      }
    }
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching expenses:', error);
    throw error;
  }

  const expenses: Expense[] = (data || []).map((row: any) => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.expense_categories?.name || 'Unknown',
    categoryIcon: row.expense_categories?.icon || 'receipt',
    categoryColor: row.expense_categories?.color || '#6b7280',
    description: row.description,
    date: row.date,
    amount: Number(row.amount) || 0,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    expenses,
    total,
    totalPages,
  };
}

async function getCachedExpenses(filters: ExpenseFilters): Promise<ExpenseListResult> {
  const supabase = await createClient();
  const filterKey = JSON.stringify(filters);

  return unstable_cache(
    async (fk: string) => {
      return fetchExpensesQuery(supabase, filters);
    },
    [`expense-list-${filterKey}`],
    {
      revalidate: 60,
      tags: ['expense-list'],
    }
  )(filterKey);
}

export const getExpenses = cache(getCachedExpenses);
