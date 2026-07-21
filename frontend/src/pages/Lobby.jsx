import { useState } from 'react';

export default function Lobby({ room, userId, isCreator, onConfirmStake, onLeaveRoom, onForceStart }) {
  const [copied, setCopied] = useState(false);

  if (!room) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
      }}>
        <div className="pulse" style={{ fontSize: '2rem' }}>⏳</div>
        <p className="text-muted">Création de la room en cours…</p>
      </div>
    );
  }

  const me           = room.players.find(p => p.id === userId);
  const paidCount    = room.players.filter(p => p.hasPaidStake).length;
  const allPaid      = room.players.length >= 2 && room.players.every(p => p.hasPaidStake);
  const canStart     = isCreator && paidCount >= 2;

  const copyCode = () => {
    navigator.clipboard?.writeText(room.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24,
      position: 'relative', zIndex: 1,
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: 460, padding: 28 }}>

        {/* Header */}
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div className="section-title">Salle d'attente</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: 4 }}>En attente des joueurs…</h2>
          </div>
          <div className="stack gap-4" style={{ alignItems: 'flex-end' }}>
            <span className="badge badge-cyan">LOBBY</span>
            <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
              {room.visibility === 'public' ? '🌍 Publique' : '🔒 Privée'}
            </span>
          </div>
        </div>

        {/* Room code block */}
        <button
          onClick={copyCode}
          style={{
            width: '100%', padding: '18px 24px', marginBottom: 20,
            background: 'rgba(0, 210, 255, 0.08)',
            border: '2px dashed rgba(0, 210, 255, 0.35)',
            borderRadius: 14, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}
        >
          <span style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '0.25em', color: 'var(--accent-cyan)' }}>
            {room.roomCode}
          </span>
          <span className="text-xs text-muted">
            {copied ? '✅ Copié !' : 'Partage ce code · cliquer pour copier'}
          </span>
        </button>

        {/* Stake info */}
        <div className="row" style={{
          justifyContent: 'space-between', marginBottom: 20,
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,179,0,0.08)', border: '1px solid rgba(255,179,0,0.2)',
        }}>
          <span className="text-sm" style={{ fontWeight: 600 }}>Mise par joueur</span>
          <span style={{ fontWeight: 800, color: 'var(--accent-gold)', fontSize: '1.1rem' }}>
            {room.stakeAmount} 🪙
          </span>
        </div>

        {/* Players list */}
        <div className="section-title" style={{ marginBottom: 10 }}>
          Joueurs — {paidCount}/{room.players.length} ont confirmé
        </div>
        <div className="stack gap-8" style={{ marginBottom: 24 }}>
          {room.players.map(p => (
            <div key={p.id} className={`player-card ${p.id === userId ? 'active-turn' : ''}`}>
              <div className="player-avatar" style={p.id === userId ? { background: 'var(--gradient-gold)' } : {}}>
                {(p.pseudo || 'J')[0].toUpperCase()}
              </div>
              <span style={{ flex: 1, fontWeight: 700 }}>
                {p.pseudo || 'Joueur'}
                {p.id === userId && <span className="badge badge-cyan" style={{ marginLeft: 8 }}>Vous</span>}
                {p.id === room.creatorId && <span className="badge badge-gold" style={{ marginLeft: 4 }}>👑</span>}
              </span>
              <span style={{ fontSize: '1.2rem' }}>{p.hasPaidStake ? '✅' : '⏳'}</span>
            </div>
          ))}
        </div>

        {/* Action area */}
        {me && !me.hasPaidStake && (
          <button className="btn btn-gold btn-full btn-lg" onClick={onConfirmStake}>
            💰 Confirmer ma mise ({room.stakeAmount} 🪙)
          </button>
        )}

        {me?.hasPaidStake && !allPaid && room.players.length < 2 && (
          <p className="text-center text-muted pulse" style={{ fontWeight: 600 }}>
            En attente d'au moins un autre joueur…
          </p>
        )}

        {me?.hasPaidStake && !allPaid && room.players.length >= 2 && (
          <div className="stack gap-12">
            <p className="text-center text-muted pulse" style={{ fontWeight: 600 }}>
              {canStart
                ? `En attente — ${paidCount}/${room.players.length} ont confirmé`
                : 'En attente des autres mises…'}
            </p>
            {canStart && (
              <button className="btn btn-danger btn-full" onClick={onForceStart}>
                ⚡ Lancer la partie ({room.players.length - paidCount > 0 ? `${room.players.length - paidCount} exclus` : 'tous prêts'})
              </button>
            )}
          </div>
        )}

        {allPaid && !isCreator && (
          <p className="text-center pulse" style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
            ✅ Tout le monde est prêt — en attente du créateur…
          </p>
        )}

        {allPaid && isCreator && (
          <button className="btn btn-gold btn-full btn-lg" onClick={onForceStart}>
            🎲 Lancer la partie ({paidCount} joueurs)
          </button>
        )}

        {/* Leave button */}
        <button className="btn btn-ghost btn-sm btn-full mt-16" onClick={onLeaveRoom}>
          🚪 Quitter la room
        </button>
      </div>
    </div>
  );
}
