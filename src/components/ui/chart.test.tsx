import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { ChartContainer, ChartLegendContent } from "@/components/ui/chart"

vi.mock("recharts", async (importOriginal) => ({
  ...await importOriginal<typeof import("recharts")>(),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe("ChartLegendContent", () => {
  it("shows the configured task name instead of the metric key", () => {
    const html = renderToStaticMarkup(
      <ChartContainer config={{ ping_1: { label: "Guangzhou Mobile" } }}>
        <ChartLegendContent payload={[{ dataKey: "ping_1", value: "ping_1", color: "#2563eb" }]} />
      </ChartContainer>,
    )

    expect(html).toContain("Guangzhou Mobile")
    expect(html).not.toContain(">ping_1<")
  })
})
