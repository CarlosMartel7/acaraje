import { code, imp } from "ts-poet";

const React = imp("React*react")
const cn = imp("cn@@/lib/utils")

export const writeInputComponent = () => code`
const Input = ${React}.forwardRef<HTMLInputElement, ${React}.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={${cn}(
          "flex h-10 w-full rounded-lg border border-input bg-muted px-3.5 py-2 text-sm text-foreground transition-colors",
          "placeholder:text-muted-foreground/70",
          "focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
`.toString({ prefix: "// @ts-nocheck" });

export default writeInputComponent;
