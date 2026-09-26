const KOMARI_DEFAULT_DESCRIPTION = "A simple server monitor tool."

export function resolveSiteDescription(description: string | undefined, localizedDefault: string): string {
  const value = description?.trim()
  return !value || value === KOMARI_DEFAULT_DESCRIPTION ? localizedDefault : value
}
