import { Category, GetMenuParams, Menu } from "@/type";
import { supabase } from "./supabase";

export const getMenu = async ({ category, query }: GetMenuParams): Promise<Menu[]> => {
  try {
    let queryBuilder = supabase
      .from('menus')
      .select('*')
    
    // Filter by category if provided
    if (category) {
      queryBuilder = queryBuilder.eq('category_id', category)
    }
    
    // Search by name if query provided
    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`)
    }
    
    const { data, error } = await queryBuilder
    
    if (error) throw error
    
    return data || []
  } catch (e) {
    throw new Error((e as Error).message)
  }
}

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
    
    if (error) throw error
    return data || []
  } catch (e) {
    throw new Error((e as Error).message)
  }
}