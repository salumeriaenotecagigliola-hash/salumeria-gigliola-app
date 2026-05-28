import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    xs: 'h-10',
    sm: 'h-12',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32'
  };

  return (
    <img 
      src={`${import.meta.env.BASE_URL}logo-192.png`}
      alt="Enoteca Gigliola"
      className={`w-auto object-contain flex-shrink-0 transition-all duration-300 ${sizeClasses[size]} ${className}`}
    />
  );
}

export function LogoG({ size = 'md', className = '' }: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl', className?: string }) {
  const sizeClasses = {
    xs: 'h-8',
    sm: 'h-10',
    md: 'h-12',
    lg: 'h-20',
    xl: 'h-24'
  };

  return (
    <img 
      src={`${import.meta.env.BASE_URL}g-logo.png`}
      alt="G"
      className={`w-auto object-contain flex-shrink-0 transition-all duration-300 ${sizeClasses[size]} ${className}`}
    />
  );
}
