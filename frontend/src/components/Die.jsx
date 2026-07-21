// Die.jsx — affiche un grand chiffre sur la face du dé + points décoratifs

export default function Die({ value, rolling = false, isMillion = false }) {

  const isLanded = !rolling && value != null;

  // Couleurs
  const borderColor  = isMillion ? '#ffb300'                  : 'rgba(255,255,255,0.18)';
  const glowColor    = isMillion ? 'rgba(255,179,0,0.5)'      : 'rgba(0,210,255,0.25)';
  const numberColor  = isMillion ? '#ffb300'                  : '#ffffff';
  const bgColor      = isMillion ? 'rgba(40,28,0,0.95)'       : 'rgba(22,22,34,0.97)';

  return (
    <div style={{
      position:    'relative',
      width:       110,
      height:      110,
      borderRadius: 22,
      background:  bgColor,
      border:      `2.5px solid ${borderColor}`,
      boxShadow:   isLanded
        ? `0 0 28px ${glowColor}, 0 12px 36px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1)`
        : '0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'center',
      flexShrink:  0,
      animation:   rolling
        ? 'diceRoll 0.13s infinite linear'
        : isLanded
        ? 'dieLand 0.4s cubic-bezier(0.34,1.56,0.64,1) both'
        : 'none',
      overflow:    'hidden',
      userSelect:  'none',
    }}>

      {/* ── Rolling: point d'interrogation animé ── */}
      {rolling && (
        <span style={{
          fontSize:   '3.5rem',
          fontWeight: 900,
          color:      'rgba(255,255,255,0.25)',
          lineHeight: 1,
          fontFamily: 'Outfit, sans-serif',
        }}>?</span>
      )}

      {/* ── Résultat: grand chiffre centré ── */}
      {isLanded && (
        <>
          {/* Chiffre principal — très grand, très visible */}
          <span style={{
            fontSize:      '4.2rem',
            fontWeight:    900,
            color:         numberColor,
            lineHeight:    1,
            fontFamily:    'Outfit, sans-serif',
            letterSpacing: '-0.04em',
            textShadow:    isMillion
              ? `0 0 20px rgba(255,179,0,0.9), 0 0 40px rgba(255,179,0,0.5)`
              : `0 0 16px rgba(0,210,255,0.8), 0 0 32px rgba(0,210,255,0.35)`,
          }}>
            {value}
          </span>

          {/* Petits points décoratifs dans les coins */}
          <CornerDots isMillion={isMillion} />
        </>
      )}

      {/* ── Vide (avant toute partie) ── */}
      {!rolling && !isLanded && (
        <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '2.5rem', fontWeight: 800 }}>·</span>
      )}
    </div>
  );
}

// Petits points décoratifs dans les 4 coins (like a real die card)
function CornerDots({ isMillion }) {
  const dotStyle = {
    position:     'absolute',
    width:        9,
    height:       9,
    borderRadius: '50%',
    background:   isMillion ? 'rgba(255,179,0,0.45)' : 'rgba(0,210,255,0.35)',
    boxShadow:    isMillion ? '0 0 4px rgba(255,179,0,0.6)' : '0 0 4px rgba(0,210,255,0.4)',
  };
  return (
    <>
      <span style={{ ...dotStyle, top: 10, left: 10 }} />
      <span style={{ ...dotStyle, top: 10, right: 10 }} />
      <span style={{ ...dotStyle, bottom: 10, left: 10 }} />
      <span style={{ ...dotStyle, bottom: 10, right: 10 }} />
    </>
  );
}
