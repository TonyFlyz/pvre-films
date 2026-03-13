'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  imageCount: number;
}

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [videoCount, setVideoCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

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
          parent_id: cat.parent_id || null,
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
            <h1 className="text-lg font-semibold tracking-wide">PVRE.FILM</h1>
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
              PVRE.FILM
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
            <div className="space-y-1">
              {loading ? (
                <div className="text-xs text-zinc-600">Loading...</div>
              ) : (
                (() => {
                  const parentCategories = categories.filter((c) => !c.parent_id);
                  const childrenOf = (parentId: string) =>
                    categories.filter((c) => c.parent_id === parentId);

                  return parentCategories.map((parent) => {
                    const children = childrenOf(parent.id);
                    const isExpanded = expandedParents.has(parent.id);
                    const hasChildren = children.length > 0;

                    return (
                      <div key={parent.id}>
                        <div className="flex items-center">
                          {hasChildren ? (
                            <button
                              onClick={() => {
                                setExpandedParents((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(parent.id)) {
                                    next.delete(parent.id);
                                  } else {
                                    next.add(parent.id);
                                  }
                                  return next;
                                });
                              }}
                              className="text-zinc-600 hover:text-zinc-400 mr-1 p-0.5"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : (
                            <span className="w-[22px]" />
                          )}
                          <Link
                            href={`/gallery?category=${encodeURIComponent(parent.slug.trim())}`}
                            onClick={closeMobileMenu}
                            className={`
                              block text-sm py-1 transition-colors duration-200
                              ${categoryParam === parent.slug.trim() ? 'text-white' : 'text-zinc-500 hover:text-white'}
                            `}
                          >
                            {parent.name}{' '}
                            <span className="text-zinc-600">({parent.imageCount})</span>
                          </Link>
                        </div>
                        {hasChildren && isExpanded && (
                          <div className="ml-[22px] space-y-1">
                            {children.map((child) => (
                              <Link
                                key={child.id}
                                href={`/gallery?category=${encodeURIComponent(child.slug.trim())}`}
                                onClick={closeMobileMenu}
                                className={`
                                  block text-sm py-1 pl-2 border-l border-zinc-800 transition-colors duration-200
                                  ${categoryParam === child.slug.trim() ? 'text-white' : 'text-zinc-500 hover:text-white'}
                                `}
                              >
                                {child.name}{' '}
                                <span className="text-zinc-600">({child.imageCount})</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()
              )}
              <Link
                href="/gallery"
                onClick={closeMobileMenu}
                className={`
                  block text-sm py-1 ml-[22px] transition-colors duration-200
                  ${pathname === '/gallery' && !categoryParam ? 'text-white' : 'text-zinc-500 hover:text-white'}
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
              href="/about"
              onClick={closeMobileMenu}
              className={`
                block text-sm transition-colors duration-200
                ${isActive('/about') ? 'text-white' : 'text-zinc-500 hover:text-white'}
              `}
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={closeMobileMenu}
              className={`
                block text-sm transition-colors duration-200
                ${isActive('/contact') ? 'text-white' : 'text-zinc-500 hover:text-white'}
              `}
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

export default function Sidebar() {
  return (
    <Suspense fallback={null}>
      <SidebarContent />
    </Suspense>
  );
}
