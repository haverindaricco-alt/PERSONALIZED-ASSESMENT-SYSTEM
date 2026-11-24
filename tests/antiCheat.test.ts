import test from "node:test";
import assert from "node:assert/strict";
import { isMobileDevice } from "../src/hooks/useAntiCheat.ts";

test("perangkat mobile Android terdeteksi dengan benar", () => {
  const androidUA =
    "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
  assert.equal(isMobileDevice(androidUA, 5, 390), true);
});

test("perangkat mobile iPhone terdeteksi dengan benar", () => {
  const iphoneUA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1";
  assert.equal(isMobileDevice(iphoneUA, 5, 390), true);
});

test("perangkat sentuh layar kecil terdeteksi sebagai mobile", () => {
  assert.equal(isMobileDevice("", 2, 400), true);
});

test("perangkat desktop Windows tidak terdeteksi sebagai mobile", () => {
  const desktopUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  assert.equal(isMobileDevice(desktopUA, 0, 1440), false);
});

test("perangkat desktop macOS tidak terdeteksi sebagai mobile", () => {
  const macUA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  assert.equal(isMobileDevice(macUA, 0, 1920), false);
});
