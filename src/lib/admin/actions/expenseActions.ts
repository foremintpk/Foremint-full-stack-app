'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag, revalidatePath } from 'next/cache';


// EXPENSE ACTIONS

export async function createExpense(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'administrator' && profile?.role !== 'manager') {
      return { error: 'Insufficient permissions' };
    }

    // Parse Data
    const category_id = formData.get('categoryId') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const amountStr = formData.get('amount') as string;

    if (!category_id) return { error: 'Category is required' };
    if (!description || !description.trim()) return { error: 'Description is required' };
    if (!date) return { error: 'Date is required' };
    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) < 0) {
      return { error: 'Valid positive amount is required' };
    }

    const amount = Number(amountStr);

    const { error: insertError } = await supabase
      .from('expenses')
      .insert({
        category_id,
        description: description.trim(),
        date,
        amount,
        created_by: user.id,
      });

    if (insertError) {
      console.error('Insert Expense Error:', insertError);
      return { error: insertError.message || 'Failed to create expense' };
    }

    revalidateTag('expense-list', 'max');
    revalidatePath('/admin/expenses', 'page');
    revalidatePath('/admin', 'layout');

    return {};
  } catch (err: any) {
    console.error('Create Expense Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function updateExpense(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'administrator' && profile?.role !== 'manager') {
      return { error: 'Insufficient permissions' };
    }

    // Parse Data
    const category_id = formData.get('categoryId') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const amountStr = formData.get('amount') as string;

    if (!category_id) return { error: 'Category is required' };
    if (!description || !description.trim()) return { error: 'Description is required' };
    if (!date) return { error: 'Date is required' };
    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) < 0) {
      return { error: 'Valid positive amount is required' };
    }

    const amount = Number(amountStr);

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        category_id,
        description: description.trim(),
        date,
        amount,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update Expense Error:', updateError);
      return { error: updateError.message || 'Failed to update expense' };
    }

    revalidateTag('expense-list', 'max');
    revalidatePath('/admin/expenses', 'page');
    revalidatePath('/admin', 'layout');

    return {};
  } catch (err: any) {
    console.error('Update Expense Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function deleteExpense(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'administrator') {
      return { error: 'Only administrators can delete expenses' };
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete Expense Error:', error);
      return { error: error.message || 'Failed to delete expense' };
    }

    revalidateTag('expense-list', 'max');
    revalidatePath('/admin/expenses', 'page');
    revalidatePath('/admin', 'layout');

    return {};
  } catch (err: any) {
    console.error('Delete Expense Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

// CATEGORY ACTIONS

export async function createExpenseCategory(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'administrator' && profile?.role !== 'manager') {
      return { error: 'Insufficient permissions' };
    }

    const name = formData.get('name') as string;
    const icon = formData.get('icon') as string;
    const color = formData.get('color') as string;

    if (!name || !name.trim()) return { error: 'Category name is required' };
    if (!icon || !icon.trim()) return { error: 'Icon is required' };
    if (!color || !color.trim()) return { error: 'Color is required' };

    const { error } = await supabase
      .from('expense_categories')
      .insert({ 
        name: name.trim(),
        icon: icon.trim(),
        color: color.trim()
      });

    if (error) {
      console.error('Create Category Error:', error);
      return { error: error.message || 'Failed to create category' };
    }

    revalidateTag('expense-categories', 'max');
    revalidateTag('expense-list', 'max');

    return {};
  } catch (err: any) {
    console.error('Create Category Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function updateExpenseCategory(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'administrator' && profile?.role !== 'manager') {
      return { error: 'Insufficient permissions' };
    }

    const name = formData.get('name') as string;
    const icon = formData.get('icon') as string;
    const color = formData.get('color') as string;

    if (!name || !name.trim()) return { error: 'Category name is required' };
    if (!icon || !icon.trim()) return { error: 'Icon is required' };
    if (!color || !color.trim()) return { error: 'Color is required' };

    const { error } = await supabase
      .from('expense_categories')
      .update({ 
        name: name.trim(),
        icon: icon.trim(),
        color: color.trim()
      })
      .eq('id', id);

    if (error) {
      console.error('Update Category Error:', error);
      return { error: error.message || 'Failed to update category' };
    }

    revalidateTag('expense-categories', 'max');
    revalidateTag('expense-list', 'max');

    return {};
  } catch (err: any) {
    console.error('Update Category Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function deleteExpenseCategory(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'administrator') {
      return { error: 'Only administrators can delete categories' };
    }

    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        return { error: 'Cannot delete a category that has expenses. Reassign or delete those expenses first.' };
      }
      console.error('Delete Category Error:', error);
      return { error: error.message || 'Failed to delete category' };
    }

    revalidateTag('expense-categories', 'max');
    revalidateTag('expense-list', 'max');

    return {};
  } catch (err: any) {
    console.error('Delete Category Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}
