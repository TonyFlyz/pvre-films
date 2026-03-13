'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, X, Trash2, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, Loader, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { Image as ImageType, Category } from '@/types';

export default function AdminImagesPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    categoryId: '',
    isPublished: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');

  // Bulk upload state
  interface BulkFile {
    id: string;
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'done' | 'failed';
    error?: string;
  }
  const [bulkFiles, setBulkFiles] = useState<BulkFile[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkFolder, setBulkFolder] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  // Drag reorder state
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [imagesRes, categoriesRes] = await Promise.all([
        fetch('/api/images'),
        fetch('/api/categories'),
      ]);

      if (!imagesRes.ok || !categoriesRes.ok) {
        router.push('/admin/login');
        return;
      }

      const imagesData = await imagesRes.json();
      const categoriesData = await categoriesRes.json();

      setImages(Array.isArray(imagesData) ? imagesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      router.push('/admin/login');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isHEIC = file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type === 'image/heic' ||
                   file.type === 'image/heif';

    if (!file.type.startsWith('image/') && !isHEIC) {
      setUploadError('Please select an image file');
      return;
    }

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('Image size must be less than 15MB');
      return;
    }

    setUploadError('');

    if (isHEIC) {
      try {
        setUploadError('Converting HEIC image...');
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9,
        });

        const convertedFile = new File(
          [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob],
          file.name.replace(/\.heic$/i, '.jpg'),
          { type: 'image/jpeg' }
        );

        setSelectedFile(convertedFile);
        setUploadError('');

        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(convertedFile);
      } catch (error) {
        console.error('HEIC conversion error:', error);
        setUploadError('Failed to convert HEIC image.');
      }
    } else {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !uploadData.title || !uploadData.categoryId) {
      setUploadError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('categoryId', uploadData.categoryId);
      formData.append('isPublished', String(uploadData.isPublished));

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadData({ title: '', description: '', categoryId: '', isPublished: true });
        setSelectedFile(null);
        setPreviewUrl(null);
        setShowUploadForm(false);
        await fetchData();
        // Refresh sidebar counts
        window.dispatchEvent(new Event('sidebarRefresh'));
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError('Failed to upload image');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const response = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchData();
        // Refresh sidebar counts
        window.dispatchEvent(new Event('sidebarRefresh'));
      } else {
        alert('Failed to delete image');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete image');
    }
  };

  const togglePublish = async (image: ImageType) => {
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...image, isPublished: !image.isPublished }),
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleImageDragStart = (id: string) => {
    setDraggedImageId(id);
  };

  const handleImageDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedImageId) {
      setDragOverImageId(id);
    }
  };

  const handleImageDrop = async (targetId: string) => {
    if (!draggedImageId || draggedImageId === targetId) {
      setDraggedImageId(null);
      setDragOverImageId(null);
      return;
    }

    const oldIndex = filteredImages.findIndex((img) => img.id === draggedImageId);
    const newIndex = filteredImages.findIndex((img) => img.id === targetId);

    const reordered = [...filteredImages];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic update
    setImages((prev) => {
      const otherImages = prev.filter((img) => !reordered.find((r) => r.id === img.id));
      return [...reordered, ...otherImages];
    });
    setDraggedImageId(null);
    setDragOverImageId(null);

    try {
      await fetch('/api/images/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((img) => img.id) }),
      });
    } catch (error) {
      console.error('Reorder error:', error);
      await fetchData();
    }
  };

  const handleImageDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const generateTitle = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '')       // strip extension
      .replace(/[_-]/g, ' ')          // replace underscores/hyphens with spaces
      .trim();
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const MAX_FILES = 50;
    const currentCount = bulkFiles.length;
    const remaining = MAX_FILES - currentCount;

    if (remaining <= 0) {
      return;
    }

    const filesToAdd = acceptedFiles.slice(0, remaining);
    const newFiles: BulkFile[] = [];

    filesToAdd.forEach((file) => {
      const isHEIC = file.name.toLowerCase().endsWith('.heic') ||
                     file.name.toLowerCase().endsWith('.heif') ||
                     file.type === 'image/heic' ||
                     file.type === 'image/heif';

      const maxSize = 15 * 1024 * 1024;
      if (file.size > maxSize) {
        // Add as failed so user sees which files were rejected
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          file,
          preview: URL.createObjectURL(file),
          status: 'failed',
          error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 15MB)`,
        });
        return;
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
      });
    });

    setBulkFiles((prev) => [...prev, ...newFiles]);
  }, [bulkFiles.length]);

  const removeBulkFile = (id: string) => {
    setBulkFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const convertHEIC = async (file: File): Promise<File> => {
    const heic2any = (await import('heic2any')).default;
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    return new File(
      [Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob],
      file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'),
      { type: 'image/jpeg' }
    );
  };

  const handleBulkUpload = async () => {
    if (!bulkCategory || bulkFiles.length === 0) return;

    setBulkUploading(true);
    const toProcess = bulkFiles.filter((f) => f.status === 'pending' || f.status === 'failed');
    const total = toProcess.length;
    setBulkProgress({ done: 0, total });
    let processed = 0;

    for (let i = 0; i < bulkFiles.length; i++) {
      const bf = bulkFiles[i];
      if (bf.status === 'done') continue; // skip already uploaded

      // Mark as uploading
      setBulkFiles((prev) =>
        prev.map((f) => (f.id === bf.id ? { ...f, status: 'uploading' as const, error: undefined } : f))
      );

      try {
        let fileToUpload = bf.file;
        const isHEIC = bf.file.name.toLowerCase().endsWith('.heic') ||
                       bf.file.name.toLowerCase().endsWith('.heif') ||
                       bf.file.type === 'image/heic' ||
                       bf.file.type === 'image/heif';

        if (isHEIC) {
          fileToUpload = await convertHEIC(bf.file);
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('title', generateTitle(bf.file.name));
        formData.append('categoryId', bulkCategory);
        formData.append('isPublished', 'true');
        if (bulkFolder.trim()) {
          formData.append('folder', bulkFolder.trim());
        }

        const response = await fetch('/api/images/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setBulkFiles((prev) =>
            prev.map((f) => (f.id === bf.id ? { ...f, status: 'done' as const } : f))
          );
        } else {
          const result = await response.json();
          setBulkFiles((prev) =>
            prev.map((f) =>
              f.id === bf.id ? { ...f, status: 'failed' as const, error: result.error || 'Upload failed' } : f
            )
          );
        }
      } catch (error) {
        setBulkFiles((prev) =>
          prev.map((f) =>
            f.id === bf.id ? { ...f, status: 'failed' as const, error: 'Network error' } : f
          )
        );
      }

      processed++;
      setBulkProgress({ done: processed, total });
    }

    setBulkUploading(false);
    await fetchData();
    window.dispatchEvent(new Event('sidebarRefresh'));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
    },
    disabled: bulkUploading,
  });

  const getImageSrc = (image: any) => {
    return image.thumbnail_path || image.thumbnailUrl || image.storage_path || image.imageUrl;
  };

  const getCategoryId = (image: any) => {
    return image.category_id || image.categoryId;
  };

  const filteredImages = filterCategory === 'all'
    ? images
    : images.filter(img => getCategoryId(img) === filterCategory);

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
              <h1 className="text-lg font-light text-white tracking-wide">Images</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-zinc-800">
                <button
                  onClick={() => { setUploadMode('single'); setShowUploadForm(true); }}
                  className={`px-3 py-2 text-xs transition-colors ${
                    uploadMode === 'single' && showUploadForm
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => { setUploadMode('bulk'); setShowUploadForm(true); }}
                  className={`px-3 py-2 text-xs transition-colors ${
                    uploadMode === 'bulk' && showUploadForm
                      ? 'bg-white text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Bulk
                </button>
              </div>
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm hover:bg-zinc-200 transition-colors"
              >
                <Upload size={16} />
                Upload
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-12 py-8">
        {/* Upload Form */}
        {showUploadForm && uploadMode === 'single' && (
          <div className="border border-zinc-900 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm text-white">Upload New Image</h2>
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setUploadError('');
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }}
                className="text-zinc-600 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 border border-red-900 text-red-400 text-sm">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-xs text-zinc-600 mb-2">Image File *</label>
                <div className="border border-dashed border-zinc-800 p-8 text-center hover:border-zinc-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    {previewUrl ? (
                      <div className="relative w-full max-w-xs">
                        <Image src={previewUrl} alt="Preview" width={300} height={200} className="object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setPreviewUrl(null);
                            setSelectedFile(null);
                          }}
                          className="absolute top-2 right-2 bg-black/80 text-white p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={32} className="text-zinc-700 mb-2" />
                        <p className="text-zinc-600 text-sm">Click to upload</p>
                        <p className="text-zinc-700 text-xs mt-1">PNG, JPG, HEIC up to 15MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-xs text-zinc-600 mb-2">Title *</label>
                <input
                  type="text"
                  id="title"
                  required
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                  placeholder="Image title"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs text-zinc-600 mb-2">Description</label>
                <textarea
                  id="description"
                  rows={2}
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm resize-none"
                  placeholder="Optional description"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-xs text-zinc-600 mb-2">Category *</label>
                <select
                  id="category"
                  required
                  value={uploadData.categoryId}
                  onChange={(e) => setUploadData({ ...uploadData, categoryId: e.target.value })}
                  className="w-full px-0 py-2 bg-black border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Publish */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={uploadData.isPublished}
                  onChange={(e) => setUploadData({ ...uploadData, isPublished: e.target.checked })}
                  className="accent-white"
                />
                <label htmlFor="published" className="text-xs text-zinc-400">Publish immediately</label>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-3 bg-white text-black text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </form>
          </div>
        )}

        {/* Bulk Upload Form */}
        {showUploadForm && uploadMode === 'bulk' && (
          <div className="border border-zinc-900 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm text-white">Bulk Upload</h2>
              <button
                onClick={() => {
                  setShowUploadForm(false);
                  setBulkFiles([]);
                  setBulkCategory('');
                  setBulkFolder('');
                }}
                className="text-zinc-600 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-xs text-zinc-600 mb-2">Category *</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full px-0 py-2 bg-black border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                  disabled={bulkUploading}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Folder */}
              <div>
                <label className="block text-xs text-zinc-600 mb-2">Storage Folder</label>
                <input
                  type="text"
                  value={bulkFolder}
                  onChange={(e) => setBulkFolder(e.target.value)}
                  className="w-full px-0 py-2 bg-transparent border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
                  placeholder="e.g. session-1 (optional)"
                  disabled={bulkUploading}
                />
                <p className="text-xs text-zinc-700 mt-1">Letters, numbers, hyphens, underscores only</p>
              </div>

              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border border-dashed p-8 text-center transition-colors cursor-pointer ${
                  isDragActive ? 'border-white bg-zinc-900' : 'border-zinc-800 hover:border-zinc-600'
                } ${bulkUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input {...getInputProps()} />
                <Upload size={32} className="text-zinc-700 mb-2 mx-auto" />
                <p className="text-zinc-600 text-sm">
                  {isDragActive ? 'Drop images here' : 'Drag & drop images, or click to select'}
                </p>
                <p className="text-zinc-700 text-xs mt-1">
                  PNG, JPG, HEIC up to 15MB each — max 50 files
                </p>
              </div>

              {/* File Queue */}
              {bulkFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-600">
                      {bulkFiles.length} file{bulkFiles.length !== 1 ? 's' : ''} queued
                    </span>
                    {!bulkUploading && (
                      <button
                        onClick={() => {
                          bulkFiles.forEach((f) => URL.revokeObjectURL(f.preview));
                          setBulkFiles([]);
                        }}
                        className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {bulkUploading && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Uploading...</span>
                        <span>{bulkProgress.done} / {bulkProgress.total}</span>
                      </div>
                      <div className="w-full h-1 bg-zinc-900">
                        <div
                          className="h-1 bg-white transition-all duration-300"
                          style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto">
                    {bulkFiles.map((bf) => (
                      <div key={bf.id} className="relative group">
                        <div className="aspect-square bg-zinc-900 overflow-hidden">
                          <img
                            src={bf.preview}
                            alt={bf.file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate mt-1">{bf.file.name}</p>
                        <p className="text-[10px] text-zinc-700">{(bf.file.size / 1024 / 1024).toFixed(1)} MB</p>
                        {/* Status overlay */}
                        {bf.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader size={16} className="text-white animate-spin" />
                          </div>
                        )}
                        {bf.status === 'done' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <CheckCircle size={16} className="text-green-400" />
                          </div>
                        )}
                        {bf.status === 'failed' && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center" title={bf.error}>
                            <AlertCircle size={16} className="text-red-400" />
                            {bf.error && (
                              <p className="text-[8px] text-red-300 text-center mt-1 px-1 leading-tight">{bf.error}</p>
                            )}
                          </div>
                        )}
                        {/* Remove button */}
                        {bf.status === 'pending' && !bulkUploading && (
                          <button
                            onClick={() => removeBulkFile(bf.id)}
                            className="absolute top-0.5 right-0.5 bg-black/80 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        )}
                        {/* Retry button for failed */}
                        {bf.status === 'failed' && !bulkUploading && (
                          <button
                            onClick={() =>
                              setBulkFiles((prev) =>
                                prev.map((f) => (f.id === bf.id ? { ...f, status: 'pending' as const, error: undefined } : f))
                              )
                            }
                            className="absolute bottom-0.5 left-0.5 right-0.5 bg-red-900/80 text-red-200 text-[10px] text-center py-0.5"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload All button */}
              <button
                onClick={handleBulkUpload}
                disabled={bulkUploading || bulkFiles.filter((f) => f.status === 'pending').length === 0 || !bulkCategory}
                className="w-full py-3 bg-white text-black text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {bulkUploading
                  ? `Uploading ${bulkProgress.done} / ${bulkProgress.total}...`
                  : `Upload ${bulkFiles.filter((f) => f.status === 'pending' || f.status === 'failed').length} Images`
                }
              </button>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-xs text-zinc-600">Filter:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-0 py-1 bg-black border-b border-zinc-800 focus:border-zinc-600 focus:outline-none text-white text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-700">{filteredImages.length} images</span>
        </div>

        {/* Images Grid */}
        {filteredImages.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm">
            No images found. Upload your first image to get started.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleImageDragStart(image.id)}
                onDragOver={(e) => handleImageDragOver(e, image.id)}
                onDrop={() => handleImageDrop(image.id)}
                onDragEnd={handleImageDragEnd}
                className={`group cursor-grab active:cursor-grabbing transition-all ${
                  dragOverImageId === image.id
                    ? 'ring-2 ring-white scale-[1.02]'
                    : draggedImageId === image.id
                      ? 'opacity-40'
                      : ''
                }`}
              >
                <div className="relative aspect-square bg-zinc-900 overflow-hidden mb-2">
                  <Image
                    src={getImageSrc(image)}
                    alt={image.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  {!image.isPublished && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 text-zinc-400 text-xs">
                      Draft
                    </div>
                  )}
                  <div className="absolute top-2 right-2 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={16} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{image.title}</p>
                    <p className="text-xs text-zinc-600 truncate">
                      {categories.find((c) => c.id === getCategoryId(image))?.name}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => togglePublish(image)}
                      className="p-2 text-zinc-600 hover:text-white transition-colors"
                      title={image.isPublished ? 'Unpublish' : 'Publish'}
                    >
                      {image.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(image.id)}
                      className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
