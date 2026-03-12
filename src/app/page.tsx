'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ImageLightbox from '@/components/ui/ImageLightbox';

interface Video {
  id: string;
  title: string;
  youtube_url: string;
  description?: string;
}

interface Settings {
  about_text?: string;
  contact_email?: string;
  phone_number?: string;
  instagram_url?: string;
  facebook_url?: string;
}

// Extract YouTube video ID from URL
function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
}

function HomeContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [videos, setVideos] = useState<Video[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [images, setImages] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('a')?.offsetWidth || 300;
    el.scrollBy({ left: direction === 'left' ? -cardWidth - 24 : cardWidth + 24, behavior: 'smooth' });
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((res) => res.json()).catch(() => []),
      fetch('/api/videos?published=true').then((res) => res.json()).catch(() => []),
      fetch('/api/settings').then((res) => res.json()).catch(() => ({})),
    ])
      .then(([categoriesData, videosData, settingsData]) => {
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setVideos(Array.isArray(videosData) ? videosData : []);
        setSettings(settingsData || {});
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }, []);

  useEffect(() => {
    if (!categoryParam) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const category = categories.find((c: any) => c.slug === categoryParam);
    const categoryId = category?.id;

    if (!categoryId) {
      setImages([]);
      setLoading(false);
      return;
    }

    fetch(`/api/images?categoryId=${categoryId}`)
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
  }, [categoryParam, categories]);

  useEffect(() => {
    updateScrollButtons();
  }, [categories, categoryParam]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-xs text-zinc-600 tracking-widest uppercase">Loading</div>
      </div>
    );
  }

  const getImageSrc = (image: any) => {
    return image.thumbnail_path || image.thumbnailUrl || image.storage_path || image.imageUrl;
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-12">
        {/* Category Cards or Filtered Images */}
        {!categoryParam ? (
          <section className="mb-12">
            <h2 className="text-xl lg:text-2xl text-white font-light tracking-wide mb-8">
              Photos
            </h2>
            {categories.length > 0 ? (
              <div className="relative">
                {/* Scroll buttons (show when more than 3 categories) */}
                {categories.length > 3 && canScrollLeft && (
                  <button
                    onClick={() => scrollBy('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2 transition-colors -ml-4"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={24} strokeWidth={1} />
                  </button>
                )}
                {categories.length > 3 && canScrollRight && (
                  <button
                    onClick={() => scrollBy('right')}
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
                    categories.length > 3
                      ? 'overflow-x-auto scrollbar-hide'
                      : 'flex-wrap'
                  }`}
                  style={categories.length > 3 ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : undefined}
                >
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/?category=${cat.slug}`}
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
              <div className="text-center py-12">
                <p className="text-zinc-600 text-sm">No categories yet</p>
                <p className="text-zinc-700 text-xs mt-2">Add categories in the admin panel</p>
              </div>
            )}
          </section>
        ) : (
          <section className="mb-12">
            <div className="flex items-center gap-4 mb-8">
              <Link
                href="/"
                className="text-zinc-600 hover:text-white transition-colors text-sm"
              >
                &larr; All Categories
              </Link>
              <h2 className="text-xl lg:text-2xl text-white font-light tracking-wide">
                {categories.find((c: any) => c.slug === categoryParam)?.name || 'Category'}
              </h2>
            </div>
            {images.length > 0 ? (
              <div className="columns-1 gap-3 lg:gap-4 max-w-5xl mx-auto">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="mb-3 lg:mb-4 break-inside-avoid group overflow-hidden bg-zinc-900 block cursor-pointer"
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setLightboxOpen(true);
                    }}
                  >
                    <Image
                      src={getImageSrc(image)}
                      alt={image.title}
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-full h-auto transition-all duration-500 group-hover:scale-[1.02] group-hover:opacity-90"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-600 text-sm">No images in this category</p>
              </div>
            )}
          </section>
        )}

        {/* Divider before Videos */}
        {videos.length > 0 && (
          <>
            <div className="border-t border-zinc-900 my-12" />

            {/* Videos */}
            <section id="videos">
              <h2 className="text-xl lg:text-2xl text-white font-light tracking-wide mb-8">
                Videos
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {videos.map((video) => {
                  const videoId = getYouTubeId(video.youtube_url);
                  return (
                    <div key={video.id} className="space-y-3">
                      <div className="relative aspect-video bg-zinc-900">
                        {videoId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-zinc-600 text-sm">Invalid video URL</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white text-sm font-medium">{video.title}</h3>
                        {video.description && (
                          <p className="text-zinc-500 text-xs mt-1">{video.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* Divider before About */}
        <div className="border-t border-zinc-900 my-12" />

        {/* About */}
        <section id="about" className="mb-12">
          <h2 className="text-xl lg:text-2xl text-white font-light tracking-wide mb-8">
            About
          </h2>
          {settings.about_text ? (
            <div className="space-y-4 max-w-2xl">
              {settings.about_text.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-zinc-400 leading-relaxed text-sm lg:text-base">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">
              About information coming soon.
            </p>
          )}
        </section>

        {/* Divider before Contact */}
        <div className="border-t border-zinc-900 my-12" />

        {/* Contact */}
        <section id="contact">
          <h2 className="text-xl lg:text-2xl text-white font-light tracking-wide mb-8">
            Contact
          </h2>
          <div className="space-y-4 text-sm">
            {settings.contact_email && (
              <p>
                <span className="text-zinc-600">Email</span>
                <br />
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  {settings.contact_email}
                </a>
              </p>
            )}
            {settings.phone_number && (
              <p>
                <span className="text-zinc-600">Phone</span>
                <br />
                <a
                  href={`tel:${settings.phone_number}`}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  {settings.phone_number}
                </a>
              </p>
            )}
            {(settings.instagram_url || settings.facebook_url) && (
              <div className="pt-2">
                <span className="text-zinc-600 block mb-2">Social</span>
                <div className="flex gap-4">
                  {settings.instagram_url && (
                    <a
                      href={settings.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                  {settings.facebook_url && (
                    <a
                      href={settings.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                </div>
              </div>
            )}
            {!settings.contact_email && !settings.phone_number && !settings.instagram_url && !settings.facebook_url && (
              <p className="text-zinc-600">
                Contact information coming soon.
              </p>
            )}
          </div>
        </section>
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

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-xs text-zinc-600 tracking-widest uppercase">Loading</div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
