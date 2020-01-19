import * as LRU from 'lru-cache';
import * as uuidv5 from 'uuid/v5';

export type PromiseInfer<T> = T extends Promise<infer R> ? R : T

export interface Options<T> {
  max?: number;
  async?: boolean;
  cacheAgeGetter?: (res: PromiseInfer<T>) => number;
  primitive?: boolean;
}

export type Func<T> = ((...args: any[]) => T) | ((...args: any[]) => Promise<PromiseInfer<T>>);

export const CACHE_KEY_NAMESPACE = '2a848cdb-6acd-48d5-ac74-970972c1038e';
export const KEY_JOINER = '\u200d';

function getCacheKey (args: any[], primitive?: boolean): string {
  if (primitive) return args.join(KEY_JOINER);
  const signature: string[] = [];
  for (const a of args) {
    signature.push(JSON.stringify(a));
  }
  return uuidv5(signature.join(KEY_JOINER), CACHE_KEY_NAMESPACE);
}

export default function funcache<T>(f: Func<T>, opts: Options<T>): Func<T> {
  const { max, async, primitive, cacheAgeGetter } = opts;
  const cache = new LRU({ max});

  if (async) {
    return (async function(...args: any[]) {
      const key = getCacheKey(args, primitive);
      if (cache.has(key)) return cache.get(key);
      const res = await f(...args) as PromiseInfer<T>;
      const age = cacheAgeGetter ? cacheAgeGetter(res) : 0;
      cache.set(key, res, age);
      return res;
    }) as Func<T>;
  }

  return (function(...args: any[]) {
    const key = getCacheKey(args, primitive);
    if (cache.has(key)) return cache.get(key);
    const res = f(...args) as PromiseInfer<T>;
    const age = cacheAgeGetter ? cacheAgeGetter(res) : 0;
    cache.set(key, res, age);
    return res;
  }) as Func<T>;
}
