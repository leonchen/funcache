import * as LRU from 'lru-cache';
import * as uuidv5 from 'uuid/v5';

export type PromiseInfer<T> = T extends Promise<infer R> ? R : T;

export interface Options<T> {
  max?: number;
  async?: boolean;
  cacheAgeGetter?: (res: T) => number;
  primitive?: boolean;
  cacheNamespace?: string;
}

export type SyncFunc<T> = (...args: any[]) => T;
export type AsyncFunc<T> = (...args: any[]) => Promise<T>;
export type Func<T> = SyncFunc<T> | AsyncFunc<T>;

export const CACHE_KEY_NAMESPACE = '2a848cdb-6acd-48d5-ac74-970972c1038e';
export const KEY_JOINER = '\u200d';

function getCacheKey(args: any[], primitive: boolean, namespace: string): string {
  if (primitive) return args.join(KEY_JOINER);
  const signature: string[] = [];
  for (const a of args) {
    signature.push(JSON.stringify(a));
  }
  return uuidv5(signature.join(KEY_JOINER), namespace);
}

export default function funcache<T, R extends Func<T>>(f: R, opts: Options<T>): R {
  const {
    max,
    async = false,
    primitive = false,
    cacheAgeGetter,
    cacheNamespace = CACHE_KEY_NAMESPACE,
  } = opts;
  const cache = new LRU({ max });

  if (async) {
    return async function (...args: any[]) {
      const key = getCacheKey(args, primitive, cacheNamespace);
      if (cache.has(key)) return cache.get(key);
      const res = (await f(...args)) as T;
      const age = cacheAgeGetter ? cacheAgeGetter(res) : 0;
      cache.set(key, res, age);
      return res;
    } as R;
  }

  return function (...args: any[]) {
    const key = getCacheKey(args, primitive, cacheNamespace);
    if (cache.has(key)) return cache.get(key);
    const res = f(...args) as T;
    const age = cacheAgeGetter ? cacheAgeGetter(res) : 0;
    cache.set(key, res, age);
    return res;
  } as R;
}
