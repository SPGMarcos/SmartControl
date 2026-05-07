import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import React from 'react';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: 'border border-transparent bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-sm shadow-[var(--shadow-color)] hover:bg-[var(--button-primary-hover)] active:scale-[0.99]',
				destructive:
          'border border-transparent bg-[var(--button-danger-bg)] text-[var(--button-danger-text)] shadow-sm hover:bg-[var(--button-danger-hover)] active:scale-[0.99]',
				outline:
          'border border-[var(--button-outline-border)] bg-[var(--button-outline-bg)] text-[var(--button-outline-text)] hover:border-[var(--accent-purple)] hover:bg-[var(--button-outline-hover)] hover:text-[var(--button-outline-hover-text)] active:scale-[0.99]',
				secondary:
          'border border-[var(--border-color)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:bg-[var(--button-secondary-hover)] active:scale-[0.99]',
        success:
          'border border-transparent bg-[var(--button-success-bg)] text-[var(--button-success-text)] hover:bg-[var(--button-success-hover)] active:scale-[0.99]',
				ghost: 'text-[var(--button-ghost-text)] hover:bg-[var(--button-ghost-hover)] hover:text-[var(--text-strong)]',
				link: 'text-[var(--link-color)] underline-offset-4 hover:text-[var(--link-hover)] hover:underline',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 rounded-md px-3',
				lg: 'h-11 rounded-md px-8',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : 'button';
	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			ref={ref}
			{...props}
		/>
	);
});
Button.displayName = 'Button';

export { Button, buttonVariants };
