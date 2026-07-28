import React, { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'white'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center font-urbanist font-semibold rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none'
    
    const variants = {
      primary: 'bg-[#6949FF] hover:bg-[#5536E6] text-white',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-[#212121] dark:bg-[#35383F] dark:hover:bg-[#424242] dark:text-white',
      outline: 'bg-white dark:bg-[#1F222A] border-[1.5px] border-[#6949FF] text-[#6949FF] hover:bg-[#F0EDFF] dark:hover:bg-[#2D2640]',
      ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-[#35383F] text-[#212121] dark:text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      white: 'bg-white hover:bg-gray-50 text-[#212121] border-[1.5px] border-[#E0E0E0] dark:bg-[#1F222A] dark:hover:bg-[#2D2640] dark:text-white dark:border-[#35383F]',
    }

    const sizes = {
      xs: 'text-[13px] px-5 py-1.5 gap-1.5',
      sm: 'text-[14px] px-5 py-2 gap-2',
      md: 'text-[14px] md:text-[16px] px-6 py-2.5 md:py-3 gap-2',
      lg: 'text-[16px] md:text-[18px] px-8 py-3.5 gap-2.5',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
