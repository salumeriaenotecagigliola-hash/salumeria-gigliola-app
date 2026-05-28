import React from 'react';
import unnamedLogo from '../unnamed.png';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    xs: 'h-8',
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-18',
    xl: 'h-24'
  };

  return (
    <img 
      src={unnamedLogo}
      alt="Enoteca Gigliola"
      className={`w-auto object-contain flex-shrink-0 transition-all duration-300 ${sizeClasses[size]} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}

export function LogoG({ size = 'md', className = '' }: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl', className?: string }) {
  const sizeClasses = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16',
    xl: 'h-20'
  };

  return (
    <img 
      src={`${import.meta.env.BASE_URL}unnamed%20(1).png`}
      alt="G"
      className={`w-auto object-contain flex-shrink-0 transition-all duration-300 ${sizeClasses[size]} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}
