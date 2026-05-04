import { describe, expect, it } from "vitest";
import {
  HOSTED_WEB_CHANNEL_COOKIE,
  isRouterHost,
  normalizeChannel,
  parseCookieValue,
  selectChannel,
} from "./middleware";

function request(path: string, cookie?: string): Request {
  return new Request(`https://app.t3.codes${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("hosted web channel middleware", () => {
  it("normalizes latest and nightly channel names", () => {
    expect(normalizeChannel("latest")).toBe("latest");
    expect(normalizeChannel("nightly")).toBe("nightly");
    expect(normalizeChannel("mytube")).toBeNull();
    expect(normalizeChannel("unknown")).toBeNull();
  });

  it("matches the configured router host without a port", () => {
    expect(isRouterHost("app.t3.codes:443", "app.t3.codes")).toBe(true);
    expect(isRouterHost("latest.app.t3.codes", "app.t3.codes")).toBe(false);
  });

  it("reads the selected channel from cookies", () => {
    expect(
      selectChannel(request("/settings", `theme=dark; ${HOSTED_WEB_CHANNEL_COOKIE}=nightly`)),
    ).toEqual({
      channel: "nightly",
      setCookie: false,
      nextPath: "/settings",
    });
  });

  it("defaults invalid or missing channel cookies to latest", () => {
    expect(selectChannel(request("/threads", `${HOSTED_WEB_CHANNEL_COOKIE}=bad`))).toEqual({
      channel: "latest",
      setCookie: false,
      nextPath: "/threads",
    });
  });

  it("handles channel opt-in requests with an internal next path only", () => {
    expect(selectChannel(request("/__t3code/channel?channel=nightly&next=/pair"))).toEqual({
      channel: "nightly",
      setCookie: true,
      nextPath: "/pair",
    });

    expect(
      selectChannel(request("/__t3code/channel?channel=latest&next=https://evil.example")),
    ).toEqual({
      channel: "latest",
      setCookie: true,
      nextPath: "/",
    });
  });

  it("parses cookie values by exact name", () => {
    expect(parseCookieValue("other=value; t3code_web_channel=nightly", "t3code_web_channel")).toBe(
      "nightly",
    );
    expect(parseCookieValue("x-t3code_web_channel=nightly", "t3code_web_channel")).toBeNull();
  });
});
