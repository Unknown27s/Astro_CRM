import React from 'react';
import { cn } from '../../utils/cn';

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { src?: string; alt?: string; initials?: string; size?: 'sm' | 'md' | 'lg' }>(
  ({ className, src, alt = 'Avatar', initials, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-medium overflow-hidden',
          sizeClasses[size],
          className
        )}
        role="img"
        aria-label={alt}
        {...props}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span>{initials || '?'}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

const Spinner = ({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('inline-flex', sizeClasses[size])}>
      <div className={cn('animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600', sizeClasses[size], className)} />
    </div>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    {Icon && <div className="mb-4 text-neutral-400">{Icon}</div>}
    <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
    {description && <p className="text-sm text-neutral-500 mb-6">{description}</p>}
    {action && <div>{action}</div>}
  </div>
);

export { Avatar, Spinner, EmptyState };
