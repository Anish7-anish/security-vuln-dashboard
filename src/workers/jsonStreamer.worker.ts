/* eslint-disable no-restricted-globals */
// Placeholder worker file for streaming large JSON data.
self.onmessage = function (e) {
  const { url } = e.data as { url: string };
  // In a real implementation, the worker would fetch and stream-parse the JSON data.
  // For now, just log a message.
  console.warn('jsonStreamer.worker not yet implemented', url);
};