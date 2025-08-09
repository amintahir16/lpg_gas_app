import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200",
        secondary:
          "bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200",
        destructive:
          "bg-red-100 text-red-800 hover:bg-red-200 border border-red-200",
        outline:
          "text-gray-700 border border-gray-300 bg-white hover:bg-gray-50",
        success:
          "bg-green-100 text-green-800 hover:bg-green-200 border border-green-200",
        warning:
          "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-200",
        info:
          "bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200",
        purple:
          "bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
