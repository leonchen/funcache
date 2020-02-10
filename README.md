# funcache

A helper tool to cache function results, based on [lru-cache](https://github.com/isaacs/node-lru-cache), inspired by [memoizee](https://github.com/medikoo/memoizee).

## Difference with memoizee

`memoizee` is very useful, but it lacks the ability for **conditional caching** and this is `funcache` mainly for.

One simple case of **conditional caching** is, saying there is an api that returns the result of a workflow, and you want to cache the api response only when the its status is `completed`. There is no direct way to achieve this by using `memoizee` as it doesn't deal with the function result. With `funcache` you can simply set the option like this:

```
cacheAgeGetter: (res) => {
  if (res.status === 'completed') return 0; // 0 means infinity
  return -1; // -1 means no cache
}

```

## Install

```
npm install funcache
```

## Usage

```
import funcache from 'funcache';

type Result = {
  error?: string;
  data?: string[];
}

const cachedFunc = funcache(async (arg: string) => {
  try {
    const data = await getData(arg);
    return { data };
  } catch (e) {
    return { error: e.message };
  }
}, {
  max: 100,
  async: true,
  primitive: true,
  cacheAgeGetter: (ret) => {
    if (ret.error) return -1;
    return 60000;
  }
});
const erroredResp = cachedFunc('nonexistId');
const erroredResp1 = cachedFunc('nonexistId'); // not cached
const resp = cachedFunc('id');
const resp1 = cachedFunc('id'); // cached
```

## Options
* `max`: The maximum size of the cache for this function. Default is `Infinity`. Setting it to `0` also makes it be `Infinity`.
* `primitive`: If all the arguments are strings, use them to get the cache key directly instead of hashing. This should improve the performance a bit. Default is `false'.
* `async`: To cache the resolved values instead of the returned promise. Default is `false`. You may probably always want it to be `true` for async functions.
* `cacheAgeGetter`: An optional custom function to get the cache ttl (in milliseconds) based on the function return(resolved). Return `-1` will cause no-caching at all. This will be passed to the `set` function of `lru-cache`. Default is `0`. The example code above shows an use case for this option.
