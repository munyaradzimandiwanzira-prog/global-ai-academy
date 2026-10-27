import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * One button system for the whole product (see the premium-frontend skill, §4).
 *
 *   variant  contained (high emphasis) · outlined (medium) · text (low)
 *   color    primary (ink) · action (teal, "run/go") · accent (gold) · danger · light (on dark fields)
 *   size     sm 32px · md 40px · lg 48px
 *
 * Pill-shaped everywhere. Loading keeps the label and width, swaps the start icon for a spinner,
 * sets aria-busy and blocks clicks.
 */
export type ButtonVariant = 'contained' | 'outlined' | 'text';
export type ButtonColor = 'primary' | 'action' | 'accent' | 'danger' | 'light';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, Partial<Record<ButtonColor, string>>> = {
  contained: { primary: 'btn-primary', action: 'btn-run', accent: 'btn-gold', danger: 'btn-danger', light: 'btn bg-white text-ink hover:bg-sand' },
  outlined: { primary: 'btn-outline', action: 'btn-outline-run', accent: 'btn border-[1.5px] border-gold bg-transparent text-gold-600 hover:bg-gold/10', danger: 'btn border-[1.5px] border-red-700 text-red-700 hover:bg-red-700/[.06]', light: 'btn-outline-light' },
  text: { primary: 'btn-ghost', action: 'btn-text-run', accent: 'btn bg-transparent px-3 text-gold-600 hover:bg-gold/10', danger: 'btn bg-transparent px-3 text-red-700 hover:bg-red-700/[.06]', light: 'btn bg-transparent px-3 text-white hover:bg-white/10' },
};

export function buttonClass({ variant = 'contained', color = 'primary', size = 'md', fullWidth }: StyleProps = {}, extra?: string) {
  return cn(VARIANT_CLASS[variant][color] ?? 'btn-primary', size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', fullWidth && 'w-full', extra);
}

interface ContentProps {
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  loading?: boolean;
  children?: ReactNode;
}

function Content({ startIcon, endIcon, loading, children }: ContentProps) {
  return (
    <>
      {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : startIcon}
      {children}
      {endIcon}
    </>
  );
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>, StyleProps, ContentProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, color, size, fullWidth, startIcon, endIcon, loading, className, children, disabled, type = 'button', onClick, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, color, size, fullWidth }, className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      {...rest}
    >
      <Content startIcon={startIcon} endIcon={endIcon} loading={loading}>{children}</Content>
    </button>
  ),
);
Button.displayName = 'Button';

export interface ButtonLinkProps extends Omit<LinkProps, 'color'>, StyleProps, Omit<ContentProps, 'loading'> {}

/** A router link that looks like a button (navigation is a link, never a button with onClick). */
export function ButtonLink({ variant, color, size, fullWidth, startIcon, endIcon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass({ variant, color, size, fullWidth }, className)} {...rest}>
      <Content startIcon={startIcon} endIcon={endIcon}>{children}</Content>
    </Link>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  /** Required: icon-only buttons must say what they do. */
  'aria-label': string;
  size?: ButtonSize;
  tone?: 'default' | 'light';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({ className, size = 'md', tone = 'default', type = 'button', children, ...rest }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'btn px-0',
      size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10',
      tone === 'light' ? 'text-white hover:bg-white/10' : 'text-fg hover:bg-fg/[.07]',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
));
IconButton.displayName = 'IconButton';
