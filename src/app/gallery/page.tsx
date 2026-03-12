'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Image as ImageType } from '@/types';
import ImageLightbox from '@/components/ui/ImageLightbox';

interface CategoryData {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description?: string;
  cover_image?: string;
}

function GalleryContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [images, setImages] = useState<ImageType[]>([]);
  const [currentCategory, setCurrentCategory] = useState<CategoryData | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Scroll state for sub-category carousel
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollByCard = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('a')?.offsetWidth || 300;
    el.scrollBy({ left: direction === 'left' ? -cardWidth - 24 : cardWidth + 24, behavior: 'smooth' });
  };

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
    if (categories.length === 0) return;

    setLoading(true);
    const category = categories.find((c) => c.slug.trim() === categoryParam?.trim());
    setCurrentCategory(category || null);

    if (!category) {
      setImages([]);
      setLoading(false);
      return;
    }

    // Check if this category has children
    const children = categories.filter((c) => c.parent_id === category.id);

    if (children.length > 0) {
      // Parent category with sub-categories — no images to load
      setImages([]);
      setLoading(false);
    } else {
      // Leaf category — load its images
      fetch(`/api/images?categoryId=${category.id}`)
        .then((res) => res.json())
        .then((data) => {
          setImages(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching images:', error);
          setImages([]);
          setLoading(false);
        });
    }
  }, [categoryParam, categories]);

  useEffect(() => {
    updateScrollButtons();
  }, [currentCategory, categories]);

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

  if (!currentCategory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-zinc-600 text-sm">Category not found</p>
          <Link href="/" className="text-zinc-400 hover:text-white text-sm mt-2 inline-block">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Determine if this is a parent (has children) or leaf category
  const childCategories = categories.filter((c) => c.parent_id === currentCategory.id);
  const isParent = childCategories.length > 0;

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-12">
        {/* Category Title */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-light text-white tracking-wide">
            {currentCategory.name}
          </h1>
          {currentCategory.description && (
            <p className="text-zinc-500 text-sm mt-2">{currentCategory.description}</p>
          )}
        </div>

        {isParent ? (
          /* Sub-category Cards (same carousel style as homepage) */
          <div className="relative">
            {childCategories.length > 3 && canScrollLeft && (
              <button
                onClick={() => scrollByCard('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2 transition-colors -ml-4"
                aria-label="Scroll left"
              >
                <ChevronLeft size={24} strokeWidth={1} />
              </button>
            )}
            {childCategories.length > 3 && canScrollRight && (
              <button
                onClick={() => scrollByCard('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2 transition-colors -mr-4"
                aria-label="Scroll right"
              >
                <ChevronRight size={24} strokeWidth={1} />
              </button>
            )}

            <div
              ref={scrollRef}
              onScroll={updateScrollButtons}
              className={`flex gap-6 ${
                childCategories.length > 3
                  ? 'overflow-x-auto scrollbar-hide'
                  : 'flex-wrap'
              }`}
              style={childCategories.length > 3 ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
            >
              {childCategories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/gallery?category=${encodeURIComponent(cat.slug.trim())}`}
                  className="group flex-shrink-0 w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                >
                  <div className="relative aspect-[4/3] bg-zinc-900 overflow-hidden">
                    {cat.cover_image ? (
                      <Image
                        src={cat.cover_image}
                        alt={cat.name}
                        fill
                        className="object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-80"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-zinc-700 text-sm">No cover</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-white text-sm font-medium">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-zinc-400 text-xs mt-1 line-clamp-1">{cat.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* Leaf Category — Image Gallery */
          <>
            {images.length === 0 ? (
              <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-zinc-600 text-sm">No images in this category</p>
              </div>
            ) : (
              <>
                <p className="text-zinc-600 text-sm mb-6">
                  {images.length} {images.length === 1 ? 'image' : 'images'}
                </p>
                <div className="space-y-0">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative h-[calc(100vh-4rem)] lg:h-screen cursor-pointer group"
                      onClick={() => openLightbox(index)}
                    >
                      <div className="absolute inset-4 lg:inset-8">
                        <Image
                          src={getImageSrc(image)}
                          alt={image.title}
                          fill
                          className="object-contain transition-opacity duration-500 group-hover:opacity-90"
                          sizes="(max-width: 1024px) 100vw, calc(100vw - 280px)"
                          priority={index < 2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

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
