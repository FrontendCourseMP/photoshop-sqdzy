export function yieldToBrowser(): Promise<void> {
  const scheduler = (
    globalThis as {
      scheduler?: { yield?: () => Promise<void> }
    }
  ).scheduler

  if (scheduler?.yield) {
    return scheduler.yield()
  }

  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

export function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}
