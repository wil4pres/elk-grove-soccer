export const WEATHER_CITIES = [
  { name: 'Elk Grove', lat: 38.4088, lon: -121.3716 },
  { name: 'Sacramento', lat: 38.5816, lon: -121.4944 },
  { name: 'Galt', lat: 38.2538, lon: -121.3002 },
  { name: 'Rancho Cordova', lat: 38.5891, lon: -121.3027 },
  { name: 'Rancho Murieta', lat: 38.4941, lon: -121.0922 },
]

export interface WeatherData {
  city: string
  tempF: number
  uvIndex: number
  windSpeedMph: number
  windDirection: string
  conditionLabel: string
  tempNote: string
  uvNote: string
  windNote: string
  uvLabel: string
}

function wmoWeatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code >= 1 && code <= 3) return 'Partly cloudy'
  if (code >= 45 && code <= 48) return 'Foggy'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code >= 85 && code <= 86) return 'Snow showers'
  if (code >= 95 && code <= 99) return 'Thunderstorm'
  return 'Mixed conditions'
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

async function fetchCityWeather(city: { name: string; lat: number; lon: number }): Promise<WeatherData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${city.lat}&longitude=${city.lon}` +
      `&current=temperature_2m,uv_index,wind_speed_10m,wind_direction_10m,weather_code` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles`

    const res = await fetch(url, { next: { revalidate: 900 } })
    if (!res.ok) return null

    const json = await res.json()
    const c = json.current
    const tempF = Math.round(c.temperature_2m)
    const uv = Math.round(c.uv_index)
    const windMph = Math.round(c.wind_speed_10m)
    const windDir = degreesToCompass(c.wind_direction_10m)
    const code = typeof c.weather_code === 'number' ? c.weather_code : 0

    return {
      city: city.name,
      tempF,
      uvIndex: uv,
      windSpeedMph: windMph,
      windDirection: windDir,
      conditionLabel: wmoWeatherLabel(code),
      tempNote: tempNote(tempF),
      uvLabel: uvLabel(uv),
      uvNote: uvNote(uv),
      windNote: windNote(windMph),
    }
  } catch {
    return null
  }
}

export async function getAllCitiesWeather(): Promise<WeatherData[]> {
  const results = await Promise.all(WEATHER_CITIES.map(fetchCityWeather))
  return results.filter((r): r is WeatherData => r !== null)
}

/** Elk Grove — primary club area; used on home game-day card. */
export async function getElkGroveWeather(): Promise<WeatherData | null> {
  return fetchCityWeather(WEATHER_CITIES[0])
}
