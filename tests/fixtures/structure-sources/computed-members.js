function proxy(a, b) {
  return target(a, b);
}

const alias = original;
const out = proxy(one, two);
console['log'](`ok`);
