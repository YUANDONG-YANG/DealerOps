import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PHOTO_ALLOWED_TYPES,
  PHOTO_MAX_SIZE,
  PHOTO_PRESETS,
  photosApi,
  presetLabel,
  type PhotoItem,
  type PhotoPreset,
  type PhotoVariant,
} from '../api/photos';
import ConfirmDialog from './ConfirmDialog';
import { describeError } from '../api/errors';

interface Props {
  vehicleId: number;
  /** Called after an upload, enhance, or delete succeeds, e.g. to reload the drawer's audit trail. */
  onChanged?: () => void;
}

function snapshot(cache: Map<number, string>): Record<number, string> {
  const urls: Record<number, string> = {};
  cache.forEach((url, id) => { urls[id] = url; });
  return urls;
}

/** Vehicle photos: upload, enhance a preset, preview either variant, and delete. */
export default function PhotoStudioPanel({ vehicleId, onChanged }: Props) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [enhancing, setEnhancing] = useState<PhotoPreset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [variant, setVariant] = useState<PhotoVariant>('original');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);
  const previewRef = useRef<string | null>(null);
  const thumbRef = useRef(new Map<number, string>());

  const selected = photos.find((p) => p.id === selectedId) ?? null;
  // The preview follows a photo that is still in the list, so a just-deleted id is never requested.
  const previewId = selected?.id ?? null;
  const enhancement = selected?.enhancement ?? null;

  // Object URLs are owned by this component: replacing or dropping one must revoke it.
  const showPreview = useCallback((url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreviewUrl(url);
  }, []);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const r = await photosApi.list(vehicleId);
      if (seq !== seqRef.current) return;
      setPhotos(r.data || []);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(describeError(e, 'load photos'));
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { void load(); }, [load]);

  // Revoke every object URL still held when the panel unmounts.
  useEffect(() => () => {
    const cache = thumbRef.current;
    cache.forEach((url) => URL.revokeObjectURL(url));
    cache.clear();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  }, []);

  // Keep a selection on an existing photo.
  useEffect(() => {
    if (photos.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (selectedId == null || !photos.some((p) => p.id === selectedId)) {
      setSelectedId(photos[0].id);
      setVariant('original');
    }
  }, [photos, selectedId]);

  // Thumbnails: fetch originals through the authenticated client, cache by photo id.
  useEffect(() => {
    const cache = thumbRef.current;
    let changed = false;
    cache.forEach((url, id) => {
      if (!photos.some((p) => p.id === id)) {
        URL.revokeObjectURL(url);
        cache.delete(id);
        changed = true;
      }
    });
    const missing = photos.filter((p) => !cache.has(p.id));
    if (missing.length === 0) {
      if (changed) setThumbs(snapshot(cache));
      return;
    }
    let active = true;
    void (async () => {
      for (const photo of missing) {
        try {
          const r = await photosApi.content(vehicleId, photo.id, 'original');
          if (!active) return;
          cache.set(photo.id, URL.createObjectURL(r.data));
        } catch {
          if (!active) return;
        }
      }
      if (active) setThumbs(snapshot(cache));
    })();
    return () => { active = false; };
  }, [photos, vehicleId]);

  // Large preview: load the selected variant as a blob and render an object URL.
  useEffect(() => {
    if (previewId == null) {
      showPreview(null);
      setPreviewError('');
      return;
    }
    let active = true;
    const wanted: PhotoVariant = variant === 'enhanced' && enhancement ? 'enhanced' : 'original';
    setPreviewLoading(true);
    setPreviewError('');
    photosApi.content(vehicleId, previewId, wanted)
      .then((r) => {
        const url = URL.createObjectURL(r.data);
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        showPreview(url);
      })
      .catch((e) => {
        if (!active) return;
        showPreview(null);
        setPreviewError(describeError(e, 'load this photo'));
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => { active = false; };
  }, [vehicleId, previewId, variant, enhancement, showPreview]);

  function resetFileInput() {
    if (fileRef.current) fileRef.current.value = '';
  }

  async function upload(file: File) {
    if (!PHOTO_ALLOWED_TYPES.includes(file.type)) {
      setError('Photo must be a JPEG or PNG.');
      resetFileInput();
      return;
    }
    if (file.size > PHOTO_MAX_SIZE) {
      setError('Photo must be 2 MB or smaller.');
      resetFileInput();
      return;
    }
    setUploading(true);
    setError('');
    try {
      const r = await photosApi.upload(vehicleId, file);
      await load();
      onChanged?.();
      if (r.data?.id != null) {
        setSelectedId(r.data.id);
        setVariant('original');
      }
    } catch (e) {
      setError(describeError(e, 'upload photo'));
    } finally {
      setUploading(false);
      resetFileInput();
    }
  }

  async function enhance(photoId: number, preset: PhotoPreset) {
    if (enhancing) return;
    setEnhancing(preset);
    setError('');
    try {
      await photosApi.enhance(vehicleId, photoId, preset);
      await load();
      onChanged?.();
      setVariant('enhanced');
    } catch (e) {
      setError(describeError(e, 'enhance photo'));
    } finally {
      setEnhancing(null);
    }
  }

  async function remove(photoId: number) {
    setConfirmDeleteId(null);
    setDeleting(true);
    setError('');
    try {
      await photosApi.delete(vehicleId, photoId);
      await load();
      onChanged?.();
    } catch (e) {
      setError(describeError(e, 'delete photo'));
    } finally {
      setDeleting(false);
    }
  }

  const busy = uploading || enhancing !== null || deleting;

  return (
    <div className="photo-panel">
      <div className="muted" style={{ marginBottom: 8 }}>Image Studio</div>
      {error && <p className="danger-text">{error}</p>}
      {loading && <p className="muted">Loading photos…</p>}

      <label className="btn upload-btn">
        {uploading ? 'Uploading…' : 'Upload photo'}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          disabled={uploading}
        />
      </label>

      {photos.length === 0 && !loading && <p className="muted">No photos.</p>}

      {selected && (
        <>
          <div className="tab-bar" style={{ marginTop: 12, marginBottom: 12 }}>
            <button
              className={`tab-btn${variant === 'original' ? ' active' : ''}`}
              onClick={() => setVariant('original')}
            >
              Original
            </button>
            <button
              className={`tab-btn${variant === 'enhanced' && enhancement ? ' active' : ''}`}
              onClick={() => setVariant('enhanced')}
              disabled={!enhancement}
            >
              Enhanced
            </button>
          </div>

          <div className="card" style={{ padding: 12, textAlign: 'center', minHeight: 180 }}>
            {previewLoading && <p className="muted">Loading photo…</p>}
            {previewError && !previewLoading && <p className="danger-text">{previewError}</p>}
            {previewUrl && !previewLoading && !previewError && (
              <img
                src={previewUrl}
                alt="Vehicle photo"
                style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 10 }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            {PHOTO_PRESETS.map((preset) => (
              <button
                key={preset.value}
                className="btn btn-sm"
                onClick={() => void enhance(selected.id, preset.value)}
                disabled={busy}
              >
                {enhancing === preset.value ? 'Enhancing…' : preset.label}
              </button>
            ))}
            <button
              className="btn btn-sm btn-danger"
              onClick={() => setConfirmDeleteId(selected.id)}
              disabled={busy}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            {enhancement && (
              <span className="tag tag-info">Enhanced · {presetLabel(enhancement)}</span>
            )}
          </div>
        </>
      )}

      <div className="photo-grid">
        {photos.map((p) => (
          thumbs[p.id] ? (
            <img
              key={p.id}
              className="photo-thumb"
              src={thumbs[p.id]}
              alt="Vehicle photo"
              onClick={() => { setSelectedId(p.id); setVariant('original'); }}
              style={p.id === selectedId ? { borderColor: 'var(--accent)' } : undefined}
            />
          ) : (
            <div key={p.id} className="photo-thumb" />
          )
        ))}
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete photo"
        message="Delete this photo? The original and the enhanced copy are both removed. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId !== null) void remove(confirmDeleteId); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
