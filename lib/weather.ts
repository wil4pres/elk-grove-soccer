// Elk Grove, CA coordinates
const LAT = 38.4088
const LON = -121.3716

export interface WeatherData {
  tempF: number
  uvIndex: number
  windSpeedMph: number
  windDirection: string
  tempNote: string
  uvNote: string
  windNote: string
  uvLabel: string
}

function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function tempNote(f: number): string {
  if (f < 32) return 'Freezing — dress warmly'
  if (f < 50) return 'Cold — layers recommended'
  if (f < 65) return 'Cool — light jacket advised'
  if (f < 80) return 'Comfortable for play'
  if (f < 90) return 'Warm — stay hydrated'
  return 'Hot — hydration essential'
}

function uvLabel(uv: number): string {
  if (uv <= 2) return 'Low'
  if (uv <= 5) return 'Moderate'
  if (uv <= 7) return 'High'
  if (uv <= 10) return 'Very High'
  return 'Extreme'
}

function uvNote(uv: number): string {
  if (uv <= 2) return 'No protection needed'
  if (uv <= 5) return 'Sunscreen recommended'
  if (uv <= 7) return 'Sun protection required'
  if (uv <= 10) return 'Extra protection needed'
  return 'Avoid sun exposure'
}

function windNote(mph: number): string {
  if (mph < 5) return 'Calm conditions'
  if (mph < 15) return 'Light breeze, no impact'
  if (mph < 25) return 'Moderate wind, some impact'
  return 'Strong wind, significant impact'
}

export async function getWeather(): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,uv_index,wind_speed_10m,wind_direction_10m` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles`

    const res = await fetch(url, { next: { revalidate: 900 } }) // cache 15 min
    if (!res.ok) return null

    const json = await res.json()
    const c = json.current

    const tempF = Math.round(c.temperature_2m)
    const uv = Math.round(c.uv_index)
    const windMph = Math.round(c.wind_speed_10m)
    const windDir = degreesToCompass(c.wind_direction_10m)

    return {
      tempF,
      uvIndex: uv,
      windSpeedMph: windMph,
      windDirection: windDir,
      tempNote: tempNote(tempF),
      uvLabel: uvLabel(uv),
      uvNote: uvNote(uv),
      windNote: windNote(windMph),
    }
  } catch {
    return null
  }
}
