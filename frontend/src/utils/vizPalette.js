import { useEffect, useState } from 'react'

/**
 * Chart colours.
 *
 * Two selected sets — the dark one is the same eight hues stepped for a dark
 * surface, not an automatic flip. Both were validated against the surfaces the
 * admin cards actually render on (#ffffff and #0f172a): lightness band, chroma
 * floor, colour-blind separation of adjacent slots, and contrast.
 *
 * Slots are assigned in fixed order and never cycled — a department keeps its
 * colour even when a filter changes how many are on screen.
 */
export const SERIES_LIGHT = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

export const SERIES_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
]

/**
 * Sequential blue ramp for the heatmap, ordered near-surface → far.
 * On the dark surface magnitude increases with lightness, so an empty hour
 * recedes into the card rather than shouting in dark blue.
 */
export const HEAT_LIGHT = ['#eef4fd', '#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#184f95']
export const HEAT_DARK = ['#16233a', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4']

// surface is the card the chart sits on — stacked segments are separated by a
// 2px stroke in this colour rather than a gap recharts cannot draw
export const CHROME_LIGHT = {
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#52514e',
  surface: '#ffffff',
}
export const CHROME_DARK = {
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#c3c2b7',
  surface: '#0f172a',
}

/** Tracks the `dark` class the app toggles on <html> */
export const useIsDarkTheme = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    )

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return isDark
}

/** The colours for whichever surface the chart is currently sitting on */
export const useVizPalette = () => {
  const isDark = useIsDarkTheme()

  return {
    isDark,
    series: isDark ? SERIES_DARK : SERIES_LIGHT,
    heat: isDark ? HEAT_DARK : HEAT_LIGHT,
    chrome: isDark ? CHROME_DARK : CHROME_LIGHT,
  }
}

/** Fixed slot for a department, so its colour never moves between charts */
export const seriesColour = (series, index) => series[index % series.length]
