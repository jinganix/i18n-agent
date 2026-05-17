export function replaceReducer<T>(x: T, y: T): T {
  return y ?? x;
}
