import { Outlet } from "react-router-dom"
import Header from "./Header"
import Footer from "./Footer"

export default function MainLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col gap-4 bg-background p-4 md:p-10 md:pt-8">
        <Header />
        <Outlet />
        <Footer />
      </main>
    </div>
  )
}
