import { UserCircleIcon } from "@heroicons/react/20/solid"
import { Button } from "@/components/ui/button"

export function LoginButton() {
  return (
    <a href="/admin">
      <Button
        variant="outline"
        size="sm"
        className="cursor-pointer rounded-full bg-white px-[9px] hover:bg-accent/50 dark:bg-black dark:hover:bg-accent/50"
        title="Login"
      >
        <UserCircleIcon className="size-4" />
        <span className="sr-only">Login</span>
      </Button>
    </a>
  )
}
