import DiceArea from '../components/DiceArea';
import PlayerList from '../components/PlayerList';
import ResultOverlay from '../components/ResultOverlay';

export default function Game({
  room,
  myId,
  isMyTurn,
  isCreator,
  rollingFor,
  allDice,
  activePlayerId,
  timeLeft,
  result,
  onRoll,
  onHome,
  onRematch,
}) {
  const currentPlayer = room?.players?.find(p => p.id === activePlayerId);
  const isRolling = rollingFor !== null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <header className="glass" style={{
        margin: '12px 16px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 14,
      }}>
        <div>
          <span className="section-title">JAMBO 🎲</span>
          <div className="row gap-8" style={{ marginTop: 6 }}>
            <span className="badge badge-cyan">{room?.roomCode}</span>
            {(room?.roundNumber ?? 1) > 1 && (
              <span className="badge badge-danger">Manche {room.roundNumber}</span>
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-muted" style={{ marginBottom: 2 }}>Pot total</div>
          <div style={{
            fontWeight: 800,
            fontSize: '1.7rem',
            background: 'var(--gradient-gold)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {room?.potTotal ?? 0} 🪙
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px 28px' }}>

        {/* Turn indicator banner */}
        <div className="glass text-center" style={{ padding: '13px 20px' }}>
          {isMyTurn && !isRolling && (
            <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>
              🎯 C'est VOTRE tour !
            </span>
          )}
          {!isMyTurn && currentPlayer && !isRolling && (
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              Attente du lancer de{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{currentPlayer.pseudo}</strong>…
            </span>
          )}
          {isRolling && (
            <span className="pulse" style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
              🎲 Les dés roulent…
            </span>
          )}
          {room?.status === 'CANCELLED_TIE' && (
            <span style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>
              ⚖️ Égalité — Nouvelle manche dans quelques secondes…
            </span>
          )}
          {room?.status === 'FINISHED' && (
            <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
              🏆 Partie terminée !
            </span>
          )}
        </div>

        {/* Dice area */}
        <div className="glass" style={{ padding: '28px 24px' }}>
          <DiceArea
            rollingFor={rollingFor}
            allDice={allDice}
            activePlayerId={activePlayerId}
            isMyTurn={isMyTurn}
            timeLeft={timeLeft}
            onRoll={onRoll}
            players={room?.players ?? []}
            myId={myId}
          />
        </div>

        {/* Scoreboard / Players */}
        <div className="glass" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Joueurs · {room?.players?.length ?? 0} participant{(room?.players?.length ?? 0) > 1 ? 's' : ''}
          </div>
          <PlayerList
            players={room?.players ?? []}
            activePlayerId={activePlayerId}
            allDice={allDice}
            myId={myId}
            winnerId={result?.winnerId}
          />
        </div>
      </div>

      <ResultOverlay
        result={result}
        isCreator={isCreator}
        onRematch={onRematch}
        onHome={onHome}
      />
    </div>
  );
}
