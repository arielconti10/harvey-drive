"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ExplorerSelectionCheckboxProps
  extends Omit<React.ComponentProps<typeof Checkbox>, "checked" | "onCheckedChange"> {
  itemId: string;
  isSelected: boolean;
  onToggle: (itemId: string, selected: boolean) => void;
}

export function ExplorerSelectionCheckbox({
  itemId,
  isSelected,
  onToggle,
  className,
  onClick,
  ...rest
}: ExplorerSelectionCheckboxProps) {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={(checked) => onToggle(itemId, Boolean(checked))}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={cn(className)}
      {...rest}
    />
  );
}
