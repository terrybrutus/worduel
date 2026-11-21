import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Props = ComponentPropsWithoutRef<"button"> & { tooltip?: string };

/** Give named icon controls the same hover, focus, and touch-target behavior. */
export const AppButton = forwardRef<HTMLButtonElement, Props>(function AppButton(
  { tooltip, title, children, style, onKeyDown, type = "button", ...props }, ref,
) {
  const hint = tooltip ?? title ?? props["aria-label"];
  const button = (
    <button {...props} ref={ref} type={type}
      className={`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${props.className ?? ""}`}
      style={{ minHeight: 44, minWidth: 44, ...style }}
      onKeyDown={event => {
        onKeyDown?.(event);
        // Activating a tool must not also submit a guess through document listeners.
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      }}>
      {children}
    </button>
  );
  if (!hint) return button;
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent sideOffset={6} collisionPadding={12} className="max-w-[min(18rem,calc(100vw-24px))] break-words text-center">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
});
