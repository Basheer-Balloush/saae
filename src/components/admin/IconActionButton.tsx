import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: "ghost" | "outline" | "secondary" | "destructive";
  className?: string;
  iconClassName?: string;
};

/**
 * Icon-only admin action with a real tooltip on pointer devices.
 * On touch/coarse-pointer devices (tablets), where hover never happens,
 * the text label is rendered inline instead of being hidden.
 */
export const IconActionButton = forwardRef<HTMLButtonElement, Props>(
  function IconActionButton(
    { icon: Icon, label, onClick, pending, disabled, variant = "ghost", className, iconClassName },
    ref,
  ) {
    return (
      <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            type="button"
            variant={variant}
            size="icon"
            aria-label={label}
            onClick={onClick}
            disabled={disabled || pending}
            className={cn(
              "[@media(pointer:coarse)]:w-auto [@media(pointer:coarse)]:gap-1.5 [@media(pointer:coarse)]:px-3",
              className,
            )}
          >
            {pending ? (
              <Loader2 className={cn("h-4 w-4 animate-spin", iconClassName)} />
            ) : (
              <Icon className={cn("h-4 w-4", iconClassName)} />
            )}
            <span className="hidden text-xs [@media(pointer:coarse)]:inline">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      </TooltipProvider>
    );
  },
);
