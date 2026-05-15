import { avatarInitials } from "./chat-utils"

interface AvatarProps {
  name: string
  size?: "sm" | "md" | "lg"
  variant?: "user" | "group" | "announcement"
}

export function Avatar({ name, size = "md", variant = "user" }: AvatarProps) {
  const sizeCls =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm"
  const palette =
    variant === "announcement"
      ? "bg-amber-100 text-amber-700"
      : variant === "group"
        ? "bg-indigo-100 text-indigo-700"
        : "bg-blue-100 text-blue-700"
  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold ${sizeCls} ${palette} flex-shrink-0`}
      aria-hidden="true"
    >
      {avatarInitials(name)}
    </div>
  )
}
