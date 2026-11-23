import { code } from "ts-poet";

export const writeGlobalsCss = () => code`
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Direction F — dark + orange */
    --scrollbar-thumb: 0 0% 100%;
    --background: 0 0% 8.2353%;
    --foreground: 0 0% 94.902%;
    --card: 0 0% 10.9804%;
    --card-foreground: 0 0% 94.902%;
    --popover: 0 0% 10.9804%;
    --popover-foreground: 0 0% 94.902%;
    --primary: 15.8 100% 56.0784%;
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 14.1176%;
    --secondary-foreground: 0 0% 94.902%;
    --muted: 0 0% 13.3333%;
    --muted-foreground: 0 0% 60.3922%;
    --accent: 0 0% 14.902%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 84.2365% 60.1961%;
    --destructive-foreground: 0 0% 100%;
    --success: 147.0968 69.5067% 55.098%;
    --warning: 44.3836 88.0383% 62.9412%;
    --info: 220 100% 78.0392%;
    --border: 0 0% 16.4706%;
    --input: 0 0% 20%;
    --ring: 15.8 100% 56.0784%;
    --chart-1: 44.3836 88.0383% 62.9412%;
    --chart-2: 15.8 100% 56.0784%;
    --chart-3: 256 100% 80.5882%;
    --chart-4: 147.0968 69.5067% 55.098%;
    --chart-5: 220 100% 78.0392%;
    --sidebar: 0 0% 9.8039%;
    --sidebar-foreground: 0 0% 94.902%;
    --sidebar-primary: 15.8 100% 56.0784%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 0 0% 14.902%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 0 0% 14.902%;
    --sidebar-ring: 15.8 100% 56.0784%;
    --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
    --radius: 0.625rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: hsl(var(--scrollbar-thumb) / 0.15);
    border-radius: 9999px;
  }

  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--scrollbar-thumb) / 0.15) transparent;
  }
}

@layer utilities {
  .font-mono {
    font-family: var(--font-mono);
  }
  .font-sans {
    font-family: var(--font-sans);
  }
  .text-rose-custom {
    color: oklch(var(--dusty-rose));
  }
  .animate-in {
    animation: fadeIn 0.35s ease-out forwards;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Sidebar — thin; transparent track */
  .sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--scrollbar-thumb) / 0.15) transparent;
  }
  .sidebar-scroll::-webkit-scrollbar {
    width: 3px;
    background: transparent;
  }
  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
    margin-block: 4px;
  }
  .sidebar-scroll::-webkit-scrollbar-thumb {
    background: hsl(var(--scrollbar-thumb) / 0.15);
    border-radius: 9999px;
  }
  .sidebar-scroll::-webkit-scrollbar-corner {
    background: transparent;
  }
}
`;

export default writeGlobalsCss;
