import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../socket';

export default function Home({ user, onCreateRoom, onJoinRoom, onJoinPublic, onLogout }) {
  const [pseudo, setPseudo] = useState(user?.pseudo || '');
  const [mode, setMode] = useState(null);
  const [stakeAmount, setStakeAmount] = useState(500);
  const [roomCode, setRoomCode] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [publicRooms, setPublicRooms] = useState([]);

  const canProceed = pseudo.trim().length >= 2;

  const fetchPublicRooms = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:list');
    socket.once('room:list', (rooms) => {
      setPublicRooms(rooms);
    });
  }, []);

  useEffect(() => {
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchPublicRooms]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* User bar */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div className="row gap-8">
          <div className="player-avatar" style={{ background: 'var(--gradient-gold)', width: 32, height: 32, fontSize: '0.8rem' }}>
            {(user?.pseudo || 'J')[0].toUpperCase()}
          </div>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.pseudo}</span>
          <span className="badge badge-gold">{user?.token_balance ?? 0} 🪙</span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onLogout}>
          Déconnexion
        </button>
      </div>

      {/* Logo + tagline */}
      <div className="text-center" style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '4rem', marginBottom: 8 }}>🎲</div>
        <h1 className="logo-text">JAMBO</h1>
        <p className="text-muted mt-8" style={{ fontSize: '1rem' }}>
          Le jeu de dés camerounais — multijoueur en temps réel
        </p>
      </div>

      {/* Card */}
      <div className="glass" style={{ width: '100%', maxWidth: 460, padding: 28 }}>

        {!mode && (
          <>
            <div className="input-wrap" style={{ marginBottom: 16 }}>
              <label>Ton pseudo pour cette partie</label>
              <input
                className="input"
                type="text"
                placeholder="ex: KamtoFire"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="stack gap-12" style={{ marginBottom: 24 }}>
              <button
                className="btn btn-primary btn-full btn-lg"
                disabled={!canProceed}
                onClick={() => setMode('create')}
              >
                ✨ Créer une partie
              </button>
              <button
                className="btn btn-gold btn-full btn-lg"
                disabled={!canProceed}
                onClick={() => setMode('join')}
              >
                🚪 Rejoindre par code
              </button>
            </div>

            {/* Public rooms */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 16 }}>
              <div className="section-title" style={{ marginBottom: 12 }}>
                🎮 Parties publiques
              </div>
              {publicRooms.length === 0 && (
                <p className="text-muted text-sm text-center">Aucune partie publique pour le moment</p>
              )}
              <div className="stack gap-8">
                {publicRooms.map(r => (
                  <div
                    key={r.roomCode}
                    className="glass"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: 12,
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div>
                      <div className="row gap-8">
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.creatorPseudo}</span>
                        <span className="badge badge-cyan">{r.roomCode}</span>
                      </div>
                      <div className="row gap-8 mt-8">
                        <span className="text-xs text-muted">Mise: {r.stakeAmount} 🪙</span>
                        <span className="text-xs text-muted">·</span>
                        <span className="text-xs text-muted">{r.playerCount} joueur{r.playerCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={!canProceed}
                      onClick={() => onJoinPublic({ pseudo, roomCode: r.roomCode })}
                    >
                      Rejoindre
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'create' && (
          <div className="stack gap-16">
            <div className="input-wrap">
              <label>Type de partie</label>
              <div className="row gap-8" style={{ width: '100%' }}>
                <button
                  className={`btn btn-sm ${visibility === 'private' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setVisibility('private')}
                >
                  🔒 Privée (code)
                </button>
                <button
                  className={`btn btn-sm ${visibility === 'public' ? 'btn-gold' : 'btn-ghost'}`}
                  style={{ flex: 1 }}
                  onClick={() => setVisibility('public')}
                >
                  🌍 Publique
                </button>
              </div>
            </div>
            <div className="input-wrap">
              <label>Mise par joueur (jetons)</label>
              <input
                className="input"
                type="number"
                min={100}
                step={100}
                value={stakeAmount}
                onChange={e => setStakeAmount(Number(e.target.value))}
              />
            </div>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {[100, 500, 1000, 2000, 5000].map(v => (
                <button
                  key={v}
                  className={`btn btn-sm ${stakeAmount === v ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setStakeAmount(v)}
                >
                  {v}🪙
                </button>
              ))}
            </div>
            <button
              className="btn btn-gold btn-full"
              onClick={() => onCreateRoom({ pseudo, stakeAmount, visibility })}
            >
              🎲 Créer la partie
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Retour</button>
          </div>
        )}

        {mode === 'join' && (
          <div className="stack gap-16">
            <div className="input-wrap">
              <label>Code de la room</label>
              <input
                className="input"
                type="text"
                placeholder="ex: ABC123"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                maxLength={10}
                style={{ letterSpacing: '0.2em', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center' }}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              disabled={roomCode.length < 4}
              onClick={() => onJoinRoom({ pseudo, roomCode })}
            >
              🚀 Rejoindre
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Retour</button>
          </div>
        )}
      </div>

      <p className="text-muted text-xs mt-24 text-center">
        MVP — Jetons virtuels uniquement • Jambo v1.0
      </p>
    </div>
  );
}
