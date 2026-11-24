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
          toast:
            "group toast group-[.toaster]:rounded-xl group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/40",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
`.toString({ prefix: '// @ts-nocheck\n"use client";' });

export default writeSonnerComponent;
