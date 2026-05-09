function outer() {
  return function inner() {
    return 1;
  }.apply(this, arguments);
}
