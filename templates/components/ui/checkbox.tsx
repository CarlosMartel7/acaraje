import { code, imp } from "ts-poet";

const React = imp("React*react")
const CheckboxPrimitive = imp("CheckboxPrimitive*@radix-ui/react-checkbox")
const Check = imp("Check@lucide-react")
const Minus = imp("Minus@lucide-react")
const cn = imp("cn@@/lib/utils")

export const writeCheckboxComponent = () => code`
const Checkbox = ${React}.forwardRef<
  ${React}.ElementRef<typeof ${CheckboxPrimitive}.Root>,
  ${React}.ComponentPropsWithoutRef<typeof ${CheckboxPrimitive}.Root>
>(({ className, ...props }, ref) => (
  <${CheckboxPrimitive}.Root
    ref={ref}
    className={${cn}(
      "group peer h-4 w-4 shrink-0 rounded border border-border bg-secondary/30 ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-primary-foreground data-[state=checked]:border-primary-foreground data-[state=checked]:text-primary",
      "data-[state=indeterminate]:bg-primary-foreground/80 data-[state=indeterminate]:border-primary-foreground/80 data-[state=indeterminate]:text-primary",
      className
    )}
    {...props}
  >
    <${CheckboxPrimitive}.Indicator
      className={${cn}("flex items-center justify-center text-current")}
    >
      <${Check} className="h-3 w-3 group-data-[state=indeterminate]:hidden" strokeWidth={2.5} />
      <${Minus} className="hidden h-3 w-3 group-data-[state=indeterminate]:block" strokeWidth={2.5} />
    </${CheckboxPrimitive}.Indicator>
  </${CheckboxPrimitive}.Root>
));
Checkbox.displayName = ${CheckboxPrimitive}.Root.displayName ?? "Checkbox";

export { Checkbox };
`.toString({ prefix: '// @ts-nocheck\n"use client";' });

export default writeCheckboxComponent;
