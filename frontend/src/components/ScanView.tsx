import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { prepareImage } from '../lib/image';
import { SAMPLES, urlToBlob } from '../lib/samples';
import { openPicker, usePickerWatch, type PickerKind } from '../lib/picker';
import { PickerToast } from './PickerToast';
import { getThumb, makeThumb, saveThumb } from '../lib/thumbs';
import type { Me, ScanResponse } from '../lib/types';
import { Camera } from './Camera';
import { Icon } from './Icon';

const IS_DEMO = import.meta.env.MODE === 'demo';

interface Photo {
  blob: Blob;
  name: string;
  url: string;
}

interface Props {
  me?: Me;
  onResult: (result: ScanResponse, photos: string[]) => void;
  onOpenScan: (scanId: string) => void;
  onSeeWardrobe: () => void;
  /** A photo taken with the tab bar's Scan button, to load straight into the preview. */
  incoming?: { blob: Blob; name: string };
  onIncomingUsed?: () => void;
  /** The tab bar's Scan button tapped but no camera opened. */
  externalPickerBlocked?: boolean;
}

export function ScanView({ me, onResult, onOpenScan, onSeeWardrobe, incoming, onIncomingUsed, externalPickerBlocked }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const labelFileRef = useRef<HTMLInputElement>(null);
  const labelCaptureRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [cameraFor, setCameraFor] = useState<'garment' | 'label'>();
  const [image, setImage] = useState<Photo>();
  const [label, setLabel] = useState<Photo>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();
  const { blocked: localPickerBlocked, opening, watch: watchPicker, clear: clearPickerWatch } = usePickerWatch();
  const pickerBlocked = localPickerBlocked || externalPickerBlocked;

  const toPhoto = (blob: Blob, name: string): Photo | undefined => {
    if (!blob.type.startsWith('image/')) {
      setError('That file is not an image.');
      return undefined;
    }
    setError(undefined);
    return { blob, name, url: URL.createObjectURL(blob) };
  };

  const chooseGarment = (blob: Blob, name: string) => {
    const photo = toPhoto(blob, name);
    if (!photo) return;
    if (image) URL.revokeObjectURL(image.url);
    setImage(photo);
  };

  const chooseLabel = (blob: Blob, name: string) => {
    const photo = toPhoto(blob, name);
    if (!photo) return;
    if (label) URL.revokeObjectURL(label.url);
    setLabel(photo);
  };

  useEffect(() => {
    if (!incoming) return;
    chooseGarment(incoming.blob, incoming.name);
    onIncomingUsed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const reset = () => {
    if (image) URL.revokeObjectURL(image.url);
    if (label) URL.revokeObjectURL(label.url);
    setImage(undefined);
    setLabel(undefined);
  };

  // On phones the photo pushes the buttons below the fold; bring them into view once a photo is chosen.
  useEffect(() => {
    if (!image) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    actionsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [image, label]);

  const analyse = async () => {
    if (!image) return;
    setBusy(true);
    setError(undefined);
    try {
      const [garmentBlob, labelBlob] = await Promise.all([
        prepareImage(image.blob),
        label ? prepareImage(label.blob) : Promise.resolve(undefined),
      ]);
      const result = await api.scan(garmentBlob, image.name, labelBlob);
      const thumb = await makeThumb(image.blob);
      if (thumb) saveThumb(result.scan.id, thumb);
      onResult(result, label ? [image.url, label.url] : [image.url]);
      setImage(undefined);
      setLabel(undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // The full app shows a live viewfinder. The hosted demo can't open the camera itself, so its camera buttons are
  // <label>s for a file input with `capture`, which hands off to the phone's own camera app. A real tap on a label is
  // more reliable inside in-app browsers than clicking a hidden input from script.
  const liveCamera = !IS_DEMO && Boolean(navigator.mediaDevices?.getUserMedia);

  const fileInput = (id: string, ref: React.RefObject<HTMLInputElement | null>, onPick: (f: File) => void, capture?: boolean) => (
    <input
      id={id}
      ref={ref}
      type="file"
      accept="image/*"
      capture={capture ? 'environment' : undefined}
      className="visually-hidden"
      tabIndex={-1}
      onChange={(e) => {
        clearPickerWatch();
        const file = e.target.files?.[0];
        if (file) onPick(file);
        e.target.value = '';
      }}
    />
  );

  // The first item of each recent scan, newest first.
  const recent = (me?.recentScans ?? [])
    .filter((s) => s.items.length > 0)
    .slice(0, 8)
    .map((s) => ({ id: s.id, item: s.items[0], thumb: getThumb(s.id) }));

  return (
    <section className="scan-layout">
      <div className="scan-intro">
        <p className="eyebrow">Clothing carbon scanner</p>
        <h1 className="hero-title">
          What’s the{' '}
          <span className="stitched">
            footprint
            <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
              <path d="M2 8 C 40 2, 80 12, 120 6 S 180 4, 198 7" />
            </svg>
          </span>{' '}
          of your clothes?
        </h1>
        <p className="lede">
          Snap a garment and its care label. We’ll estimate its carbon footprint, show greener options, and reward you for
          lower-impact choices.
        </p>

        {recent.length > 0 && (
          <div className="wardrobe-row">
            <div className="wardrobe-row-head">
              <h3>Your wardrobe</h3>
              <button className="link-btn" onClick={onSeeWardrobe}>
                See all <Icon name="arrow" size={16} />
              </button>
            </div>
            <ul>
              {recent.map(({ id, item, thumb }) => (
                <li key={id}>
                  <button className="garment-chip" onClick={() => onOpenScan(id)} title={item.name}>
                    <span className="garment-photo">
                      {thumb ? <img src={thumb} alt="" /> : <Icon name="hanger" size={24} />}
                      <span className={`garment-grade grade-${item.grade}`}>{item.grade}</span>
                    </span>
                    <span className="garment-name">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="steps">
          <li>
            <span>1</span>Photograph a garment
          </li>
          <li>
            <span>2</span>Add its care label for exact materials
          </li>
          <li>
            <span>3</span>See its grade and earn points
          </li>
        </ol>
      </div>

      <div className="scan-capture">
        {image ? (
          <>
            <div className={`preview ${busy ? 'scanning' : ''}`}>
              <img src={image.url} alt="Selected clothing" />
              {busy && (
                <>
                  <div className="scanline" aria-hidden />
                  <div className="scan-status" role="status">
                    <span className="dot" /> {label ? 'Reading the fabric and label…' : 'Reading the fabric…'}
                  </div>
                </>
              )}
            </div>

            {label ? (
              <div className="label-card attached">
                <img src={label.url} alt="Care label" />
                <div className="grow">
                  <strong>Care label added</strong>
                  <span className="muted small block">Materials will be read from the label.</span>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => {
                    URL.revokeObjectURL(label.url);
                    setLabel(undefined);
                  }}
                  disabled={busy}
                  aria-label="Remove care label photo"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="label-card">
                <span className="label-card-icon" aria-hidden>
                  <Icon name="thread" size={22} />
                </span>
                <div className="grow">
                  <strong>Add the care label</strong>
                  <span className="muted small block">Optional. Gives an exact material breakdown.</span>
                </div>
                <PickButton
                  kind="camera"
                  onOpen={watchPicker}
                  inputId="pick-label-camera"
                  className="btn small"
                  disabled={busy}
                  label="Photograph the care label"
                  onClick={liveCamera ? () => setCameraFor('label') : undefined}
                >
                  <Icon name="camera" size={16} />
                </PickButton>
                <PickButton
                  kind="photos"
                  onOpen={watchPicker}
                  inputId="pick-label-file"
                  className="btn small"
                  disabled={busy}
                  label="Upload a care label photo"
                >
                  <Icon name="upload" size={16} />
                </PickButton>
              </div>
            )}
          </>
        ) : (
          <div
            className={`dropzone ${dragging ? 'over' : ''}`}
            onClick={(e) => {
              // Tapping the area itself (not one of its buttons) opens the photo picker.
              if ((e.target as HTMLElement).closest('button')) return;
              if (watchPicker('photos')) openPicker('pick-garment-file');
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) chooseGarment(file, file.name);
            }}
          >
            <svg className="seam" aria-hidden>
              <rect x="0" y="0" width="100%" height="100%" rx="21" ry="21" />
            </svg>
            <div className="dropzone-icon" aria-hidden>
              <Icon name="hanger" size={34} />
            </div>
            <p className="dropzone-title">Scan a garment</p>
            <p className="scan-reward-hint">
              <Icon name="spark" size={14} /> Every scan earns points. Second-hand finds earn the most.
            </p>
            <p className="muted small">Drop a photo here, or</p>
            <div className="row wrap">
              <PickButton
                kind="camera"
                onOpen={watchPicker}
                inputId="pick-garment-camera"
                className="btn primary"
                onClick={liveCamera ? () => setCameraFor('garment') : undefined}
              >
                <Icon name="camera" size={18} /> Take photo
              </PickButton>
              <PickButton kind="photos" onOpen={watchPicker} inputId="pick-garment-file" className="btn">
                <Icon name="upload" size={18} /> Upload
              </PickButton>
            </div>
          </div>
        )}

        {fileInput('pick-garment-file', fileRef, (f) => chooseGarment(f, f.name))}
        {fileInput('pick-garment-camera', captureRef, (f) => chooseGarment(f, f.name), true)}
        {fileInput('pick-label-file', labelFileRef, (f) => chooseLabel(f, f.name))}
        {fileInput('pick-label-camera', labelCaptureRef, (f) => chooseLabel(f, f.name), true)}

        {!image && (
          <div className="samples">
            <p className="eyebrow">No clothes to hand? Try a sample</p>
            <div className="sample-row">
              {SAMPLES.map((s) => (
                <button
                  key={s.file}
                  className="sample"
                  onClick={async () => {
                    try {
                      chooseGarment(await urlToBlob(s.src), s.file);
                    } catch {
                      setError('Could not load that sample photo.');
                    }
                  }}
                >
                  <img src={s.src} alt="" loading="lazy" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
            <p className="credit">
              Sample photos from the public-domain{' '}
              <a href="https://github.com/alexeygrigorev/clothing-dataset" target="_blank" rel="noreferrer">
                clothing dataset
              </a>{' '}
              (CC0).
            </p>
          </div>
        )}

        <PickerToast kind={opening} />
        {pickerBlocked && (
          <div className="banner picker-help" role="alert">
            <strong>Nothing opened?</strong> This app’s built-in viewer can’t open your camera or photos. Open this page in Chrome
            or Safari (signed in to claude.ai) to take photos. The samples below still work here.
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {busy && !image?.name.startsWith('sample-') && (
          <p className="muted small center-text">AI analysis can take up to a minute.</p>
        )}

        {image && (
          <div className="row scan-actions" ref={actionsRef}>
            <button className="btn" onClick={reset} disabled={busy}>
              Retake
            </button>
            <button className="btn primary grow" onClick={analyse} disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden /> Analysing…
                </>
              ) : (
                <>
                  Analyse footprint <Icon name="arrow" size={18} />
                </>
              )}
            </button>
          </div>
        )}

        <ul className="hints">
          <li>
            <Icon name="bulb" size={18} /> Adding the care label gives the most accurate material breakdown.
          </li>
          <li>
            <Icon name="scan" size={18} /> Several items in one photo? We’ll score each of them.
          </li>
        </ul>
      </div>

      {cameraFor && (
        <Camera
          onClose={() => setCameraFor(undefined)}
          onCapture={(blob) => {
            const target = cameraFor;
            setCameraFor(undefined);
            if (target === 'label') chooseLabel(blob, `label-${Date.now()}.jpg`);
            else chooseGarment(blob, `camera-${Date.now()}.jpg`);
          }}
        />
      )}
    </section>
  );
}

interface PickButtonProps {
  inputId: string;
  className: string;
  children: React.ReactNode;
  /** Accessible name when the content is icon-only. */
  label?: string;
  disabled?: boolean;
  /** When set, the control is a plain button running this handler instead of opening the file picker. */
  onClick?: () => void;
  /** Starts watching the picker; returns false when one is already opening (a repeat tap). */
  onOpen: (kind: PickerKind) => boolean;
  kind: PickerKind;
}

/** Opens a file input's picker on tap, or runs `onClick` when given (the full app's live camera). */
function PickButton({ inputId, className, children, label, disabled, onClick, onOpen, kind }: PickButtonProps) {
  return (
    <button
      className={className}
      disabled={disabled}
      aria-label={label}
      onClick={() => {
        if (onClick) return onClick();
        if (onOpen(kind)) openPicker(inputId);
      }}
    >
      {children}
    </button>
  );
}
