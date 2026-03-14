'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Plus, Edit2, Trash2, X, Upload, GripVertical } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  description?: string;
  cover_image?: string;
  display_order?: number;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parent_id: '' as string,
    description: '',
    cover_image: '',
    display_order: 0,
  });

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');

      if (!response.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching categories:', error);
      router.push('/admin/login');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/categories/upload-cover', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (response.ok && result.url) {
        setFormData(prev => ({ ...prev, cover_image: result.url }));
      } else {
        setError(result.error || 'Failed to upload cover image');
      }
    } catch (error) {
      setError('Failed to upload cover image');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const display_order = formData.display_order || categories.length + 1;

      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          slug,
          parent_id: formData.parent_id || null,
          description: formData.description,
          cover_image: formData.cover_image,
          display_order,
        }),
      });

      if (response.ok) {
        await fetchCategories();
        resetForm();
        setShowAddForm(false);
        setEditingId(null);
        window.dispatchEvent(new Event('sidebarRefresh'));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save category');
      }
    } catch (error) {
      setError('Failed to save category');
      console.error('Save error:', error);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id || '',
      description: category.description || '',
      cover_image: category.cover_image || '',
      display_order: category.display_order || 0,
    });
    setEditingId(category.id);
    setShowAddForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Images will need to be reassigned.')) return;

    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });

      if (response.ok) {
        await fetchCategories();
        window.dispatchEvent(new Event('sidebarRefresh'));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete category');
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const oldIndex = categories.findIndex((c) => c.id === draggedId);
    const newIndex = categories.findIndex((c) => c.id === targetId);

    const reordered = [...categories];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    setCategories(reordered);
    setDraggedId(null);
    setDragOverId(null);

    try {
      await fetch('/api/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
      });
      window.dispatchEvent(new Event('sidebarRefresh'));
    } catch (error) {
      console.error('Reorder error:', error);
      await fetchCategories();
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const resetForm = () => {
    setFormData({ name: '', slug: '', parent_id: '', description: '', cover_image: '', display_order: 0 });
    setError('');
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-xs text-zinc-600 tracking-widest uppercase">Loading</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-900">
        <div className="px-6 lg:px-12 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="text-zinc-600 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-lg font-light text-white tracking-wide">Categories</h1>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(!showAddForm);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm hover:bg-zinc-200 transition-colors"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-12 py-8 max-w-2xl">
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="border border-zinc-900 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm text-white">
                {editingId ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="text-zinc-600 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 border border-red-900 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-xs text-zinc-600 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                  placeholder="e.g., Portraits"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-xs text-zinc-600 mb-2">
                  URL Slug
                </label>
                <input
                  type="text"
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                  placeholder="auto-generated from name"
                />
              </div>

              <div>
                <label htmlFor="parent_id" className="block text-xs text-zinc-600 mb-2">
                  Parent Category (for sub-folder)
                </label>
                <select
                  id="parent_id"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                >
                  <option value="" className="bg-black">None (top-level)</option>
                  {categories
                    .filter((c) => !c.parent_id && c.id !== editingId)
                    .map((c) => (
                      <option key={c.id} value={c.id} className="bg-black">
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-xs text-zinc-600 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm resize-none"
                  placeholder="Brief description of this category"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-600 mb-2">Cover Image</label>
                {formData.cover_image ? (
                  <div className="relative w-32 h-32 bg-zinc-900 mb-2">
                    <Image
                      src={formData.cover_image}
                      alt="Cover"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cover_image: '' })}
                      className="absolute top-1 right-1 bg-black/80 text-white p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-800 p-4 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                      id="cover-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="cover-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload size={24} className="text-zinc-700 mb-2" />
                      <p className="text-zinc-600 text-xs">
                        {uploading ? 'Uploading...' : 'Upload cover image'}
                      </p>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="order" className="block text-xs text-zinc-600 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  id="order"
                  value={formData.display_order || ''}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                  placeholder="1"
                  min="1"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-white text-black text-sm hover:bg-zinc-200 transition-colors"
              >
                {editingId ? 'Update Category' : 'Add Category'}
              </button>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div>
          <h2 className="text-sm text-zinc-600 mb-4">All Categories ({categories.length})</h2>

          {categories.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">
              No categories yet. Add your first category to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  draggable
                  onDragStart={() => handleDragStart(category.id)}
                  onDragOver={(e) => handleDragOver(e, category.id)}
                  onDrop={() => handleDrop(category.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-4 border transition-colors cursor-grab active:cursor-grabbing ${
                    dragOverId === category.id
                      ? 'border-white bg-zinc-900/50'
                      : draggedId === category.id
                        ? 'border-zinc-700 opacity-50'
                        : 'border-zinc-900 hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-zinc-700 flex-shrink-0">
                      <GripVertical size={16} />
                    </div>
                    {category.cover_image && (
                      <div className="relative w-12 h-12 bg-zinc-900 flex-shrink-0">
                        <Image
                          src={category.cover_image}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm text-white">
                        {category.parent_id && (
                          <span className="text-zinc-600 mr-1">
                            {categories.find((c) => c.id === category.parent_id)?.name} /
                          </span>
                        )}
                        {category.name}
                      </h3>
                      <p className="text-xs text-zinc-600">/{category.slug}</p>
                      {category.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{category.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-zinc-600 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
