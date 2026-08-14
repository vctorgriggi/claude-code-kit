import { test } from "node:test";
import assert from "node:assert/strict";
import { cotar, validar } from "../src/dominio/frete.js";
import { responder } from "../src/borda/http.js";

test("cotação soma base e faixa de peso, em centavos inteiros", () => {
  assert.equal(cotar({ regiao: "sudeste", pesoGramas: 2000 }), 1560);
});

test("peso fracionário é recusado", () => {
  assert.throws(() => validar({ regiao: "sul", pesoGramas: 1.5 }), /não inteiro/);
});

test("região desconhecida é recusada", () => {
  assert.throws(() => validar({ regiao: "marte", pesoGramas: 100 }), /desconhecida/);
});

test("a borda traduz erro de domínio em 422", () => {
  assert.equal(responder({ regiao: "marte", pesoGramas: 100 }).status, 422);
});
