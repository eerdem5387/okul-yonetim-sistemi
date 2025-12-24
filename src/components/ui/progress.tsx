"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          value < 25 && "bg-red-500",
          value >= 25 && value < 50 && "bg-orange-500",
          value >= 50 && value < 75 && "bg-yellow-500",
          value >= 75 && "bg-green-500"
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }

