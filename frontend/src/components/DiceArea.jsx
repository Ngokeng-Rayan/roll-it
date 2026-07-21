import Die from './Die';

const DURATION = 10;

export default function DiceArea({
  rollingFor,
  allDice,
  activePlayerId,
  isMyTurn,
  timeLeft,
  onRoll,
  players,
  myId,
}) {
  const displayPlayerId   = rollingFor ?? activePlayerId;
  const diceData          = displayPlayerId ? allDice[displayPlayerId] : null;
  const isCurrentlyRolling = rollingFor !== null;

  const pct    = timeLeft !== null ? Math.max(0, (timeLeft / DURATION) * 100) : 100;
  const urgent = timeLeft !== null && timeLeft <= 3;

  const displayPlayer  = players?.find(p => p.id === displayPlayerId);
  const isShowingMyDice = displayPlayerId === myId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, width: '100%' }}>

      {/* Nom du joueur dont on montre le lancer */}
      {displayPlayer && (
        <p style={{
          fontSize:      '0.82rem',
          fontWeight:    700,
          color:         'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin:        0,
        }}>
          {isShowingMyDice ? '🎲 Votre lancer' : `🎲 Lancer de ${displayPlayer.pseudo}`}
        </p>
      )}

      {/* ── Les deux dés ── */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <Die
          value={isCurrentlyRolling ? null : (diceData?.dice1 ?? null)}
          rolling={isCurrentlyRolling}
          isMillion={diceData?.isMillion ?? false}
        />
        <Die
          value={isCurrentlyRolling ? null : (diceData?.dice2 ?? null)}
          rolling={isCurrentlyRolling}
          isMillion={diceData?.isMillion ?? false}
        />
      </div>

      {/* ── Score total après lancer ── */}
      {!isCurrentlyRolling && diceData && (
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          padding:       '10px 24px',
          borderRadius:  100,
          background:    diceData.isMillion
            ? 'rgba(255,179,0,0.12)'
            : 'rgba(0,210,255,0.08)',
          border: `1px solid ${diceData.isMillion ? 'rgba(255,179,0,0.4)' : 'rgba(0,210,255,0.25)'}`,
        }}>
          {diceData.isMillion ? (
            <span style={{ fontWeight: 800, color: 'var(--accent-gold)', fontSize: '1.15rem' }}>
              💰 MILLION ! Victoire instantanée
            </span>
          ) : (
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Total :{' '}
              <span style={{ color: 'var(--accent-cyan)', fontSize: '1.5rem' }}>
                {diceData.score}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem', marginLeft: 8 }}>
                ({diceData.dice1} + {diceData.dice2})
              </span>
            </span>
          )}
        </div>
      )}

      {/* ── Timer : visible pendant MON tour ── */}
      {isMyTurn && !isCurrentlyRolling && timeLeft !== null && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Temps restant</span>
            <span style={{
              fontSize:   '0.82rem',
              fontWeight: 800,
              color:      urgent ? 'var(--accent-orange)' : 'var(--text-secondary)',
            }}>
              {timeLeft}s
            </span>
          </div>
          <div className="timer-track">
            <div className={`timer-fill${urgent ? ' urgent' : ''}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* ── Bouton Lancer (mon tour) ── */}
      {isMyTurn && !isCurrentlyRolling && (
        <button
          className="btn btn-primary btn-lg"
          onClick={onRoll}
          style={{ minWidth: 230, fontSize: '1.05rem' }}
        >
          🎲 Lancer mes dés !
        </button>
      )}

      {/* ── Animation en cours ── */}
      {isCurrentlyRolling && (
        <p style={{ fontWeight: 700, color: 'var(--accent-gold)', margin: 0 }}
           className="pulse">
          Les dés roulent…
        </p>
      )}
    </div>
  );
}
