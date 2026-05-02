import React from 'react';

type LoadingArgosProps = {
  type: 'inclusion' | 'exclusion' | 'loading';
  message?: string;
  isDark?: boolean;
  progress?: number;
};

export const LoadingArgos: React.FC<LoadingArgosProps> = ({ type, message, isDark, progress }) => {
  const liquidColor = type === 'exclusion' ? '#ef4444' : type === 'inclusion' ? '#22c55e' : '#0ea5e9'; // Red, Green, Sky Blue

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-300">
      <style>
        {`
          @keyframes blink {
            0%, 45%, 55%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.1); }
          }
          @keyframes fillLiquid {
            0% { transform: translateY(24px); }
            50% { transform: translateY(-2px); }
            100% { transform: translateY(24px); }
          }
          .animate-blink {
            animation: blink 4s infinite ease-in-out;
            transform-origin: center;
          }
          .animate-fill {
            animation: fillLiquid 3s infinite ease-in-out;
          }
        `}
      </style>
      <div className={`flex flex-col items-center p-8 rounded-2xl shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        {/* Eye Container */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-6 overflow-hidden">
          {/* Eye Outline Base */}
          <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full text-gray-200 dark:text-slate-700" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>

          {/* Liquid Fill Top Layer & Blinking */}
          <svg 
            viewBox="0 0 24 24" 
            className="absolute inset-0 w-full h-full animate-blink"
            style={{ color: liquidColor }}
          >
            <clipPath id="liquidClip">
              <rect 
                x="0" 
                width="24" 
                height="24"
                className="animate-fill"
              />
            </clipPath>
            
            <g clipPath="url(#liquidClip)">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
            </g>
          </svg>
        </div>
        <p className={`text-lg font-bold mt-2 animate-pulse ${isDark ? 'text-white' : 'text-gray-900'}`}>{message || 'Carregando...'}</p>
        {progress !== undefined && (
          <div className="w-full mt-4 min-w-[200px]">
             <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
               <div className="h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: liquidColor }}></div>
             </div>
             <p className={`text-sm text-center mt-2 font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{Math.round(progress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

