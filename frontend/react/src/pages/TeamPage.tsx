import { useEffect, useState } from 'react';
import { joinRequestsApi, type JoinRequest } from '../api/joinRequests';
import { messageOf } from '../api/http';

/**
 * Dealer.User queue of Google join requests. Any member of the dealership can approve or
 * reject; approval creates the membership so the applicant signs in to this dealership next
 * time. Scoped server-side to the caller's own tenant, so one dealership never sees another's
 * queue.
 */
export default function TeamPage() {
  const [rows, setRows] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      setRows(await joinRequestsApi.list());
    } catch (err) {
      setError(messageOf(err, 'Could not load join requests.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function act(username: string, verb: 'approve' | 'reject') {
    setActing(username); setError('');
    try {
      if (verb === 'approve') await joinRequestsApi.approve(username);
      else await joinRequestsApi.reject(username);
      await load();
    } catch (err) {
      setError(messageOf(err, `Could not ${verb} the request.`));
    } finally {
      setActing(null);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Team</h1>
        <p className="muted">Google users who asked to join this dealership.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="state">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="state">No pending join requests.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Username</th>
              <th>Requested</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.username}>
                <td>{r.displayName}</td>
                <td>{r.email ?? '—'}</td>
                <td>{r.username}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={acting === r.username}
                    onClick={() => void act(r.username, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn-link"
                    style={{ marginLeft: 12 }}
                    disabled={acting === r.username}
                    onClick={() => void act(r.username, 'reject')}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
