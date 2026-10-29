import { createPortal } from 'react-dom';
import type { PickerKind } from '../lib/picker';

/** Immediate feedback while the camera or photo picker starts. Portalled so it floats above the tab bar. */
export function PickerToast({ kind }: { kind?: PickerKind }) {
  if (!kind) return null;
  return createPortal(
    <div className="picker-toast" role="status">
      <span className="spinner" aria-hidden />
      {kind === 'camera' ? 'Opening camera…' : 'Opening your photos…'}
    </div>,
    document.body,
  );
}
