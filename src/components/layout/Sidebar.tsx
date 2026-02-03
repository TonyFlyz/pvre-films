'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  imageCount: number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [videoCount, setVideoCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    // Fetch categories with image counts and videos
    Promise.all([
      fetch('/api/categories').then((res) => res.json()),
      fetch('/api/images').then((res) => res.json()),
      fetch('/api/videos?published=true').then((res) => res.json()).catch(() => []),
    ])
      .then(([categoriesData, imagesData, videosData]) => {
        // Count images per category
        const counts: Record<string, number> = {};
        if (Array.isArray(imagesData)) {
          imagesData.forEach((img: any) => {
            const catId = img.category_id || img.categoryId;
            if (catId) {
              counts[catId] = (counts[catId] || 0) + 1;
            }
          });
        }

        // Add counts to categories
        const categoriesWithCounts = (categoriesData || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          imageCount: counts[cat.id] || 0,
        }));

        setCategories(categoriesWithCounts);
        setVideoCount(Array.isArray(videosData) ? videosData.length : 0);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching sidebar data:', error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();

    // Listen for data changes (triggered after uploads/deletes)
    const handleDataChange = () => fetchData();
    window.addEventListener('sidebarRefresh', handleDataChange);

    return () => {
      window.removeEventListener('sidebarRefresh', handleDataChange);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const closeMobileMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-white">
            <h1 className="text-lg font-semibold tracking-wide">PVRE.FILMS</h1>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-white p-2"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/80 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-[280px] bg-black z-50
          flex flex-col py-12 px-8
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo & Tagline */}
        <div className="mb-8">
          <Link href="/" onClick={closeMobileMenu}>
            <h1 className="text-lg font-semibold tracking-wide text-white mb-1">
              PVRE.FILMS
            </h1>
            <p className="text-xs text-zinc-500 tracking-wide">
              Photographer / Filmmaker
            </p>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          {/* Divider after logo */}
          <div className="mb-6 border-t border-zinc-900" />

          {/* Photos Section */}
          <div className="mb-6">
            <h2 className="text-xs text-zinc-600 uppercase tracking-wider mb-4">Photos</h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-xs text-zinc-600">Loading...</div>
              ) : (
                categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/gallery?category=${category.slug}`}
                    onClick={closeMobileMenu}
                    className={`
                      block text-sm transition-colors duration-200
                      ${
                        pathname.includes(`category=${category.slug}`)
                          ? 'text-white'
                          : 'text-zinc-500 hover:text-white'
                      }
                    `}
                  >
                    {category.name}{' '}
                    <span className="text-zinc-600">({category.imageCount})</span>
                  </Link>
                ))
              )}
              <Link
                href="/gallery"
                onClick={closeMobileMenu}
                className={`
                  block text-sm transition-colors duration-200
                  ${pathname === '/gallery' && !pathname.includes('category=') ? 'text-white' : 'text-zinc-500 hover:text-white'}
                `}
              >
                All Images
              </Link>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-zinc-900" />

          {/* Videos Section */}
          <div className="mb-6">
            <h2 className="text-xs text-zinc-600 uppercase tracking-wider mb-4">Videos</h2>
            <Link
              href="/#videos"
              onClick={closeMobileMenu}
              className="block text-sm text-zinc-500 hover:text-white transition-colors duration-200"
            >
              View Videos {videoCount > 0 && <span className="text-zinc-600">({videoCount})</span>}
            </Link>
          </div>

          {/* Divider */}
          <div className="mb-6 border-t border-zinc-900" />

          {/* About & Contact Section */}
          <div className="space-y-3">
            <Link
              href="/#about"
              onClick={closeMobileMenu}
              className="block text-sm text-zinc-500 hover:text-white transition-colors duration-200"
            >
              About
            </Link>
            <Link
              href="/#contact"
              onClick={closeMobileMenu}
              className="block text-sm text-zinc-500 hover:text-white transition-colors duration-200"
            >
              Contact
            </Link>
          </div>
        </nav>

        {/* Contact Info */}
        <div className="mt-auto pt-8 border-t border-zinc-900">
          <div className="space-y-2 text-xs text-zinc-600">
            <p>
              <a
                href="mailto:contact@pvre.films"
                className="hover:text-zinc-400 transition-colors"
              >
                contact@pvre.films
              </a>
            </p>
            <p>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-400 transition-colors"
              >
                Instagram
              </a>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
