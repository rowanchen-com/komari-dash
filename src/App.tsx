import { Routes, Route } from "react-router-dom"
import { lazy, Suspense } from "react"
import MainLayout from "./layouts/MainLayout"
import HomePage from "./pages/HomePage"
import NotFoundPage from "./pages/NotFoundPage"
import { Loader } from "./components/Loader"
import { DashCommand } from "./components/DashCommand"

const ServerDetailPage = lazy(() => import("./pages/ServerDetailPage"))

function LazyFallback() {
  return (
    <div className="mx-auto flex w-full max-w-5xl items-center justify-center py-20">
      <Loader visible />
    </div>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/server/:id"
            element={
              <Suspense fallback={<LazyFallback />}>
                <ServerDetailPage />
              </Suspense>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <DashCommand />
    </>
  )
}
