import { code, imp } from "ts-poet";

const React = imp("React*react")
const Slot = imp("Slot@@radix-ui/react-slot")
const cva = imp("cva@class-variance-authority")
const cn = imp("cn@@/lib/utils")

export const writeButtonComponent = () => code`
const buttonVariants = ${cva}(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "border border-destructive/40 bg-transparent text-red-400 hover:bg-destructive/10",
        outline: "border border-input bg-transparent text-foreground hover:bg-secondary",
        secondary: "border border-input bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
        lg: "h-11 px-6 text-sm",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonProps = Ui.ButtonProps;

const Button = ${React}.forwardRef<HTMLButtonElement, Ui.ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? ${Slot} : "button";
    return (
      <Comp
        className={${cn}(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
`.toString({ prefix: "// @ts-nocheck" });

export default writeButtonComponent;
