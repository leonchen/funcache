import { expect } from 'chai';
import funcache from './';

const sleep = async function(ms: number) {
  return new Promise(res => {
    setTimeout(res, ms);
  })
};

describe('funcache tests', () => {
  it('should cache', () => {
    let called: number = 0;
    const f = (_a: string, _b: number, _c: boolean, _d: object): string => {
      called += 1;
      return 'called';
    };
    const cf = funcache(f, { async: false });

    let res = cf('1', 1, true, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(1);
    res = cf('1', 1, true, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(1);

    res = cf('a', 1, true, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(2);
    res = cf('a', 1, true, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(2);

    res = cf('1', 2, true, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(3);
    res = cf('1', 2, true, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(3);

    res = cf('a', 1, false, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(4);
    res = cf('a', 1, false, {a: 1});
    expect(res).to.eql('called');
    expect(called).to.eql(4);

    res = cf('a', 1, false, {a: 0});
    expect(res).to.eql('called');
    expect(called).to.eql(5);
    res = cf('a', 1, false, {a: 0});
    expect(res).to.eql('called');
    expect(called).to.eql(5);
  });

  it('should cache with ttl', async () => {
    let called: number = 0;
    const f = (a: string): string => {
      called += 1;
      return a;
    };
    const cf = funcache(f, {
      async: false,
      primitive: true,
      cacheAgeGetter: (res: string) => {
        if (res === '') {
          return -1;
        } else  {
          return 100;
        }
      }
    });

    let res = cf('');
    expect(res).to.eql('');
    expect(called).to.eql(1);

    await sleep(10);
    res = cf('');
    expect(res).to.eql('');
    expect(called).to.eql(2);

    res = cf('a');
    expect(res).to.eql('a');
    expect(called).to.eql(3);

    await sleep(90);
    res = cf('a');
    expect(res).to.eql('a');
    expect(called).to.eql(3);

    await sleep(20);
    res = cf('a');
    expect(res).to.eql('a');
    expect(called).to.eql(4);
  });

  it('should work for async functions', async () => {
    type Ret = { a: string };

    let called: number = 0;

    const f = async function (a: string): Promise<Ret> {
      called += 1;
      await sleep(100);
      if (a === '') throw new Error('error');
      return { a };
    }

    const cf: (a: string) => Promise<Ret> = funcache(f, {
      primitive: true,
      async: true,
    });
    let res = await cf('a');
    expect(res.a).to.eql('a');
    expect(called).to.eql(1);
    res = await cf('a');
    expect(res.a).to.eql('a');
    expect(called).to.eql(1);
    res = await cf('b');
    expect(res.a).to.eql('b');
    expect(called).to.eql(2);

    let catched = false;
    try {
      res = await cf('');
    } catch (e) {
      catched = true;
    }
    expect(catched).to.eql(true);
    expect(called).to.eql(3);
  });
});
