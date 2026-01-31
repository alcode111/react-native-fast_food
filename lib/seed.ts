import dummyData from './data'
import { supabase } from './supabase'

interface Category {
  name: string
  description: string
}

interface Customization {
  name: string
  price: number
  type: "topping" | "side" | "size" | "crust" | "bread" | "spice" | "base" | "sauce"
}

interface MenuItem {
  name: string
  description: string
  image_url: string
  price: number
  rating: number
  calories: number
  protein: number
  category_name: string
  customizations: string[]
}

interface DummyData {
  categories: Category[]
  customizations: Customization[]
  menu: MenuItem[]
}

const data = dummyData as DummyData

// Clear all rows from a table
async function clearTable(tableName: string): Promise<void> {
  const { data: rows } = await supabase.from(tableName).select('id')
  
  if (rows && rows.length > 0) {
    await supabase
      .from(tableName)
      .delete()
      .in('id', rows.map(r => r.id))
  }
}

// Clear all files from storage bucket
async function clearStorage(): Promise<void> {
  const { data: files } = await supabase.storage.from('assets').list()
  
  if (files && files.length > 0) {
    await supabase.storage
      .from('assets')
      .remove(files.map(f => f.name))
  }
}

// Upload image to Supabase Storage
async function uploadImageToStorage(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl)
  const blob = await response.blob()
  
  const fileName = imageUrl.split("/").pop() || `file-${Date.now()}.jpg`
  
  const { data, error } = await supabase.storage
    .from('assets')
    .upload(fileName, blob, {
      contentType: blob.type,
      upsert: true // Overwrite if exists
    })
  
  if (error) throw error
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(data.path)
  
  return publicUrl
}

async function seed(): Promise<void> {
  console.log('🌱 Starting seed...')
  
  // 1. Clear all tables (reverse order due to foreign keys)
  await clearTable('menu_customizations')
  await clearTable('menus')
  await clearTable('customizations')
  await clearTable('categories')
  await clearStorage()
  
  // 2. Create Categories
  const categoryMap: Record<string, string> = {}
  
  for (const cat of data.categories) {
    const { data: doc, error } = await supabase
      .from('categories')
      .insert(cat)
      .select()
      .single()
    
    if (error) throw error
    categoryMap[cat.name] = doc.id
  }
  
  // 3. Create Customizations
  const customizationMap: Record<string, string> = {}
  
  for (const cus of data.customizations) {
    const { data: doc, error } = await supabase
      .from('customizations')
      .insert({
        name: cus.name,
        price: cus.price,
        type: cus.type,
      })
      .select()
      .single()
    
    if (error) throw error
    customizationMap[cus.name] = doc.id
  }
  
  // 4. Create Menu Items
  const menuMap: Record<string, string> = {}
  
  for (const item of data.menu) {
    // Upload image first
    const uploadedImageUrl = await uploadImageToStorage(item.image_url)
    
    const { data: doc, error } = await supabase
      .from('menus')
      .insert({
        name: item.name,
        description: item.description,
        image_url: uploadedImageUrl,
        price: item.price,
        rating: item.rating,
        calories: item.calories,
        proteins: item.protein,
        category_id: categoryMap[item.category_name], // Foreign key
      })
      .select()
      .single()
    
    if (error) throw error
    menuMap[item.name] = doc.id
    
    // 5. Create menu_customizations (junction table)
    for (const cusName of item.customizations) {
      await supabase
        .from('menu_customizations')
        .insert({
          menu_id: doc.id,
          customization_id: customizationMap[cusName],
        })
    }
  }
  
  console.log('✅ Seeding complete.')
}

export default seed