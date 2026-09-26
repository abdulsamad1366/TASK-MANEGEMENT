'use client';

import React, { useEffect, useState } from 'react';
import { X, Download, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  title,
  onClose,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!imageUrl) return;

    // Reset zoom & rotation when opening a new image
    setIsZoomed(false);
    setRotation(0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = title || imageUrl.split('/').pop() || 'image-preview.png';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: direct window open
      window.open(imageUrl, '_blank');
    }
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed((prev) => !prev);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fadeIn select-none p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div
        className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between pointer-events-none z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title / Filename */}
        <div className="pointer-events-auto bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs px-3.5 py-1.5 rounded-full font-medium truncate max-w-[280px] sm:max-w-md shadow-lg">
          {title || 'Image Preview'}
        </div>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-black/60 backdrop-blur-md border border-white/10 p-1.5 rounded-full shadow-lg">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={toggleZoom}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition"
            title={isZoomed ? 'Fit to screen' : 'Zoom in'}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Open in new tab */}
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Download */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-full transition"
            title="Download image"
          >
            <Download className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-white/20 mx-0.5" />

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/90 hover:text-white hover:bg-red-500/80 rounded-full transition"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center overflow-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={title || 'Preview'}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease, max-height 0.2s ease, max-width 0.2s ease',
          }}
          className={`rounded-xl shadow-2xl object-contain cursor-pointer transition-all ${
            isZoomed
              ? 'max-h-none max-w-none scale-125'
              : 'max-h-[82vh] max-w-[92vw]'
          }`}
          onClick={toggleZoom}
          title="Click to toggle zoom"
        />
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 text-white/50 text-[11px] font-medium tracking-wide pointer-events-none">
        Press ESC or click anywhere outside to close
      </div>
    </div>
  );
};
