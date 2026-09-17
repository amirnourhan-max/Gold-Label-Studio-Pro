import WebSocket from "ws";

const mode = process.argv[2];
const forms = {
  "first-run": {
    selectors: ["#login-display-name", "#login-username", "#login-password", "#login-confirmation"],
    values: ["CI Administrator", "ci_admin", "CiAcceptance2026", "CiAcceptance2026"],
  },
  "sign-in": {
    selectors: ["#login-username", "#login-password"],
    values: ["ci_admin", "CiAcceptance2026"],
  },
};

if (!(mode in forms)) {
  throw new Error(`Expected auth mode first-run or sign-in, received: ${mode ?? "<missing>"}`);
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.on("message", data => {
      const message = JSON.parse(data.toString());
      if (!message.id) return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
    socket.on("close", () => {
      for (const request of this.pending.values()) request.reject(new Error("DevTools connection closed"));
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    });
    return new CdpClient(socket);
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "DevTools evaluation failed");
    return result.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function connectToAuthPage(firstSelector) {
  const deadline = Date.now() + 20_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:9222/json/list");
      const targets = await response.json();
      for (const target of targets) {
        if (target.type !== "page" || !target.webSocketDebuggerUrl) continue;
        const client = await CdpClient.connect(target.webSocketDebuggerUrl);
        await client.call("Runtime.enable");
        if (await client.evaluate(`Boolean(document.querySelector(${JSON.stringify(firstSelector)}))`)) return client;
        client.close();
      }
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }
  throw new Error(`Could not find the ${mode} WebView through DevTools${lastError ? `: ${lastError.message}` : ""}`);
}

const form = forms[mode];
const client = await connectToAuthPage(form.selectors[0]);
try {
  const fillResult = await client.evaluate(`(() => {
    const selectors = ${JSON.stringify(form.selectors)};
    const values = ${JSON.stringify(form.values)};
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    for (let index = 0; index < selectors.length; index++) {
      const input = document.querySelector(selectors[index]);
      if (!input) return { ok: false, missing: selectors[index] };
      setter.call(input, values[index]);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return { ok: true };
  })()`);
  if (!fillResult?.ok) throw new Error(`Auth input was missing: ${fillResult?.missing ?? "unknown"}`);

  await delay(250);
  const clicked = await client.evaluate(`(() => {
    const button = document.querySelector("button.login-submit");
    if (!button || button.disabled) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error("Auth submit button was missing or disabled");

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const state = await client.evaluate(`(() => ({
      signedIn: !document.querySelector('[data-testid="login-page"]'),
      error: document.querySelector('[data-testid="login-error"]')?.textContent?.trim() ?? null,
    }))()`);
    if (state.signedIn) {
      console.log(`${mode} form authenticated through the packaged WebView`);
      process.exitCode = 0;
      break;
    }
    if (state.error) throw new Error(`Authentication failed in the packaged WebView: ${state.error}`);
    await delay(250);
  }
  if (process.exitCode === undefined) throw new Error(`The ${mode} form did not leave the authentication screen`);
} finally {
  client.close();
}
