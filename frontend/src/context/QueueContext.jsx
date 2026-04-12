import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

const QueueContext = createContext(null)

/**
 * QueueProvider — manages a single WebSocket connection for the whole app.
 *
 * Components subscribe by department ID.
 * When the server broadcasts a QUEUE_UPDATE event for their department,
 * they receive a `lastEvent` object and can re-fetch data.
 *
 * Includes auto-reconnect with exponential backoff (1s → 2s → 4s → max 30s).
 */
export const QueueProvider = ({ children }) => {
  const wsRef         = useRef(null)
  const retryDelay    = useRef(1000)
  const retryTimer    = useRef(null)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState(null)   // Latest WS message

  const connect = useCallback(() => {
    // In dev, Vite proxy handles /ws → ws://localhost:5001/ws
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${host}/ws`;


    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('🔌 WebSocket connected')
      setConnected(true)
      retryDelay.current = 1000 // Reset backoff on successful connect
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Broadcast to all subscribers via state update
        setLastEvent({ ...data, _ts: Date.now() })
      } catch (_) { /* ignore malformed messages */ }
    }

    ws.onclose = () => {
      setConnected(false)
      console.log(`🔌 WebSocket disconnected. Reconnecting in ${retryDelay.current}ms...`)
      // Exponential backoff: 1s, 2s, 4s, 8s ... max 30s
      retryTimer.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30000)
        connect()
      }, retryDelay.current)
    }

    ws.onerror = () => ws.close() // Trigger onclose → reconnect
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(retryTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return (
    <QueueContext.Provider value={{ connected, lastEvent }}>
      {children}
    </QueueContext.Provider>
  )
}

export const useQueueSocket = () => useContext(QueueContext)
