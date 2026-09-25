import { UserCircleIcon } from "@heroicons/react/20/solid"
import { Button } from "@/components/ui/button"

export function LoginButton() {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="cursor-pointer rounded-full bg-white px-[9px] hover:bg-accent/50 dark:bg-black dark:hover:bg-accent/50"
      title="Login"
    >
      <a href="/admin/dashboard">
        <UserCircleIcon className="size-4" />
        <span className="sr-only">Login</span>
      </a>
    </Button>
  )
}
