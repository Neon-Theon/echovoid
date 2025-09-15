import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Start with false to prevent layout shifts, will be corrected immediately on client
  const [isMobile, setIsMobile] = React.useState<boolean>(false)

  React.useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === "undefined") return

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Use consistent logic: matchMedia.matches for both initial state and changes
    const onChange = () => {
      setIsMobile(mql.matches)
    }

    // Set initial state using the same logic as onChange
    setIsMobile(mql.matches)
    
    // Add event listener using the newer API pattern
    mql.addEventListener("change", onChange)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
