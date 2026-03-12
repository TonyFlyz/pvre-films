'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Image as ImageType, Category } from '@/types';
import ImageLightbox from '@/components/ui/ImageLightbox';

function GalleryContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [images, setImages] = useState<ImageType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const category = categories.find((c) => c.slug === categoryParam);
    setCurrentCategory(category || null);
    const categoryId = category?.id;

    const url = categoryId
      ? `/api/images?categoryId=${categoryId}`
      : `/api/images`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setImages(data);
        } else {
          setImages([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching images:', error);
        setImages([]);
        setLoading(false);
      });
  }, [categoryParam, categories]);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
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
      {/* Category Title */}
      {currentCategory && (
        <div className="p-6 lg:p-12 pb-0 lg:pb-0">
          <h1 className="text-2xl lg:text-3xl font-light text-white tracking-wide">
            {currentCategory.name}
          </h1>
          <p className="text-zinc-600 text-sm mt-2">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </p>
        </div>
      )}

      {/* Gallery */}
      {images.length === 0 ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <p className="text-zinc-600 text-sm">No images in this category</p>
          </div>
        </div>
      ) : (
        <div>
          {images.map((image, index) => (
            <div
              key={image.id}
              className="h-[calc(100vh-4rem)] lg:h-screen cursor-pointer group flex items-center justify-center"
              onClick={() => openLightbox(index)}
            >
              <Image
                src={getImageSrc(image)}
                alt={image.title}
                width={0}
                height={0}
                sizes="100vw"
                className="max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-500 group-hover:opacity-90"
                priority={index < 2}
              />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={currentImageIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setCurrentImageIndex}
        />
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-xs text-zinc-600 tracking-widest uppercase">Loading</div>
        </div>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}
