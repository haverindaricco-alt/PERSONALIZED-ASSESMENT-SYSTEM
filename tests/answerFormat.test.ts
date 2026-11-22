import test from "node:test";
import assert from "node:assert/strict";
import { canonicalAnswer } from "../src/lib/answerFormat.ts";

test("bentuk pecahan setara memiliki kanonik yang sama", () => {
  assert.equal(canonicalAnswer("1/2"), "0.500");
  assert.equal(canonicalAnswer("2/4"), "0.500");
  assert.equal(canonicalAnswer("0,5"), "0.500");
});

test("desimal berulang dibandingkan dengan presisi tiga angka", () => {
  assert.equal(canonicalAnswer("5/6"), "0.833");
  assert.equal(canonicalAnswer("0,833"), "0.833");
  assert.notEqual(canonicalAnswer("0,83"), canonicalAnswer("5/6"));
});

test("huruf besar dan spasi diabaikan untuk jawaban teks", () => {
  assert.equal(canonicalAnswer("  LIMA   Per Enam "), "limaperenam");
});

test("spasi di sekitar tanda bagi diabaikan", () => {
  assert.equal(canonicalAnswer("1 / 2"), "0.500");
  assert.equal(canonicalAnswer("2 / 4"), "0.500");
});

test("bilangan campuran dikenali", () => {
  assert.equal(canonicalAnswer("1 1/2"), "1.500");
});

test("rumus pecahan dengan huruf dan operasi disetarakan", () => {
  assert.equal(
    canonicalAnswer("(y2 - y1)/(x2 - x1)"),
    canonicalAnswer("y2-y1 / x2-x1"),
  );
  assert.equal(canonicalAnswer("y2/x2"), "y2x2");
});

test("jawaban kosong menjadi kanonik kosong", () => {
  assert.equal(canonicalAnswer(""), "");
});
