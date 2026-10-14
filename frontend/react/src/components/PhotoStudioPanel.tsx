import { useCallback, useEffect, useRef, useState } from 'react';
import { http } from '../api/http';

interface PhotoItem {
  id: number;
  contentType: string;
  enhanced: boolean;
  createdAt: string;
}

interface Props {
  vehicleId: number;
}

const PRESETS = ['AUTO', 'BRIGHT', 'WARM', 'COOL', 'HIGH_CONTRAST'];
const MAX_SIZE = 3 * 1024 * 1024;

export default function PhotoStudioPanel({ vehicleId }: Props) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [enhancingId, setEnhancingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    setError('');
    try {
      const r = await http.get(`/api/v1/vehicles/${vehicleId}/photos`);
      if (seq !== seqRef.current) return;
      setPhotos(r.data || []);
    } catch {
      if (seq !== seqRef.current) return;
      setError('Could not load photos.');
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { void load(); }, [load]);

  async function upload(file: File) {
    if (file.size > MAX_SIZE) {
      setError('Photo must be 3 MB or smaller.');
      return;
    }
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    try {
      await http.post(`/api/v1/vehicles/${vehicleId}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch {
      setError('Could not upload photo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function enhance(photoId: number, preset: string) {
    setEnhancingId(photoId);
    setError('');
    try {
      await http.post(`/api/v1/vehicles/${vehicleId}/photos/${photoId}/enhance`, { preset });
      await load();
    } catch {
      setError('Could not enhance photo.');
    } finally {
      setEnhancingId(null);
    }
  }

  async function remove(photoId: number) {
    setDeletingId(photoId);
    setError('');
    try {
      await http.delete(`/api/v1/vehicles/${vehicleId}/photos/${photoId}`);
      await load();
    } catch {
      setError('Could not delete photo.');
    } finally {
      setDeletingId(null);
    }
  }

  function viewPhoto(photoId: number, variant: 'original' | 'enhanced') {
    setViewUrl(`/api/v1/vehicles/${vehicleId}/photos/${photoId}/content?variant=${variant}`);
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="muted" style={{ marginBottom: 8 }}>Photos</div>
      {error && <p className="danger-text">{error}</p>}
      {loading && <p className="muted">Loading photos…</p>}

      <div style={{ marginBottom: 12 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          disabled={uploading}
        />
        {uploading && <span className="muted"> Uploading…</span>}
      </div>

      {photos.length === 0 && !loading && <p className="muted">No photos.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {photos.map(p => (
          <div key={p.id} className="card" style={{ padding: 12, minWidth: 200 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button className="btn-link" onClick={() => viewPhoto(p.id, 'original')}>Original</button>
              {p.enhanced && (
                <button className="btn-link" onClick={() => viewPhoto(p.id, 'enhanced')}>Enhanced</button>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{p.createdAt}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select
                className="form-select"
                defaultValue=""
                onChange={e => {
                  if (e.target.value) void enhance(p.id, e.target.value);
                  e.target.value = '';
                }}
                disabled={enhancingId === p.id}
              >
                <option value="" disabled>{enhancingId === p.id ? 'Enhancing…' : 'Enhance'}</option>
                {PRESETS.map(pr => (
                  <option key={pr} value={pr}>{pr.replace(/_/g, ' ').toLowerCase()}</option>
                ))}
              </select>
              <button
                className="btn-link danger"
                onClick={() => remove(p.id)}
                disabled={deletingId === p.id}
              >
                {deletingId === p.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewUrl && (
        <div className="modal-backdrop" onClick={() => setViewUrl(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={viewUrl} alt="Vehicle photo" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
            <button className="btn" style={{ marginTop: 12 }} onClick={() => setViewUrl(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
