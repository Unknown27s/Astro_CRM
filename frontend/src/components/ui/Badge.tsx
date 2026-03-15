import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-700 border border-primary-200',
        secondary: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
        success: 'bg-success-100 text-success-700 border border-success-200',
        danger: 'bg-danger-100 text-danger-700 border border-danger-200',
        warning: 'bg-warning-100 text-warning-700 border border-warning-200',
        accent: 'bg-accent-100 text-accent-700 border border-accent-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
