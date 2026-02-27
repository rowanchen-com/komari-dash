import { Progress } from "@/components/ui/progress"

export default function ServerUsageBar({ value }: { value: number }) {
  return (
    <Progress
      value={value}
      indicatorClassName={
        value > 90 ? "bg-red-500" : value > 70 ? "bg-orange-400" : "bg-green-500"
      }
      className="h-[3px] rounded-sm bg-stone-200 dark:bg-stone-800"
    />
  )
}
