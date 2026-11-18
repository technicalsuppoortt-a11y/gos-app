import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/modules/brand-engine/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--lb-radius-control,8px)] text-sm font-medium cursor-pointer transition-colors duration-[var(--lb-motion-fast,140ms)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[var(--lb-action,#007d70)] text-white shadow-none hover:bg-[var(--lb-action-hover,#00695e)] border-none",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        coral: "bg-coral text-coral-foreground shadow hover:bg-coral/90",
      },
      size: {
        default: "h-[var(--lb-control-height,38px)] px-4 py-2",
        sm: "h-[var(--lb-control-height-small,32px)] px-3 text-[13px]",
        lg: "h-11 px-6",
        icon: "h-[var(--lb-control-height,38px)] w-[var(--lb-control-height,38px)]",
        xl: "h-12 px-7 text-sm",
        "icon-sm": "h-[var(--lb-control-height-small,32px)] w-[var(--lb-control-height-small,32px)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
