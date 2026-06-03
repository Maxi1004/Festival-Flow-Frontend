const pendingRequests = new Map<string, Promise<unknown>>();

export function reusePendingRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  const pendingRequest = pendingRequests.get(key) as Promise<T> | undefined;

  if (pendingRequest) {
    return pendingRequest;
  }

  const nextRequest = request();
  pendingRequests.set(key, nextRequest);

  void nextRequest.finally(() => {
    if (pendingRequests.get(key) === nextRequest) {
      pendingRequests.delete(key);
    }
  }).catch(() => undefined);

  return nextRequest;
}
