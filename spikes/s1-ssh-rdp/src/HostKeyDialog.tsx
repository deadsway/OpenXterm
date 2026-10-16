import type { HostKeyEvent } from "./api";

interface Props {
  event: HostKeyEvent;
  onAnswer: (accept: boolean) => void;
}

export default function HostKeyDialog({ event, onAnswer }: Props) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="hk-title">
        <h2 id="hk-title">Unbekannter Host-Schlüssel</h2>
        <p>Der Server {event.host} ist noch nicht bekannt. Bitte den Fingerprint vergleichen.</p>
        <dl>
          <dt>Algorithmus</dt>
          <dd>{event.algorithm}</dd>
          <dt>Fingerprint</dt>
          <dd className="mono">{event.fingerprint}</dd>
        </dl>
        <div className="actions">
          <button onClick={() => onAnswer(false)}>Abbrechen</button>
          <button className="primary" autoFocus onClick={() => onAnswer(true)}>
            Vertrauen
          </button>
        </div>
      </div>
    </div>
  );
}
