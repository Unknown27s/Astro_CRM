import React from 'react';
import { cn } from '../../utils/cn';

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-neutral-700', className)}
      {...props}
    />
  )
);
Label.displayName = 'Label';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all cursor-pointer',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';

export { Label, Select };
