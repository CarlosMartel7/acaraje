import { code, imp } from "ts-poet";

const React = imp("React*react")
const TabsPrimitive = imp("TabsPrimitive*@radix-ui/react-tabs")
const cn = imp("cn@@/lib/utils")

export const writeTabsComponent = () => code`
const Tabs = ${TabsPrimitive}.Root;

const TabsList = ${React}.forwardRef<
  ${React}.ElementRef<typeof ${TabsPrimitive}.List>,
  ${React}.ComponentPropsWithoutRef<typeof ${TabsPrimitive}.List>
>(({ className, ...props }, ref) => (
  <${TabsPrimitive}.List
    ref={ref}
    className={${cn}(
      "inline-flex flex-wrap items-center gap-2 text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsList.displayName = ${TabsPrimitive}.List.displayName;

const TabsTrigger = ${React}.forwardRef<
  ${React}.ElementRef<typeof ${TabsPrimitive}.Trigger>,
  ${React}.ComponentPropsWithoutRef<typeof ${TabsPrimitive}.Trigger>
>(({ className, ...props }, ref) => (
  <${TabsPrimitive}.Trigger
    ref={ref}
    className={${cn}(
      "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border border-input bg-muted px-3.5 text-xs font-medium text-foreground/80 transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:border-primary data-[state=active]:bg-primary/15 data-[state=active]:text-primary",
      "data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-foreground",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = ${TabsPrimitive}.Trigger.displayName;

const TabsContent = ${React}.forwardRef<
  ${React}.ElementRef<typeof ${TabsPrimitive}.Content>,
  ${React}.ComponentPropsWithoutRef<typeof ${TabsPrimitive}.Content>
>(({ className, ...props }, ref) => (
  <${TabsPrimitive}.Content
    ref={ref}
    className={${cn}("mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background", className)}
    {...props}
  />
));
TabsContent.displayName = ${TabsPrimitive}.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
`.toString({ prefix: '// @ts-nocheck\n"use client";' });

export default writeTabsComponent;
