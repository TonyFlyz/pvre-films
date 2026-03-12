'use client';

import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Use storage_path instead of imageUrl to match Supabase schema
  const imageSrc = (currentImage as any).storage_path || (currentImage as any).imageUrl;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button - minimalist X */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors z-20 text-3xl font-light"
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
          className="absolute left-6 text-white/60 hover:text-white transition-colors z-20"
          aria-label="Previous image"
        >
          <ChevronLeft size={40} strokeWidth={1} />
        </button>
      )}

      {/* Navigation - Next */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-6 text-white/60 hover:text-white transition-colors z-20"
          aria-label="Next image"
        >
          <ChevronRight size={40} strokeWidth={1} />
        </button>
      )}

      {/* Image - fills the screen */}
      <div
        className="relative w-full h-full"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
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

      {/* Counter - minimalist */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white/60 text-sm font-light tracking-wider">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
