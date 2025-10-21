/* eslint-disable no-restricted-globals */
import type { Vulnerability } from '../data/types';

type Msg =
  | { type: 'chunk'; items: Vulnerability[] }
  | { type: 'done'; count: number }
  | { type: 'error'; error: string };

self.onmessage = async (e: MessageEvent) => {
  const { url } = e.data;
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Worker received text (first 200 chars):', text.slice(0, 200));
      // Only once!
    const json = JSON.parse(text);

    const items: Vulnerability[] = [];
    const CHUNK_SIZE = 5000;

    for (const [groupName, group] of Object.entries(json.groups || {})) {
      for (const [repoName, repo] of Object.entries((group as any).repos || {})) {
        for (const [imageName, image] of Object.entries((repo as any).images || {})) {
          const vulns = (image as any).vulnerabilities || [];
          for (let i = 0; i < vulns.length; i += CHUNK_SIZE) {
            const slice = vulns.slice(i, i + CHUNK_SIZE).map((v: any, idx: number) => ({
              id: `${groupName}-${repoName}-${imageName}-${i + idx}`,
              ...v,
              groupName,
              repoName,
              imageName,
            }));
            //console.log('Sent chunk of', slice.length); 
            self.postMessage({ type: 'chunk', items: slice });
          }
        }
      }
    }
    self.postMessage({ type: 'done', count: 'completed' });

  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message });
  }
};
