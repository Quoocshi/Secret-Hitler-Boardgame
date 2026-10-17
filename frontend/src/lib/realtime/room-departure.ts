import { ApiError } from "@/lib/api/errors";

const MEMBERSHIP_CHECK_INTERVAL_MS = 250;

function waitForMembershipCheck(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, MEMBERSHIP_CHECK_INTERVAL_MS);
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Publishing is not an acknowledgement: only lost membership confirms departure. */
export async function waitForMembershipRemoval(
  readMembership: () => Promise<unknown>,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    try {
      await readMembership();
    } catch (error) {
      if (
        error instanceof ApiError &&
        ["INVALID_SESSION", "ROOM_NOT_FOUND"].includes(error.code)
      ) {
        return;
      }
      throw error;
    }
    await waitForMembershipCheck(signal);
  }
  signal.throwIfAborted();
}
