'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { Image as ImageType } from '@/types';

interface ImageLightboxProps {
  images: ImageType[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function ImageLightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const currentImage = images[currentIndex];
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyPress);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [currentIndex]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const imageSrc = (currentImage as any).storage_path || (currentImage as any).imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 lg:top-6 lg:right-6 text-white/80 hover:text-white transition-colors z-20 text-3xl font-light p-2"
        aria-label="Close"
      >
        ×
      </button>

      {/* Navigation - Previous */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-2 lg:left-6 text-white/60 hover:text-white transition-colors z-20 p-2"
          aria-label="Previous image"
        >
          <ChevronLeft size={32} className="lg:w-10 lg:h-10" strokeWidth={1} />
        </button>
      )}

      {/* Navigation - Next */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-2 lg:right-6 text-white/60 hover:text-white transition-colors z-20 p-2"
          aria-label="Next image"
        >
          <ChevronRight size={32} className="lg:w-10 lg:h-10" strokeWidth={1} />
        </button>
      )}

      {/* Image */}
      <div
        className="relative w-full h-full"
        onClick={onClose}
      >
        <Image
          src={imageSrc}
          alt={currentImage.title}
          fill
          className="object-contain"
          priority
          quality={90}
          sizes="100vw"
        />
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 lg:bottom-6 left-1/2 transform -translate-x-1/2 text-white/60 text-sm font-light tracking-wider">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
