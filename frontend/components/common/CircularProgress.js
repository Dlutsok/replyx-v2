import React from 'react';

const CircularProgress = ({ 
  progress = 20, 
  total = 100, 
  size = 36, 
  strokeWidth = 2,
  className = "",
  showCenter = true,
  centerContent = null
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progress) / total;
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg 
        className="transform -rotate-90" 
        width={size} 
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Фоновый круг */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#ccf1d5"
          strokeWidth={strokeWidth}
        />
        
        {/* Прогресс круг */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#34b857"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Центральный контент */}
      {showCenter && (
        <div className="absolute inset-0 flex items-center justify-center">
          {centerContent || (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <path fillRule="evenodd" d="M17.127 5.813a.25.25 0 0 1 0-.354l1.768-1.768a.25.25 0 0 1 .353 0l1.061 1.06a.25.25 0 0 1 0 .354l-1.768 1.768a.25.25 0 0 1-.353 0zM12.75 4a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25h-1.5a.25.25 0 0 0-.25.25v2.5c0 .138.112.25.25.25zM20 12.75c0 .138.112.25.25.25h2.5a.25.25 0 0 0 .25-.25v-1.5a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25zm-16 0a.25.25 0 0 1-.25.25h-2.5a.25.25 0 0 1-.25-.25v-1.5a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25zm2.873-6.937a.25.25 0 0 0 0-.354L5.105 3.691a.25.25 0 0 0-.353 0l-1.06 1.061a.25.25 0 0 0 0 .354l1.767 1.767a.25.25 0 0 0 .354 0zM15 20v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1zm-7-8a4 4 0 1 1 6.4 3.2l-.4.3V17h-4v-1.5l-.4-.3A4 4 0 0 1 8 12m4-6a6 6 0 0 0-4 10.472v1.278c0 .69.56 1.25 1.25 1.25h5.5c.691 0 1.25-.56 1.25-1.25V16.47A6 6 0 0 0 12 6" clipRule="evenodd"/>
            </svg>
          )}
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
