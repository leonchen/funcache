import { expect } from 'chai';
import funcache from './';

type Ret = { a: string };

const sleep = async function (ms: number) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
};

describe('funcache tests', () => {
  it('should cache', () => {
    let called: number = 0;
    const f = (_a: string, _b: number, _c: boolean, _d: object): string => {
      called += 1;
      return 'called';
    };
    const cf = funcache(f, { async: false });

    let res = cf('1', 1, true, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(1);
    res = cf('1', 1, true, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(1);

    res = cf('a', 1, true, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(2);
    res = cf('a', 1, true, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(2);

    res = cf('1', 2, true, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(3);
    res = cf('1', 2, true, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(3);

    res = cf('a', 1, false, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(4);
    res = cf('a', 1, false, { a: 1 });
    expect(res).to.eql('called');
    expect(called).to.eql(4);

    res = cf('a', 1, false, { a: 0 });
    expect(res).to.eql('called');
    expect(called).to.eql(5);
    res = cf('a', 1, false, { a: 0 });
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
        } else {
          return 100;
        }
      },
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
    let called: number = 0;

    const f = async function (a: string): Promise<Ret> {
      called += 1;
      await sleep(100);
      if (a === '') throw new Error('error');
      return { a };
    };

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

  it('should work for class methods', async () => {
    class TestClass {
      called: number = 0;
      asyncCalled: number = 0;

      run = funcache(
        (s: string): string => {
          this.called += 1;
          return s;
        },
        {
          primitive: true,
          cacheAgeGetter: (res: string) => {
            if (res === '') {
              return -1;
            } else {
              return 100;
            }
          },
        }
      );

      asyncRun = funcache(
        async (a: string): Promise<Ret> => {
          this.asyncCalled += 1;
          await sleep(100);
          if (a === '') throw new Error('error');
          return { a };
        },
        {
          async: true,
          primitive: true,
          cacheAgeGetter: (res: Ret) => {
            if (res.a === '1') {
              return -1;
            } else {
              return 100;
            }
          },
        }
      );
    }

    const tc = new TestClass();

    // sync method
    let res = tc.run('');
    expect(res).to.eql('');
    expect(tc.called).to.eql(1);

    await sleep(10);
    res = tc.run('');
    expect(res).to.eql('');
    expect(tc.called).to.eql(2);

    res = tc.run('a');
    expect(res).to.eql('a');
    expect(tc.called).to.eql(3);

    await sleep(90);
    res = tc.run('a');
    expect(res).to.eql('a');
    expect(tc.called).to.eql(3);

    await sleep(20);
    res = tc.run('a');
    expect(res).to.eql('a');
    expect(tc.called).to.eql(4);

    // async method
    let asyncRes = await tc.asyncRun('a');
    expect(asyncRes.a).to.eql('a');
    expect(tc.asyncCalled).to.eql(1);
    asyncRes = await tc.asyncRun('a');
    expect(asyncRes.a).to.eql('a');
    expect(tc.asyncCalled).to.eql(1);
    asyncRes = await tc.asyncRun('b');
    expect(asyncRes.a).to.eql('b');
    expect(tc.asyncCalled).to.eql(2);

    let catched = false;
    try {
      asyncRes = await tc.asyncRun('');
    } catch (e) {
      catched = true;
    }
    expect(catched).to.eql(true);
    expect(tc.asyncCalled).to.eql(3);

    asyncRes = await tc.asyncRun('1');
    expect(asyncRes.a).to.eql('1');
    expect(tc.asyncCalled).to.eql(4);
    asyncRes = await tc.asyncRun('1');
    expect(asyncRes.a).to.eql('1');
    expect(tc.asyncCalled).to.eql(5);
  });
});
