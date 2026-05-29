import React from 'react';

interface AppLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ 
  message = 'Cargando Xignis...', 
  fullScreen = true 
}) => {
  return (
    <div style={{
      minHeight: fullScreen ? '100vh' : '200px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0d1117',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          50% { box-shadow: 0 0 20px 8px rgba(249, 115, 22, 0.15); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .loader-ripple {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid rgba(249, 115, 22, 0.3);
          animation: ripple 2s ease-out infinite;
        }
        .loader-ripple:nth-child(2) { animation-delay: 0.4s; }
        .loader-ripple:nth-child(3) { animation-delay: 0.8s; }
        .loader-logo {
          animation: logoFloat 2s ease-in-out infinite, logoPulse 2s ease-in-out infinite;
        }
        .loader-message {
          animation: fadeInUp 0.6s ease-out 0.3s both;
        }
        .loader-shimmer {
          background: linear-gradient(90deg, #656d76 0%, #f0f6fc 50%, #656d76 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          -webkit-background-clip: text;
          background-clip: text;
        }
      `}</style>

      {/* Ripple rings */}
      <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loader-ripple" />
        <div className="loader-ripple" />
        <div className="loader-ripple" />
        
        {/* Main logo container */}
        <div className="loader-logo" style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          <img
            src="/img/xignis-logo.png"
            alt="Xignis Logo"
            style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Message */}
      <div className="loader-message" style={{
        marginTop: '20px',
        fontSize: '14px',
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        fontWeight: 500,
        color: '#8b949e',
        letterSpacing: '0.02em',
      }}>
        <span className="loader-shimmer" style={{ color: '#f0f6fc' }}>
          {message.split('').map((char, i) => (
            char === ' ' ? '\u00A0' : char
          ))}
        </span>
      </div>

      {/* Progress indicator dots */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        gap: '6px',
      }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#f97316',
            animation: `pulse 1.5s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}>
            <style>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.4; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        ))}
      </div>

      {/* Background texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(249, 115, 22, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(239, 68, 68, 0.06) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />
    </div>
  );
};