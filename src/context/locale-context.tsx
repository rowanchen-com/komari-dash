import { createContext, useCallback, useContext, useState, type ReactNode } from "react"

export const localeItems = [
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "zh-TW", name: "中文繁體" },
  { code: "zh", name: "中文简体" },
]

const messages: Record<string, Record<string, Record<string, string>>> = {
  zh: {
    Overview: { title: "概览", time: "当前时间" },
    ServerOverview: {
      total: "服务器总数", online: "在线服务器", offline: "离线服务器",
      network: "网络", error: "请检查服务器连接",
    },
    ServerList: { connecting: "连接中", error: "请检查服务器连接", defaultTag: "全部" },
    ServerCard: {
      CPU: "CPU", Mem: "内存", STG: "存储", Upload: "上传", Download: "下载",
      System: "系统", Uptime: "运行时间", TotalUpload: "总上传", TotalDownload: "总下载",
    },
    ServerDetail: {
      status: "状态", Online: "在线", Offline: "离线", Uptime: "运行时间",
      Arch: "架构", Mem: "内存", Disk: "磁盘", Region: "地区",
      Version: "版本",
      System: "系统", CPU: "CPU", Upload: "上传", Download: "下载",
      Load: "负载", Process: "进程", Swap: "虚拟内存", error: "获取服务器详情失败",
      tabDetail: "详情", tabNetwork: "网络",
      networkUnavailable: "网络延迟图表不可用",
      networkUnavailableDesc: "该节点暂无 Ping 监控任务数据。",
      LastActive: "最后上报时间", BootTime: "启动时间",
      Days: "天", Hours: "小时",
      monitorCount: "个监控任务", avgDelay: "平均延迟", packetLoss: "丢包率",
      peak_cut: "削峰",
    },
    ThemeSwitcher: { Light: "亮色", Dark: "暗色", System: "系统" },
    DashCommand: {
      TypeCommand: "输入命令或搜索...", NoResults: "没有找到结果。",
      Servers: "服务器", Shortcuts: "快捷操作",
      ToggleLightMode: "切换亮色模式", ToggleDarkMode: "切换暗色模式",
      ToggleSystemMode: "切换系统模式", Home: "首页",
    },
    Footer: { code: "代码开源在", copyright: "©" },
    Header: { desc: "简洁美观的监控面板" },
    NotFound: { title: "页面不存在", back: "返回首页" },
    Global: { distributions: "服务器分布在", regions: "个地区", servers: "台服务器" },
  },
  en: {
    Overview: { title: "Overview", time: "Current time" },
    ServerOverview: {
      total: "Total Servers", online: "Online", offline: "Offline",
      network: "Network", error: "Check server connection",
    },
    ServerList: { connecting: "Connecting", error: "Check server connection", defaultTag: "All" },
    ServerCard: {
      CPU: "CPU", Mem: "Mem", STG: "STG", Upload: "Upload", Download: "Download",
      System: "System", Uptime: "Uptime", TotalUpload: "Total Upload", TotalDownload: "Total Download",
    },
    ServerDetail: {
      status: "Status", Online: "Online", Offline: "Offline", Uptime: "Uptime",
      Arch: "Arch", Mem: "Mem", Disk: "Disk", Region: "Region",
      Version: "Version",
      System: "System", CPU: "CPU", Upload: "Upload", Download: "Download",
      Load: "Load", Process: "Process", Swap: "Swap", error: "Failed to fetch server details",
      tabDetail: "Detail", tabNetwork: "Network",
      networkUnavailable: "Network latency chart unavailable",
      networkUnavailableDesc: "No ping monitor task data available for this node.",
      LastActive: "Last Active", BootTime: "Boot Time",
      Days: "Days", Hours: "Hours",
      monitorCount: "Monitor Tasks", avgDelay: "Avg Delay", packetLoss: "Packet Loss",
      peak_cut: "Peak cut",
    },
    ThemeSwitcher: { Light: "Light", Dark: "Dark", System: "System" },
    DashCommand: {
      TypeCommand: "Type a command or search...", NoResults: "No results found.",
      Servers: "Servers", Shortcuts: "Shortcuts",
      ToggleLightMode: "Toggle Light Mode", ToggleDarkMode: "Toggle Dark Mode",
      ToggleSystemMode: "Toggle System Mode", Home: "Home",
    },
    Footer: { code: "Find the code on", copyright: "©" },
    Header: { desc: "Simple and beautiful dashboard" },
    NotFound: { title: "Page Not Found", back: "Back to Home" },
    Global: { distributions: "Distributed in", regions: "regions", servers: "Servers" },
  },
  ja: {
    Overview: { title: "概要", time: "現在時刻" },
    ServerOverview: {
      total: "サーバー総数", online: "オンライン", offline: "オフライン",
      network: "ネットワーク", error: "サーバー接続を確認してください",
    },
    ServerList: { connecting: "接続中", error: "サーバー接続を確認してください", defaultTag: "すべて" },
    ServerCard: {
      CPU: "CPU", Mem: "メモリ", STG: "ストレージ", Upload: "アップロード", Download: "ダウンロード",
      System: "システム", Uptime: "稼働時間", TotalUpload: "総アップロード", TotalDownload: "総ダウンロード",
    },
    ServerDetail: {
      status: "ステータス", Online: "オンライン", Offline: "オフライン", Uptime: "稼働時間",
      Arch: "アーキテクチャ", Mem: "メモリ", Disk: "ディスク", Region: "地域",
      Version: "バージョン",
      System: "システム", CPU: "CPU", Upload: "アップロード", Download: "ダウンロード",
      Load: "負荷", Process: "プロセス", Swap: "スワップ", error: "サーバー詳細の取得に失敗しました",
      tabDetail: "詳細", tabNetwork: "ネットワーク",
      networkUnavailable: "ネットワーク遅延チャートは利用できません",
      networkUnavailableDesc: "このノードにはPing監視タスクデータがありません。",
      LastActive: "最終アクティブ", BootTime: "起動時間",
      Days: "日", Hours: "時間",
      monitorCount: "個の監視タスク", avgDelay: "平均遅延", packetLoss: "パケットロス",
      peak_cut: "ピークカット",
    },
    ThemeSwitcher: { Light: "ライト", Dark: "ダーク", System: "システム" },
    DashCommand: {
      TypeCommand: "コマンドまたは検索...", NoResults: "結果が見つかりません。",
      Servers: "サーバー", Shortcuts: "ショートカット",
      ToggleLightMode: "ライトモード", ToggleDarkMode: "ダークモード",
      ToggleSystemMode: "システムモード", Home: "ホーム",
    },
    Footer: { code: "コードは", copyright: "©" },
    Header: { desc: "シンプルで美しいダッシュボード" },
    NotFound: { title: "ページが見つかりません", back: "ホームに戻る" },
    Global: { distributions: "サーバーは", regions: "地域に分布", servers: "台のサーバー" },
  },
  "zh-TW": {
    Overview: { title: "概覽", time: "當前時間" },
    ServerOverview: {
      total: "伺服器總數", online: "線上伺服器", offline: "離線伺服器",
      network: "網路", error: "請檢查伺服器連線",
    },
    ServerList: { connecting: "連線中", error: "請檢查伺服器連線", defaultTag: "全部" },
    ServerCard: {
      CPU: "CPU", Mem: "記憶體", STG: "儲存", Upload: "上傳", Download: "下載",
      System: "系統", Uptime: "運行時間", TotalUpload: "總上傳", TotalDownload: "總下載",
    },
    ServerDetail: {
      status: "狀態", Online: "線上", Offline: "離線", Uptime: "運行時間",
      Arch: "架構", Mem: "記憶體", Disk: "磁碟", Region: "地區",
      Version: "版本",
      System: "系統", CPU: "CPU", Upload: "上傳", Download: "下載",
      Load: "負載", Process: "程序", Swap: "虛擬記憶體", error: "取得伺服器詳情失敗",
      tabDetail: "詳情", tabNetwork: "網路",
      networkUnavailable: "網路延遲圖表不可用",
      networkUnavailableDesc: "該節點暫無 Ping 監控任務資料。",
      LastActive: "最後上報時間", BootTime: "啟動時間",
      Days: "天", Hours: "小時",
      monitorCount: "個監控任務", avgDelay: "平均延遲", packetLoss: "丟包率",
      peak_cut: "削峰",
    },
    ThemeSwitcher: { Light: "亮色", Dark: "暗色", System: "系統" },
    DashCommand: {
      TypeCommand: "輸入命令或搜尋...", NoResults: "沒有找到結果。",
      Servers: "伺服器", Shortcuts: "快捷操作",
      ToggleLightMode: "切換亮色模式", ToggleDarkMode: "切換暗色模式",
      ToggleSystemMode: "切換系統模式", Home: "首頁",
    },
    Footer: { code: "程式碼開源在", copyright: "©" },
    Header: { desc: "簡潔美觀的監控面板" },
    NotFound: { title: "頁面不存在", back: "返回首頁" },
    Global: { distributions: "伺服器分佈在", regions: "個地區", servers: "台伺服器" },
  },
}

function detectLang(): string {
  const stored = localStorage.getItem("i18nextLng")
  if (stored) {
    if (stored.startsWith("zh-TW") || stored.startsWith("zh-Hant")) return "zh-TW"
    if (stored.startsWith("zh")) return "zh"
    if (stored.startsWith("ja")) return "ja"
    return "en"
  }
  const nav = navigator.language
  if (nav.startsWith("zh-TW") || nav.startsWith("zh-Hant")) return "zh-TW"
  if (nav.startsWith("zh")) return "zh"
  if (nav.startsWith("ja")) return "ja"
  return "en"
}

function translate(lang: string, section: string, key: string): string {
  return messages[lang]?.[section]?.[key] ?? messages.en?.[section]?.[key] ?? key
}

interface LocaleContextType {
  locale: string
  setLocale: (lang: string) => void
  t: (section: string, key: string) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(detectLang)

  const setLocale = useCallback((lang: string) => {
    localStorage.setItem("i18nextLng", lang)
    setLocaleState(lang)
  }, [])

  const t = useCallback(
    (section: string, key: string) => translate(locale, section, key),
    [locale],
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider")
  return ctx
}
