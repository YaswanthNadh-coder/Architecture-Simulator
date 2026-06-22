export interface ConnInfo {
  localAddr: any;
  remoteAddr: any;
}

export type Handler = (
  request: Request,
  connInfo: ConnInfo,
) => Response | Promise<Response>;

export interface ServeOptions {
  port?: number;
  hostname?: string;
  onError?: (error: unknown) => Response | Promise<Response>;
  onListen?: (params: { hostname: string; port: number }) => void;
  signal?: AbortSignal;
}

export function serve(
  handler: Handler,
  options?: ServeOptions,
): Promise<void> {
  return Promise.resolve();
}
