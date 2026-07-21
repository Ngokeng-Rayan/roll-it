export default function ResultOverlay({ result, isCreator, onRematch, onHome }) {
  if (!result) return null;

  const isMillion = result.isMillion;

  return (
    <div className="result-overlay">
      <div className="glass-bright result-card">
        <span className="result-emoji">
          {isMillion ? '💰' : '🏆'}
        </span>
        <h2 className="result-winner">
          {isMillion
            ? `${result.winnerPseudo} a fait Million !`
            : `${result.winnerPseudo} a gagné !`}
        </h2>
        <p className="result-subtitle">
          {isMillion ? 'Double 1 — victoire instantanée !' : 'Meilleur score du tour'}
        </p>

        {/* Earnings breakdown */}
        <div className="glass stack gap-8" style={{ padding: '16px 20px', margin: '20px 0', borderRadius: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="text-muted text-sm">Pot total</span>
            <span style={{ fontWeight: 700 }}>{result.potTotal} 🪙</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="text-muted text-sm">Commission plateforme (10%)</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-orange)' }}>-{result.commission} 🪙</span>
          </div>
          <div style={{ height: 1, background: 'var(--glass-border)' }} />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="text-sm" style={{ fontWeight: 700 }}>Gain net</span>
            <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--accent-green)' }}>
              {result.netPayout} 🪙
            </span>
          </div>
        </div>

        <div className="stack gap-12">
          {isCreator ? (
            <button className="btn btn-gold btn-full" onClick={onRematch}>
              🔄 Rejouer avec les mêmes joueurs
            </button>
          ) : (
            <p className="text-center text-muted pulse" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              En attente du créateur pour relancer…
            </p>
          )}
          <button className="btn btn-ghost btn-full" onClick={onHome}>
            🏠 Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
