import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const CAPTIONS = ['Garment', 'Care label'];

/** Swipeable photos (garment, then care label) with dot indicators. */
export function PhotoCarousel({ photos }: { photos: string[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState<number>();
  if (photos.length === 0) return null;

  const goTo = (i: number) => {
    const track = trackRef.current;
    track?.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className={`carousel ${photos.length > 1 ? 'multi' : ''}`}>
      <div
        className="carousel-track"
        ref={trackRef}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
      >
        {photos.map((src, i) => (
          <figure key={src} className="carousel-slide">
            <button
              className="carousel-zoom"
              onClick={() => setZoomed(i)}
              aria-label={`View ${CAPTIONS[i] ?? 'photo'} full screen`}
            >
              <img src={src} alt={CAPTIONS[i] ?? 'Photo'} />
            </button>
            {photos.length > 1 && <figcaption>{CAPTIONS[i]}</figcaption>}
          </figure>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="carousel-dots" role="tablist" aria-label="Photos">
          {photos.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              aria-label={CAPTIONS[i]}
              className={i === index ? 'on' : ''}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
      {zoomed !== undefined && (
        <Lightbox src={photos[zoomed]} alt={CAPTIONS[zoomed] ?? 'Photo'} onClose={() => setZoomed(undefined)} />
      )}
    </div>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal aria-label={alt} onClick={onClose}>
      <img src={src} alt={alt} />
      <button ref={closeRef} className="lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
    </div>,
    document.body,
  );
}
