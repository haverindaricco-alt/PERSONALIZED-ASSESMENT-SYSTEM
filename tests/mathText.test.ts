import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMathText, parseMathText } from "../src/lib/mathText.ts";

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

test("pangkat bawah diubah menjadi angka biasa", () => {
  assert.equal(normalizeMathText("y₂"), "y2");
  assert.equal(normalizeMathText("x₁ + y₂"), "x1 + y2");
});

test("teks tanpa pangkat bawah tidak berubah", () => {
  assert.equal(
    normalizeMathText("(y2 - y1)/(x2 - x1)"),
    "(y2 - y1)/(x2 - x1)",
  );
});

test("pecahan dengan kurung bersarang seperti [3-(-2)] atau 3-(-2) dikenali", () => {
  assert.deepEqual(parseMathText("(-8 - 7)/(3 - (-2))"), [
    {
      type: "fraction",
      numerator: "-8 - 7",
      denominator: "3 - (-2)",
    },
  ]);

  assert.deepEqual(parseMathText("m = (-8 - 7)/[3 - (-2)]"), [
    { type: "text", value: "m = " },
    {
      type: "fraction",
      numerator: "-8 - 7",
      denominator: "3 - (-2)",
    },
  ]);

  assert.deepEqual(parseMathText("[-8 - 7]/[3 - (-2)]"), [
    {
      type: "fraction",
      numerator: "-8 - 7",
      denominator: "3 - (-2)",
    },
  ]);
});

test("format copy LaTeX \\frac otomatis dikenali dan dinormalkan", () => {
  assert.equal(
    normalizeMathText("m = \\frac{-8 - 7}{3 - (-2)}"),
    "m = (-8 - 7)/(3 - (-2))",
  );

  assert.deepEqual(parseMathText("\\frac{-8 - 7}{3 - (-2)}"), [
    {
      type: "fraction",
      numerator: "-8 - 7",
      denominator: "3 - (-2)",
    },
  ]);
});

test("format copy pecahan multiline dengan garis pembagi otomatis dinormalkan", () => {
  const multiline = "-8 - 7\n------\n3 - (-2)";
  assert.equal(
    normalizeMathText(multiline),
    "(-8 - 7)/(3 - (-2))",
  );
});

test("format copy pecahan dengan simbol Unicode dinormalkan", () => {
  assert.equal(normalizeMathText("1½ + ¾"), "11/2 + 3/4");
  assert.equal(normalizeMathText("5⁄6"), "5/6");
});
