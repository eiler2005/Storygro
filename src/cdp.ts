import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chrome } from './tools.ts';

/** A headless Chrome tab driven over the DevTools protocol (Node's built-in WebSocket). */
export class Tab {
  private id = 0;
  private pending = new Map<number, { ok: (v: unknown) => void; fail: (e: Error) => void }>();
  private constructor(
    private ws: WebSocket,
    private proc: ChildProcess,
    private profile: string,
  ) {
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      const p = msg.id && this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.fail(new Error(msg.error.message));
      else p.ok(msg.result);
    });
  }

  static async open(width: number, height: number): Promise<Tab> {
    const profile = mkdtempSync(join(tmpdir(), 'storygro-chrome-'));
    const proc = spawn(
      chrome(),
      [
        '--headless=new',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        `--window-size=${width},${height}`,
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--force-color-profile=srgb',
        '--disable-gpu-vsync',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        'about:blank',
      ],
      { stdio: 'ignore' },
    );
    // Chrome creates DevToolsActivePort before it has written the port into it; wait for a number,
    // or the fetch below goes to port 80 (ECONNREFUSED 127.0.0.1:80, about one launch in ten)
    const portFile = join(profile, 'DevToolsActivePort');
    const readPort = () => (existsSync(portFile) ? readFileSync(portFile, 'utf8').split('\n')[0]!.trim() : '');
    let port = readPort();
    for (let i = 0; i < 300 && !/^\d+$/.test(port); i++) {
      await new Promise((r) => setTimeout(r, 50));
      port = readPort();
    }
    if (!/^\d+$/.test(port)) {
      proc.kill();
      throw new Error(`Chrome did not report a DevTools port within 15 s (${chrome()})`);
    }
    const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as {
      type: string;
      webSocketDebuggerUrl: string;
    }[];
    const page = list.find((t) => t.type === 'page')!;
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((r, j) => {
      ws.addEventListener('open', r, { once: true });
      ws.addEventListener('error', j, { once: true });
    });
    const tab = new Tab(ws, proc, profile);
    await tab.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await tab.send('Runtime.enable');
    return tab;
  }

  send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, fail) => this.pending.set(id, { ok: ok as (v: unknown) => void, fail }));
  }

  async eval<T = unknown>(expression: string): Promise<T> {
    const r = await this.send<{ result: { value: T }; exceptionDetails?: { exception?: { description?: string }; text: string } }>(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true },
    );
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }

  async goto(url: string, readyExpr: string, timeoutMs = 30_000): Promise<void> {
    await this.send('Page.navigate', { url });
    const t0 = Date.now();
    while (!(await this.eval<boolean>(readyExpr).catch(() => false))) {
      if (Date.now() - t0 > timeoutMs) {
        const err = await this.eval<string>('window.__reelError ?? ""').catch(() => '');
        throw new Error(`page not ready after ${timeoutMs} ms ${err}`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  async shot(format: 'jpeg' | 'png' = 'jpeg', quality = 92): Promise<Buffer> {
    const r = await this.send<{ data: string }>('Page.captureScreenshot', {
      format,
      ...(format === 'jpeg' ? { quality } : {}),
      fromSurface: true,
      captureBeyondViewport: false,
    });
    return Buffer.from(r.data, 'base64');
  }

  close(): void {
    this.ws.close();
    this.proc.kill();
    setTimeout(() => rmSync(this.profile, { recursive: true, force: true }), 500);
  }
}
