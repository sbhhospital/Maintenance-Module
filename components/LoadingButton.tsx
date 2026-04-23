import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
    isLoading,
    loadingText,
    children,
    className,
    disabled,
    icon,
    ...props
}) => {
    return (
        <button
            disabled={isLoading || disabled}
            className={cn(
                "flex items-center justify-center gap-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingText || children}</span>
                </>
            ) : (
                <>
                    {icon}
                    <span>{children}</span>
                </>
            )}
        </button>
    );
};

export default LoadingButton;
