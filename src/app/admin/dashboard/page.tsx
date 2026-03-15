'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Image as ImageIcon, FolderOpen, Settings as SettingsIcon, Video, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { Image as ImageType, Category } from '@/types';

interface VideoType {
  id: string;
  title: string;
  is_published: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [images, setImages] = useState<ImageType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [pendingThreadCount, setPendingThreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/images').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/videos').then((res) => res.json()).catch(() => []),
      fetch('/api/thread?status=pending').then((res) => res.json()).catch(() => []),
    ])
      .then(([imagesData, categoriesData, videosData, threadData]) => {
        setImages(Array.isArray(imagesData) ? imagesData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setVideos(Array.isArray(videosData) ? videosData : []);
        setPendingThreadCount(Array.isArray(threadData) ? threadData.length : 0);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        router.push('/admin/login');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const getImageSrc = (image: any) => {
    return image.thumbnail_path || image.thumbnailUrl || image.storage_path || image.imageUrl;
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
      {/* Admin Header */}
      <header className="border-b border-zinc-900">
        <div className="px-6 lg:px-12 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-light text-white tracking-wide">Dashboard</h1>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-xs text-zinc-600 hover:text-white transition-colors"
              >
                View Site
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs text-zinc-600 hover:text-white transition-colors"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="px-6 lg:px-12 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          <div className="p-6 border border-zinc-900">
            <p className="text-xs text-zinc-600 mb-2">Images</p>
            <p className="text-2xl font-light text-white">{images.length}</p>
          </div>
          <div className="p-6 border border-zinc-900">
            <p className="text-xs text-zinc-600 mb-2">Categories</p>
            <p className="text-2xl font-light text-white">{categories.length}</p>
          </div>
          <div className="p-6 border border-zinc-900">
            <p className="text-xs text-zinc-600 mb-2">Videos</p>
            <p className="text-2xl font-light text-white">{videos.length}</p>
          </div>
          <div className="p-6 border border-zinc-900">
            <p className="text-xs text-zinc-600 mb-2">Published</p>
            <p className="text-2xl font-light text-white">
              {images.filter((img) => img.isPublished).length}
            </p>
          </div>
          <div className="p-6 border border-zinc-900">
            <p className="text-xs text-zinc-600 mb-2">Pending Messages</p>
            <p className="text-2xl font-light text-white">{pendingThreadCount}</p>
          </div>
        </div>

        {/* Recent Images */}
        {images.length > 0 && (
          <div className="mb-12">
            <h2 className="text-sm text-zinc-600 mb-4">Recent Images</h2>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {images.slice(0, 6).map((image) => (
                <div key={image.id} className="relative aspect-square bg-zinc-900 overflow-hidden">
                  <Image
                    src={getImageSrc(image)}
                    alt={image.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 16vw"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm text-zinc-600 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href="/admin/images"
              className="p-6 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <ImageIcon size={20} className="text-zinc-600 group-hover:text-white mb-3 transition-colors" />
              <h3 className="text-sm text-white mb-1">Manage Images</h3>
              <p className="text-xs text-zinc-600">
                Upload and organize portfolio images
              </p>
            </Link>

            <Link
              href="/admin/categories"
              className="p-6 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <FolderOpen size={20} className="text-zinc-600 group-hover:text-white mb-3 transition-colors" />
              <h3 className="text-sm text-white mb-1">Manage Categories</h3>
              <p className="text-xs text-zinc-600">
                Create and organize categories
              </p>
            </Link>

            <Link
              href="/admin/videos"
              className="p-6 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <Video size={20} className="text-zinc-600 group-hover:text-white mb-3 transition-colors" />
              <h3 className="text-sm text-white mb-1">Manage Videos</h3>
              <p className="text-xs text-zinc-600">
                Add YouTube videos
              </p>
            </Link>

            <Link
              href="/admin/settings"
              className="p-6 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <SettingsIcon size={20} className="text-zinc-600 group-hover:text-white mb-3 transition-colors" />
              <h3 className="text-sm text-white mb-1">Site Settings</h3>
              <p className="text-xs text-zinc-600">
                Update contact and social info
              </p>
            </Link>

            <Link
              href="/admin/thread"
              className="p-6 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <MessageCircle size={20} className="text-zinc-600 group-hover:text-white mb-3 transition-colors" />
              <h3 className="text-sm text-white mb-1">Thread Messages</h3>
              <p className="text-xs text-zinc-600">
                Moderate anonymous messages
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
