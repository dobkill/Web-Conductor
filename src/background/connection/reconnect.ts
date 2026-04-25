import { wait } from "../../shared/utils/time";

export async function backoffReconnect(attempt: number): Promise<void> {
  const delay = Math.min(1000 * 2 ** attempt, 10_000);
  await wait(delay);
}
