import * as React from "react"

import { cn } from "@/lib/utils"

export interface TooltipProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  content: React.ReactNode
  children: React.ReactElement
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ className, content, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false)

    return (
      <div
        ref={ref}
        className="relative inline-block"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        {...props}
      >
        {children}
        {isVisible && (
          <div
            className={cn(
              "absolute z-50 px-3 py-2 text-sm text-popover-foreground bg-popover border border-border rounded-lg shadow-lg pointer-events-none whitespace-nowrap",
              "bottom-full left-1/2 -translate-x-1/2 mb-2",
              className
            )}
          >
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="w-2 h-2 bg-popover border-r border-b border-border rotate-45" />
            </div>
          </div>
        )}
      </div>
    )
  }
)
Tooltip.displayName = "Tooltip"

export { Tooltip }
