import { useEffect, useRef, useState } from 'react';

interface Props {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

/** Live camera viewfinder using getUserMedia; prefers the rear camera on phones. */
export function Camera({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err: Error) =>
        setError(err.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'No camera available on this device.'),
      ) ?? setError('Camera is not supported in this browser.');
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => blob && onCapture(blob), 'image/jpeg', 0.9);
  };

  return (
    <div className="camera" role="dialog" aria-label="Camera">
      {error ? (
        <div className="camera-error">
          <p>{error}</p>
          <p className="muted">You can still upload a photo instead.</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted onLoadedData={() => setReady(true)} />
          <div className="camera-frame" aria-hidden />
          <p className="camera-hint">Fit the garment — or its care label — inside the frame</p>
        </>
      )}
      <div className="camera-controls">
        <button className="btn ghost light" onClick={onClose}>
          Cancel
        </button>
        {!error && <button className="shutter" onClick={capture} disabled={!ready} aria-label="Take photo" />}
        <span style={{ width: 72 }} />
      </div>
    </div>
  );
}
