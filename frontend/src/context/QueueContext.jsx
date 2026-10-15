import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

const QueueContext = createContext(null)

/**
 * QueueProvider — one WebSocket connection for the whole app.
 *
 * Components call subscribe(departmentId) to register interest and get back an
 * unsubscribe function for their effect cleanup. Only the departments some
 * component still cares about are registered with the server, and they are
 * re-registered automatically after a reconnect.
 *
 * Includes auto-reconnect with exponential backoff (1s → 2s → 4s … max 30s).
 */
export const QueueProvider = ({ children }) => {
  const wsRef = useRef(null)
  const retryDelay = useRef(1000)
  const retryTimer = useRef(null)
  // Set once the provider unmounts, so a closing socket does not reconnect
  const disposedRef = useRef(false)
  // departmentId → how many components are watching it
  const subscriptionsRef = useRef(new Map())

  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState(null) // Latest WS message

  const send = useCallback((payload) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    }
  }, [])

  const connect = useCallback(() => {
    if (disposedRef.current) return

    // In dev, Vite proxy handles /ws → ws://localhost:5001/ws.
    // In production the API lives on another host, so VITE_WS_URL must be set —
    // Vercel rewrites do not proxy WebSockets.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${host}/ws`

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      // Disposed, or already replaced by a newer socket — let this one go
      if (disposedRef.current || wsRef.current !== ws) {
        ws.close()
        return
      }

      console.log('🔌 WebSocket connected')
      setConnected(true)
      retryDelay.current = 1000 // Reset backoff on successful connect

      // Re-register everything still being watched
      subscriptionsRef.current.forEach((_count, departmentId) => {
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', departmentId }))
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Broadcast to all subscribers via state update
        setLastEvent({ ...data, _ts: Date.now() })
      } catch (_) {
        /* ignore malformed messages */
      }
    }

    ws.onclose = () => {
      // A socket we already replaced (React 18 StrictMode remounts the
      // provider, so the first one closes after the second is live). Its
      // closing says nothing about the current connection, and reconnecting
      // from here would leave an extra socket open for good.
      if (wsRef.current !== ws) return

      setConnected(false)

      // The provider is gone — do not resurrect the connection
      if (disposedRef.current) return

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
    disposedRef.current = false
    connect()

    return () => {
      disposedRef.current = true
      clearTimeout(retryTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  /**
   * Watch a department's events. Returns the matching unsubscribe function,
   * so it can be returned straight from a useEffect.
   */
  const subscribe = useCallback(
    (departmentId) => {
      if (!departmentId) return () => {}

      const id = String(departmentId)
      const watchers = (subscriptionsRef.current.get(id) || 0) + 1
      subscriptionsRef.current.set(id, watchers)

      // Only the first watcher needs to tell the server
      if (watchers === 1) send({ type: 'SUBSCRIBE', departmentId: id })

      return () => {
        const remaining = (subscriptionsRef.current.get(id) || 1) - 1

        if (remaining > 0) {
          subscriptionsRef.current.set(id, remaining)
          return
        }

        subscriptionsRef.current.delete(id)
        send({ type: 'UNSUBSCRIBE', departmentId: id })
      }
    },
    [send]
  )

  return (
    <QueueContext.Provider value={{ connected, lastEvent, subscribe }}>
      {children}
    </QueueContext.Provider>
  )
}

export const useQueueSocket = () => useContext(QueueContext)
