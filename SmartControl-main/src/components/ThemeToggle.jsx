import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const ThemeToggle = ({ className, showLabel = false }) => {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? 'sm' : 'icon'}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'theme-toggle',
        showLabel && 'gap-2 px-3',
        className
      )}
    >
      <Icon className="h-4 w-4" />
      {showLabel && <span className="hidden sm:inline">{isDark ? 'Modo claro' : 'Modo escuro'}</span>}
    </Button>
  );
};

export default ThemeToggle;
