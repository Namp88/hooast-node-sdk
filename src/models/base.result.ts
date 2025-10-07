export interface BaseResult<T> {
  ok: boolean;
  result: T | null;
  error: string | null;
}
