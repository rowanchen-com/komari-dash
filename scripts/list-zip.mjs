import { execSync } from "child_process"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const zipPath = resolve(root, "KomariDash.zip")

// Use PowerShell to list zip contents
const cmd = `powershell -command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, '\\\\')}').Entries | ForEach-Object { Write-Host $_.FullName '|' $_.Length }"`
const output = execSync(cmd, { encoding: "utf-8" })
console.log(output)
