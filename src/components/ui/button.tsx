import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'warning';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm';
    
    const variantClasses = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-blue-600/25',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-red-600/25',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-500',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500',
      ghost: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500',
      link: 'text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline focus-visible:ring-blue-500',
      success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 shadow-green-600/25',
      warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus-visible:ring-yellow-500 shadow-yellow-600/25',
    };
    
    const sizeClasses = {
      default: 'h-11 px-6 py-3',
      sm: 'h-9 px-4 py-2 text-xs',
      lg: 'h-12 px-8 py-4 text-base',
      icon: 'h-11 w-11 p-0',
    };

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button }; 