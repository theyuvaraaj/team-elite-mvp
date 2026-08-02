export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
  code?: string;
  message?: string;
}

function parseApiErrorPayload(payload: ApiErrorPayload): {
  code?: string;
  message?: string;
} {
  if (payload.error) {
    return {
      code: payload.error.code ?? payload.code,
      message: payload.error.message ?? payload.message,
    };
  }

  return {
    code: payload.code,
    message: payload.message,
  };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData = init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const { code, message } = parseApiErrorPayload(payload);
    throw new ApiError(
      response.status,
      message ?? "Something went wrong. Please try again.",
      code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
