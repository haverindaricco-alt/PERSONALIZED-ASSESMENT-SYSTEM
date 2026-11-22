import test from "node:test";
import assert from "node:assert/strict";
import { parseMathText } from "../src/lib/mathText.ts";

test("pecahan dengan ekspresi huruf dikenali", () => {
  assert.deepEqual(parseMathText("(y2 - y1)/(x2 - x1)"), [
    {
      type: "fraction",
      numerator: "y2 - y1",
      denominator: "x2 - x1",
    },
  ]);
});

test("pecahan angka sederhana dikenali", () => {
  assert.deepEqual(parseMathText("5/6"), [
    { type: "fraction", numerator: "5", denominator: "6" },
  ]);
});

test("teks di sekitar pecahan tetap dipertahankan", () => {
  assert.deepEqual(parseMathText("y = 5/6 + 1/2"), [
    { type: "text", value: "y = " },
    { type: "fraction", numerator: "5", denominator: "6" },
    { type: "text", value: " + " },
    { type: "fraction", numerator: "1", denominator: "2" },
  ]);
});

test("kata biasa dengan garis miring tidak dianggap pecahan", () => {
  assert.deepEqual(parseMathText("and/or"), [
    { type: "text", value: "and/or" },
  ]);
});
