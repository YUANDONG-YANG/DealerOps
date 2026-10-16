import type { AssistantCardDto } from '../api/assistant';

const KINDS: Record<string, { label: string; tagClass: string; action: string }> = {
  VEHICLE: { label: 'Vehicle', tagClass: 'tag', action: 'Open in DMS' },
  CUSTOMER: { label: 'Customer', tagClass: 'tag tag-success', action: 'Open in CRM' },
  LISTING: { label: 'Ad', tagClass: 'tag tag-warning', action: 'Open in Ad compliance' },
};

function pretty(s?: string) {
  return s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '';
}

export default function AssistantCard({ card, onOpen }: { card: AssistantCardDto; onOpen: () => void }) {
  const kind = KINDS[card.kind] || KINDS.VEHICLE;
  return (
    <div
      className="assistant-card"
      tabIndex={0}
      role="button"
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="assistant-card-head">
        <span className={kind.tagClass}>{kind.label}</span>
        {(card.status || card.checkStatus) && <span className="muted">{pretty(card.status || card.checkStatus)}</span>}
      </div>
      <strong className="assistant-card-label">{card.label}</strong>
      <div className="assistant-card-action">{kind.action} &rarr;</div>
    </div>
  );
}
