import { code, imp } from "ts-poet";

const Sonner = imp("Toaster:Sonner@sonner")

export const writeSonnerComponent = () => code`
type ToasterProps = React.ComponentProps<typeof ${Sonner}>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <${Sonner}
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
`.toString({ prefix: '// @ts-nocheck\n"use client";' });

export default writeSonnerComponent;
