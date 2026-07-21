// PlayerList — shows all players with their scores and turn state
// Props:
//   players        : array
//   activePlayerId : whose turn it is
//   allDice        : { [playerId]: { dice1, dice2, score, isMillion } | null }
//   myId           : string
//   winnerId       : string | null
export default function PlayerList({ players, activePlayerId, allDice, myId, winnerId }) {
  return (
    <div className="stack gap-8">
      {players.map((p) => {
        const isActive  = p.id === activePlayerId;
        const isWinner  = p.id === winnerId;
        const isMe      = p.id === myId;
        const dice      = allDice?.[p.id];
        const initial   = (p.pseudo || 'J')[0].toUpperCase();

        return (
          <div
            key={p.id}
            className={`player-card ${isActive ? 'active-turn' : ''} ${isWinner ? 'winner' : ''}`}
          >
            {/* Avatar */}
            <div
              className="player-avatar"
              style={isMe ? { background: 'var(--gradient-gold)' } : {}}
            >
              {initial}
            </div>

            {/* Name + mise status */}
            <div className="stack flex-1" style={{ gap: 3 }}>
              <div className="row gap-8" style={{ alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.pseudo || 'Joueur'}</span>
                {isMe && <span className="badge badge-cyan">Vous</span>}
                {isWinner && <span className="badge badge-green">🏆</span>}
              </div>
              <span className="text-xs text-muted">
                {p.hasPaidStake ? '✅ Mise confirmée' : '⏳ Mise en attente'}
              </span>
            </div>

            {/* Right: dice result or turn badge */}
            <div className="stack" style={{ alignItems: 'flex-end', gap: 4, minWidth: 70 }}>
              {/* Show dice values if this player has rolled */}
              {dice && (
                <div className="stack" style={{ alignItems: 'flex-end', gap: 2 }}>
                  {dice.isMillion ? (
                    <span style={{ fontWeight: 800, color: 'var(--accent-gold)', fontSize: '0.9rem' }}>
                      💰 Million!
                    </span>
                  ) : (
                    <>
                      <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--accent-cyan)' }}>
                        {dice.score}
                      </span>
                      <span className="text-xs text-muted">
                        ({dice.dice1} + {dice.dice2})
                      </span>
                    </>
                  )}
                </div>
              )}
              {/* Active turn badge */}
              {isActive && !dice && (
                <span className="badge badge-cyan pulse">Tour ▶</span>
              )}
              {/* Waiting (already rolled) */}
              {p.hasRolled && !dice && (
                <span className="text-xs text-muted">Lancé</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
