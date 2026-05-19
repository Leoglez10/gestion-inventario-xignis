import React from 'react';

interface PageLoaderProps {
  message?: string;
  minimal?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = 'Cargando...', 
  minimal = false 
}) => {
  if (minimal) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '8px',
      }}>
        <style>{`
          @keyframes minimalDot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#f97316',
            animation: 'minimalDot 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: '16px',
    }}>
      <style>{`
        @keyframes pageLoaderSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pageLoaderPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .page-loader-ring {
          animation: pageLoaderSpin 1.2s linear infinite;
        }
        .page-loader-text {
          animation: pageLoaderPulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Spinner ring */}
      <div style={{
        position: 'relative',
        width: '40px',
        height: '40px',
      }}>
        <svg className="page-loader-ring" width="40" height="40" viewBox="0 0 40 40">
          <defs>
            <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <circle 
            cx="20" 
            cy="20" 
            r="16" 
            fill="none" 
            stroke="url(#loaderGradient)" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="70 30"
            transform="rotate(-90 20 20)"
          />
        </svg>
        
        {/* Center dot */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#f97316',
        }} />
      </div>

      {/* Message */}
      <span className="page-loader-text" style={{
        fontSize: '13px',
        color: '#656d76',
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        {message}
      </span>
    </div>
  );
};