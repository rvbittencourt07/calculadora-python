"""
Calculadora simples em Python (CLI).

Como usar:
  - Execute: python calculadora.py
  - Digite uma expressão, por exemplo:
      2*(3+4)
      10/3
      2**8
      sqrt(16) + 5
  - Para sair: digite "sair" ou "quit"
"""

from __future__ import annotations

import ast
import math
import operator as op


ALLOWED_BINOPS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.FloorDiv: op.floordiv,
    ast.Mod: op.mod,
    ast.Pow: op.pow,
}

ALLOWED_UNARYOPS = {
    ast.UAdd: op.pos,
    ast.USub: op.neg,
}

ALLOWED_FUNCS = {
    "sqrt": math.sqrt,
    "abs": abs,
}


def _eval_ast(node: ast.AST) -> float | int:
    """Avalia uma árvore AST com um conjunto seguro de operações."""
    if isinstance(node, ast.Expression):
        return _eval_ast(node.body)

    # Números
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Use apenas números na expressão.")

    # Operações binárias: a + b, a * b, etc.
    if isinstance(node, ast.BinOp):
        binop_type = type(node.op)
        if binop_type not in ALLOWED_BINOPS:
            raise ValueError("Operação não suportada.")
        left = _eval_ast(node.left)
        right = _eval_ast(node.right)
        return ALLOWED_BINOPS[binop_type](left, right)

    # Operações unárias: -a, +a
    if isinstance(node, ast.UnaryOp):
        unary_type = type(node.op)
        if unary_type not in ALLOWED_UNARYOPS:
            raise ValueError("Operação unária não suportada.")
        value = _eval_ast(node.operand)
        return ALLOWED_UNARYOPS[unary_type](value)

    # Funções: sqrt(x), abs(x)
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
            raise ValueError("Chamada de função inválida.")
        func_name = node.func.id
        if func_name not in ALLOWED_FUNCS:
            raise ValueError("Função não suportada.")
        if len(node.args) != 1:
            raise ValueError("Use exatamente 1 argumento na função.")
        arg = _eval_ast(node.args[0])
        return ALLOWED_FUNCS[func_name](arg)

    raise ValueError("Expressão inválida ou não suportada.")


def eval_expression(expr: str) -> float | int:
    """Avalia a expressão com segurança (sem usar eval())."""
    parsed = ast.parse(expr, mode="eval")
    return _eval_ast(parsed)


def main() -> None:
    print("Calculadora simples (Python).")
    print('Digite uma expressão (ex: 2*(3+4), 10/3, 2**8, sqrt(16)).')
    print('Para sair: "sair" ou "quit".')

    while True:
        expr = input("\nCalculadora > ").strip()
        if not expr:
            continue
        if expr.lower() in {"sair", "quit", "exit", "q"}:
            print("Encerrando.")
            return

        try:
            result = eval_expression(expr)
            # Formatação amigável: 4.0 -> 4
            if isinstance(result, float) and result.is_integer():
                result = int(result)
            print(f"Resultado: {result}")
        except ZeroDivisionError:
            print("Erro: divisão por zero.")
        except (SyntaxError, ValueError) as e:
            print(f"Erro: {e}")


if __name__ == "__main__":
    main()

