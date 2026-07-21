/**
 * Bounded concurrency helper — protects clients under bulk metadata loads.
 */
window.WIZNERDZ_POOL = {
  mapLimit: async function (items, limit, worker) {
    limit = Math.max(1, limit || 4);
    const ret = new Array(items.length);
    let i = 0;
    async function run() {
      while (i < items.length) {
        const idx = i++;
        ret[idx] = await worker(items[idx], idx);
      }
    }
    const runners = [];
    for (let k = 0; k < Math.min(limit, items.length); k++) runners.push(run());
    await Promise.all(runners);
    return ret;
  },
};
