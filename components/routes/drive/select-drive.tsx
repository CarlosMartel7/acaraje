"use client";

import { Cloud, HardDrive, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DriveType } from "./types";

interface DriveOption {
  id: DriveType;
  name: string;
  icon: React.ElementType;
  description: string;
}

const DRIVE_OPTIONS: DriveOption[] = [
  {
    id: "google-drive",
    name: "Google Drive",
    icon: Cloud,
    description: "Upload files to a folder in your Google Drive",
  },
];

interface SelectDriveProps {
  value: DriveType;
  onChange: (value: DriveType) => void;
}

export function SelectDrive({ value, onChange }: SelectDriveProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          Select Drive (coming soon)
        </CardTitle>
        <CardDescription>Choose where to upload your files</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {DRIVE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                isSelected ? "border-primary-foreground/50 bg-primary/20" : "border-border/50 hover:border-border hover:bg-accent/50",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-primary-foreground/20" : "bg-secondary/50",
                )}
              >
                <Icon className={cn("w-5 h-5", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{option.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
              </div>
              {isSelected && <CheckCircle className="w-5 h-5 text-primary-foreground flex-shrink-0" />}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
