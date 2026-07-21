import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Auth() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [phone_number, setPhoneNumber] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        await signup(phone_number, pseudo, password);
      } else {
        await login(phone_number, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setError('');
  };

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
      <div className="text-center" style={{ marginBottom: 40 }}>
        <div style={{ fontSize: '4rem', marginBottom: 8 }}>🎲</div>
        <h1 className="logo-text">JAMBO</h1>
        <p className="text-muted mt-8" style={{ fontSize: '1rem' }}>
          Le jeu de dés camerounais — multijoueur en temps réel
        </p>
      </div>

      <div className="glass" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h2>

        {error && (
          <div className="toast toast-error" style={{ marginBottom: 16, width: '100%', borderRadius: 10, fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="stack gap-16">
          <div className="input-wrap">
            <label>Numéro de téléphone ou email</label>
            <input
              className="input"
              type="text"
              placeholder="ex: 690000000 ou jambo@gmail.com"
              value={phone_number}
              onChange={e => setPhoneNumber(e.target.value)}
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="input-wrap">
              <label>Pseudo par défaut</label>
              <input
                className="input"
                type="text"
                placeholder="ex: KamtoFire"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                maxLength={20}
                required
              />
            </div>
          )}

          <div className="input-wrap">
            <label>Mot de passe</label>
            <input
              className="input"
              type="password"
              placeholder="6 caractères minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={submitting}
          >
            {submitting ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'S\'inscrire'}
          </button>
        </form>

        <p className="text-center text-muted text-sm mt-16" style={{ marginBottom: 0 }}>
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
          <button
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {mode === 'login' ? 'S\'inscrire' : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  );
}
