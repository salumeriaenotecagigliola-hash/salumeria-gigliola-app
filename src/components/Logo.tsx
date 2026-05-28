import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    xs: 'h-10 min-h-[40px]',
    sm: 'h-12 min-h-[48px]',
    md: 'h-16 min-h-[64px]',
    lg: 'h-28 min-h-[112px]'
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

export function LogoG({ size = 'md', className = '' }: { size?: 'xs' | 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    xs: 'h-9 min-h-[36px]',
    sm: 'h-11 min-h-[44px]',
    md: 'h-14 min-h-[56px]',
    lg: 'h-20 min-h-[80px]'
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
