import test from "node:test";
import assert from "node:assert/strict";
import { parseCurrencyInput, toCents } from "@/lib/money";

test("parseCurrencyInput accepts comma decimals", () => {
  assert.equal(parseCurrencyInput("12,50"), 1250);
});

test("parseCurrencyInput accepts dot decimals", () => {
  assert.equal(parseCurrencyInput("9.99"), 999);
});

test("parseCurrencyInput rejects invalid input", () => {
  assert.equal(parseCurrencyInput("abc"), null);
});

test("toCents rounds correctly", () => {
  assert.equal(toCents(10.235), 1024);
});
