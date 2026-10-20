import { useEffect, useState } from 'react';
import { complianceRulesApi, type ComplianceRule } from '../api/complianceRules';
import { describeError } from '../api/errors';

export default function ComplianceRulesPanel() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    complianceRulesApi.list().then((response) => setRules(response.data))
      .catch((reason) => setError(describeError(reason, 'load compliance rules')))
      .finally(() => setLoading(false));
  }, []);

  async function save(rule: ComplianceRule) {
    setSaving(rule.ruleId); setError(''); setNotice('');
    try {
      const response = await complianceRulesApi.update(rule.ruleId, {
        enabled: rule.enabled, severity: rule.severity, message: rule.message,
      });
      setRules((current) => current.map((item) => item.ruleId === rule.ruleId ? response.data : item));
      setNotice('Rule saved. Existing ad checks are stale and must be rerun before Ready or export.');
    } catch (reason) { setError(describeError(reason, 'save compliance rule')); }
    finally { setSaving(''); }
  }

  if (loading) return <p className="muted">Loading compliance rules…</p>;
  return (
    <section>
      <h2>Ad compliance rules</h2>
      <p className="muted">Disabled rules are skipped. BLOCK stops Ready and export; REVIEW is advisory. Saving any rule invalidates previous checks across dealerships. A message left as shown keeps the engine’s finding-specific wording.</p>
      {error && <p className="danger-text">{error}</p>}
      {notice && <p className="success-text">{notice}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Rule</th><th>Enabled</th><th>Severity</th><th>Message</th><th>Action</th></tr></thead>
          <tbody>{rules.map((rule) => (
            <tr key={rule.ruleId}>
              <td>{rule.ruleId}</td>
              <td><input aria-label={`${rule.ruleId} enabled`} type="checkbox" checked={rule.enabled}
                onChange={(event) => setRules((all) => all.map((item) => item.ruleId === rule.ruleId ? { ...item, enabled: event.target.checked } : item))} /></td>
              <td><select className="select" aria-label={`${rule.ruleId} severity`} value={rule.severity}
                onChange={(event) => setRules((all) => all.map((item) => item.ruleId === rule.ruleId ? { ...item, severity: event.target.value as ComplianceRule['severity'] } : item))}>
                <option value="BLOCK">BLOCK</option><option value="REVIEW">REVIEW</option>
              </select></td>
              <td><input className="input" aria-label={`${rule.ruleId} message`} value={rule.message}
                onChange={(event) => setRules((all) => all.map((item) => item.ruleId === rule.ruleId ? { ...item, message: event.target.value } : item))} /></td>
              <td><button className="btn" disabled={saving === rule.ruleId} onClick={() => void save(rule)}>{saving === rule.ruleId ? 'Saving…' : 'Save'}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
