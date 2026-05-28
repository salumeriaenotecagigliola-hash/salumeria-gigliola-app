import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    xs: 'h-12 min-h-[48px]',
    sm: 'h-16 min-h-[64px]',
    md: 'h-20 min-h-[80px]',
    lg: 'h-32 min-h-[128px]',
    xl: 'h-40 min-h-[160px]'
  };

  return (
    <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-300 ${sizeClasses[size]} ${className}`}>
      <img 
        src={`${import.meta.env.BASE_URL}logo-192.png`}
        alt="Enoteca Gigliola" 
        className="h-full w-auto object-contain block max-w-full transition-all duration-300" 
        style={{ height: '100%' }}
      />
    </div>
  );
}

export function LogoG({ size = 'md', className = '' }: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl', className?: string }) {
  const sizeClasses = {
    xs: 'h-10 min-h-[40px]',
    sm: 'h-12 min-h-[48px]',
    md: 'h-16 min-h-[64px]',
    lg: 'h-24 min-h-[96px]',
    xl: 'h-28 min-h-[112px]'
  };

  return (
    <div className={`flex items-center justify-center flex-shrink-0 transition-all duration-300 ${sizeClasses[size]} ${className}`}>
      <img 
        src={`${import.meta.env.BASE_URL}logo-512.png`}
        alt="G" 
        className="h-full w-auto object-contain block max-w-full transition-all duration-300" 
        style={{ height: '100%' }}
      />
    </div>
  );
}
