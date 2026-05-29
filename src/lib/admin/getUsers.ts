/**
 * @file src/lib/admin/getUsers.ts
 * @description Fetches profiles list with search, status, and role filters.
 * Prevents accessing cookies inside unstable_cache.
 */

import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AdminUser, UserListFilters, UserListResult, UserRole } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchUsers(
  supabase: SupabaseClient<Database>,
  filters: UserListFilters
): Promise<UserListResult> {
  const { search, role, status, page = 1, pageSize = 25 } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, avatar_url, is_active, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search && search.trim()) {
    const cleanQ = search.trim();
    query = query.or(`full_name.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`);
  }
  if (role && role !== 'all') {
    query = query.eq('role', role);
  }
  if (status === 'active') {
    query = query.eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching users from DB:', error);
    return {
      users: [],
      total: 0,
      totalPages: 0,
    };
  }

  const users: AdminUser[] = (data || []).map((profile) => ({
    id: profile.id,
    email: profile.email || '',
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role as UserRole,
    avatarUrl: profile.avatar_url,
    isActive: !!profile.is_active,
    createdAt: profile.created_at,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    users,
    total,
    totalPages,
  };
}

export async function getCachedUsers(filters: UserListFilters): Promise<UserListResult> {
  const supabase = await createClient();
  const filterKey = JSON.stringify(filters);

  return unstable_cache(
    async (parsedFilters: UserListFilters): Promise<UserListResult> => {
      return fetchUsers(supabase, parsedFilters);
    },
    [`user-list-${filterKey}`],
    {
      revalidate: 120, // Cache for 120s
      tags: ['user-list'],
    }
  )(filters);
}

export const getUsers = cache(getCachedUsers);
