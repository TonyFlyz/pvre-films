import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Public client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client with service role key for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to upload image to Supabase Storage (server-side, used as fallback)
export async function uploadImageToStorage(file: Buffer, path: string, contentType: string) {
  const { data, error } = await supabaseAdmin.storage
    .from('images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType
    })

  if (error) throw error

  // Get public URL
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('images')
    .getPublicUrl(path)

  return { data, publicUrl }
}

// Create a signed upload URL for direct browser-to-Supabase uploads
export async function createSignedUploadUrl(path: string) {
  const { data, error } = await supabaseAdmin.storage
    .from('images')
    .createSignedUploadUrl(path)

  if (error) throw error

  return { signedUrl: data.signedUrl, token: data.token, path }
}

// Get the public URL for a storage path
export function getStoragePublicUrl(path: string) {
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('images')
    .getPublicUrl(path)

  return publicUrl
}

// Helper function to delete image from Supabase Storage
export async function deleteImageFromStorage(path: string) {
  const { error } = await supabaseAdmin.storage
    .from('images')
    .remove([path])

  if (error) throw error
}

// Database types matching your ACTUAL Supabase schema
export interface Category {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  description?: string
  cover_image?: string
  display_order?: number
  created_at: string
  updated_at: string
}

export interface Image {
  id: string
  title: string
  description?: string
  category?: string
  category_id?: string
  storage_path: string
  thumbnail_path?: string
  display_order: number
  is_featured: boolean
  created_at: string
  updated_at: string
}

// Category database operations
export async function getCategories() {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw error
  return data as Category[]
}

export async function getCategoryById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Category
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data as Category
}

export async function createCategory(category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert([category])
    .select()
    .single()

  if (error) throw error
  return data as Category
}

export async function updateCategory(id: string, updates: Partial<Category>) {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string) {
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Image database operations
export async function getImages(categoryId?: string, featuredOnly = false, limit?: number, offset?: number) {
  let query = supabaseAdmin
    .from('images')
    .select('*', { count: 'exact' })
    .order('display_order', { ascending: true })

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (featuredOnly) {
    query = query.eq('is_featured', true)
  }

  if (limit !== undefined && offset !== undefined) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error, count } = await query

  if (error) throw error
  return { data: data as Image[], total: count ?? (data as Image[]).length }
}

export async function getImageById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('images')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Image
}

export async function createImage(image: Omit<Image, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabaseAdmin
    .from('images')
    .insert([image])
    .select()
    .single()

  if (error) throw error
  return data as Image
}

export async function updateImage(id: string, updates: Partial<Image>) {
  const { data, error } = await supabaseAdmin
    .from('images')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Image
}

export async function deleteImageRecord(id: string) {
  const { error } = await supabaseAdmin
    .from('images')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Settings types and operations
export interface Settings {
  id: string
  site_name: string
  logo_url?: string
  about_text?: string
  contact_email?: string
  phone_number?: string
  instagram_url?: string
  facebook_url?: string
  all_images_cover?: string
  created_at: string
  updated_at: string
}

export async function getSettings() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('*')
    .single()

  if (error) throw error
  return data as Settings
}

export async function updateSettings(updates: Partial<Settings>) {
  const { id, created_at, updated_at, ...fieldsToUpdate } = updates as any
  const { data, error } = await supabaseAdmin
    .from('settings')
    .update(fieldsToUpdate)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Settings
}

// User operations for authentication
export interface User {
  id: string
  email: string
  password: string
  role: string
  created_at: string
  updated_at: string
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) return null
  return data as User
}

// Video types and operations
export interface Video {
  id: string
  title: string
  youtube_url: string
  description?: string
  display_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export async function getVideos(publishedOnly = false) {
  let query = supabaseAdmin
    .from('videos')
    .select('*')
    .order('display_order', { ascending: true })

  if (publishedOnly) {
    query = query.eq('is_published', true)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Video[]
}

export async function getVideoById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Video
}

export async function createVideo(video: Omit<Video, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .insert([video])
    .select()
    .single()

  if (error) throw error
  return data as Video
}

export async function updateVideo(id: string, updates: Partial<Video>) {
  const { data, error } = await supabaseAdmin
    .from('videos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Video
}

export async function deleteVideo(id: string) {
  const { error } = await supabaseAdmin
    .from('videos')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Thread message types and operations
export interface ThreadMessage {
  id: string
  content: string
  status: 'pending' | 'approved'
  created_at: string
}

export async function getThreadMessages(status?: string) {
  let query = supabaseAdmin
    .from('thread_messages')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data as ThreadMessage[]
}

export async function createThreadMessage(content: string) {
  const { data, error } = await supabaseAdmin
    .from('thread_messages')
    .insert([{ content }])
    .select()
    .single()

  if (error) throw error
  return data as ThreadMessage
}

export async function updateThreadMessageStatus(id: string, status: string) {
  const { data, error } = await supabaseAdmin
    .from('thread_messages')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ThreadMessage
}

export async function deleteThreadMessage(id: string) {
  const { error } = await supabaseAdmin
    .from('thread_messages')
    .delete()
    .eq('id', id)

  if (error) throw error
}
