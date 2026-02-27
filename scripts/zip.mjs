import { createWriteStream } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import archiver from "archiver"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const output = createWriteStream(resolve(root, "KomariDash.zip"))
const archive = archiver("zip", { zlib: { level: 9 } })

output.on("close", () => {
  console.log(`✅ KomariDash.zip created (${(archive.pointer() / 1024).toFixed(1)} KB)`)
})

archive.on("error", (err) => { throw err })
archive.pipe(output)

// Add komari-theme.json at root
archive.file(resolve(root, "komari-theme.json"), { name: "komari-theme.json" })

// Add preview image
archive.file(resolve(root, "preview.png"), { name: "preview.png" })

// Add dist/ directory
archive.directory(resolve(root, "dist"), "dist")

archive.finalize()
