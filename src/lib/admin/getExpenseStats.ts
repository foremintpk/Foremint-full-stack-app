import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ExpenseStats, ExpenseFilters } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchExpenseStatsQuery(
  supabase: SupabaseClient<Database>,
  filters: Pick<ExpenseFilters, 'dateRange'>
): Promise<ExpenseStats> {
  const { dateRange } = filters;

  let query = supabase
    .from('expenses')
    .select(`
      amount,
      category_id,
      expense_categories ( id, name, color )
    `);

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

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching expense stats:', error);
    throw error;
  }

  let totalAmount = 0;
  const categoriesMap = new Map<string, { categoryName: string, categoryColor: string, amount: number, count: number }>();

  (data || []).forEach((row: any) => {
    const amt = Number(row.amount) || 0;
    totalAmount += amt;

    const catId = row.category_id;
    const catName = row.expense_categories?.name || 'Unknown';
    const catColor = row.expense_categories?.color || '#6b7280';

    if (!categoriesMap.has(catId)) {
      categoriesMap.set(catId, {
        categoryName: catName,
        categoryColor: catColor,
        amount: 0,
        count: 0
      });
    }

    const stat = categoriesMap.get(catId)!;
    stat.amount += amt;
    stat.count += 1;
  });

  const byCategory = Array.from(categoriesMap.entries()).map(([categoryId, stat]) => ({
    categoryId,
    ...stat
  }));

  return {
    totalExpenses: data?.length || 0,
    totalAmount,
    byCategory,
  };
}

async function getCachedExpenseStats(filters: Pick<ExpenseFilters, 'dateRange'>): Promise<ExpenseStats> {
  const supabase = await createClient();
  const filterKey = JSON.stringify(filters);

  return unstable_cache(
    async (fk: string) => {
      return fetchExpenseStatsQuery(supabase, filters);
    },
    [`expense-stats-${filterKey}`],
    {
      revalidate: 60,
      tags: ['expense-list'],
    }
  )(filterKey);
}

export const getExpenseStats = cache(getCachedExpenseStats);
