let timerId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent) => {
  const { command, interval } = e.data;

  if (command === 'start') {
    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
      self.postMessage('tick');
    }, interval || 800);
  } else if (command === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
