/* eslint-disable no-restricted-globals */
import { Vulnerability } from "../data/types";

type Msg = 
  | { type: 'chunk'; items: Vulnerability[] }
  | { type: 'done'; count: number }
  | { type: 'error'; error: string };


self.onmessage = async(e: MessageEvent) => {
  const { url } = e.data;
  try {
    const res = await fetch(url);
    const json = await res.json();

    const items: Vulnerability[] = [];
    for (const [groupName, group] of Object.entries(json.groups || {})) {
      for (const [repoName, repo] of Object.entries((group as any).repos || {})) {
        for (const [imageName, image] of Object.entries((repo as any).images || {})) {
          const vulns = (image as any).Vulnerabilities || [];
          vulns.forEach((v: any, idx: number) =>
            items.push({
              id: `$(groupName)-${repoName}-${imageName}-${idx}`,
              ...v,
              groupName,
              repoName,
              imageName,
            }),
          );
        }
      }
    }
    (self as any).postMessage({ type: 'chunk', items})
    (self as any).postMessage({ type: 'done', count: items.length});
  } catch (err:any) {
    (self as any).postMessage({ type: 'error', error: err.message});
  }
};