'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  cover_image?: string;
  imageCount: number;
}

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

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [allImagesCover, setAllImagesCover] = useState<string | null>(null);
  const [totalImages, setTotalImages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/images').then((res) => res.json()),
      fetch('/api/videos?published=true').then((res) => res.json()).catch(() => []),
      fetch('/api/settings').then((res) => res.json()).catch(() => ({})),
    ])
      .then(([categoriesData, imagesData, videosData, settingsData]) => {
        const images = Array.isArray(imagesData) ? imagesData : [];
        setTotalImages(images.length);

        // Set all images cover from settings or first image
        if (settingsData.all_images_cover) {
          setAllImagesCover(settingsData.all_images_cover);
        } else if (images.length > 0) {
          const firstImg = images[0];
          setAllImagesCover(firstImg.storage_path || firstImg.thumbnail_path);
        }

        if (!Array.isArray(categoriesData)) {
          setCategories([]);
          setLoading(false);
          return;
        }

        // Count images per category
        const imagesByCategory: Record<string, any[]> = {};
        images.forEach((img: any) => {
          const catId = img.category_id || img.categoryId;
          if (catId) {
            if (!imagesByCategory[catId]) {
              imagesByCategory[catId] = [];
            }
            imagesByCategory[catId].push(img);
          }
        });

        // Build categories with data
        const categoriesWithData: Category[] = categoriesData.map((cat: any) => {
          const catImages = imagesByCategory[cat.id] || [];
          const firstImage = catImages[0];
          // Use category cover_image if set, otherwise use first image
          let coverImage = cat.cover_image;
          if (!coverImage && firstImage) {
            coverImage = firstImage.thumbnail_path || firstImage.storage_path;
          }

          return {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            cover_image: coverImage,
            imageCount: catImages.length,
          };
        });

        setCategories(categoriesWithData);
        setVideos(Array.isArray(videosData) ? videosData : []);
        setSettings(settingsData || {});
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-xs text-zinc-600 tracking-widest uppercase">Loading</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="p-6 lg:p-12">
        {/* Section 1: Categories List with Descriptions */}
        {categories.length > 0 && (
          <section className="mb-16">
            <div className="space-y-6">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/gallery?category=${category.slug}`}
                  className="block group"
                >
                  <h2 className="text-xl lg:text-2xl text-white font-light tracking-wide group-hover:text-zinc-400 transition-colors">
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
                      {category.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Divider */}
        <div className="border-t border-zinc-900 my-12" />

        {/* Section 2: Categories Grid with Cover Images */}
        {categories.length > 0 && (
          <section className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {categories.filter(c => c.cover_image || c.imageCount > 0).map((category) => (
                <Link
                  key={category.id}
                  href={`/gallery?category=${category.slug}`}
                  className="group relative aspect-[4/3] bg-zinc-900 overflow-hidden"
                >
                  {category.cover_image ? (
                    <Image
                      src={category.cover_image}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-zinc-700 text-sm">No cover image</span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
                    <div className="p-4 lg:p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <h3 className="text-white text-sm font-medium tracking-wide">
                        {category.name}
                      </h3>
                      <p className="text-zinc-400 text-xs mt-1">
                        {category.imageCount} {category.imageCount === 1 ? 'image' : 'images'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}

              {/* All Images Card */}
              <Link
                href="/gallery"
                className="group relative aspect-[4/3] bg-zinc-900 overflow-hidden"
              >
                {allImagesCover ? (
                  <Image
                    src={allImagesCover}
                    alt="All Images"
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-zinc-800" />
                )}

                {/* Always visible overlay for All Images */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <h3 className="text-white text-lg font-light tracking-wide">
                      All Images
                    </h3>
                    <p className="text-zinc-400 text-xs mt-2">
                      {totalImages} {totalImages === 1 ? 'image' : 'images'}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Divider before Videos */}
        {videos.length > 0 && (
          <>
            <div className="border-t border-zinc-900 my-12" />

            {/* Section 3: Videos */}
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

        {/* Empty State */}
        {categories.length === 0 && videos.length === 0 && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <p className="text-zinc-600 text-sm">No content yet</p>
              <p className="text-zinc-700 text-xs mt-2">
                Add categories, images, and videos in the admin panel
              </p>
            </div>
          </div>
        )}

        {/* Divider before About */}
        <div className="border-t border-zinc-900 my-12" />

        {/* Section 4: About */}
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

        {/* Section 5: Contact */}
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
    </div>
  );
}
