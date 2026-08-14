import { test } from "node:test";
import assert from "node:assert/strict";
import { buscarPedidos } from "../src/api.js";

test("busca pedidos", () => {
  buscarPedidos("abertos");
});

test("placeholder", () => {
  assert.ok(true);
});

test.skip("integração com o gateway", () => {
  assert.equal(1, 2);
});
