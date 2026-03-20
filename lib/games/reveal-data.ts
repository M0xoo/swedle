/** Daily pool: one snippet per entry; `languageId` must exist in `languages.json`. */
export type RevealSnippet = {
  id: string;
  languageId: string;
  code: string;
};

export const REVEAL_SNIPPETS: RevealSnippet[] = [
  {
    id: "rust-sum",
    languageId: "rust",
    code: `fn total(xs: &[i32]) -> i32 {
    xs.iter().copied().sum()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_is_zero() {
        assert_eq!(total(&[]), 0);
    }
}`,
  },
  {
    id: "go-worker",
    languageId: "go",
    code: `package main

import (
    "context"
    "time"
)

func debounce(ctx context.Context, d time.Duration, in <-chan string, out chan<- string) {
    var pending *string
    timer := time.NewTimer(d)
    if !timer.Stop() {
        <-timer.C
    }
    for {
        select {
        case <-ctx.Done():
            return
        case s := <-in:
            pending = &s
            timer.Reset(d)
        case <-timer.C:
            if pending != nil {
                out <- *pending
                pending = nil
            }
        }
    }
}`,
  },
  {
    id: "py-decorator",
    languageId: "python",
    code: `from functools import wraps
from time import perf_counter

def timed(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            dt = perf_counter() - t0
            print(f"{fn.__name__} took {dt*1000:.2f}ms")
    return wrapper`,
  },
  {
    id: "hs-quicksplit",
    languageId: "haskell",
    code: `module Split where

partition :: (a -> Bool) -> [a] -> ([a], [a])
partition _ [] = ([], [])
partition p (x:xs)
  | p x       = (x:as, bs)
  | otherwise = (as, x:bs)
  where (as, bs) = partition p xs`,
  },
  {
    id: "rb-enumerator",
    languageId: "ruby",
    code: `class Chunker
  def initialize(enum, size)
    @enum = enum
    @size = size
  end

  def each
    buf = []
    @enum.each do |x|
      buf << x
      if buf.size == @size
        yield buf.dup
        buf.clear
      end
    end
    yield buf unless buf.empty?
  end
end`,
  },
  {
    id: "kt-sealed",
    languageId: "kotlin",
    code: `sealed class Result<out T> {
    data class Ok<T>(val value: T) : Result<T>()
    data class Err(val message: String) : Result<Nothing>()
}

fun <T, R> Result<T>.map(f: (T) -> R): Result<R> = when (this) {
    is Result.Ok -> Result.Ok(f(value))
    is Result.Err -> this
}`,
  },
  {
    id: "zig-alloc",
    languageId: "zig",
    code: `const std = @import("std");

pub fn readAll(allocator: std.mem.Allocator, path: []const u8) ![]u8 {
    const file = try std.fs.cwd().openFile(path, .{});
    defer file.close();
    return try file.readToEndAlloc(allocator, 1 << 22);
}`,
  },
  {
    id: "ex-pipe",
    languageId: "elixir",
    code: `defmodule StreamWindow do
  @moduledoc false

  def sliding(enumerable, n) when n > 0 do
    enumerable
    |> Stream.chunk_every(n, 1, :discard)
  end
end`,
  },
  {
    id: "ocaml-option",
    languageId: "ocaml",
    code: `let bind o f =
  match o with
  | None -> None
  | Some x -> f x

let ( let* ) = bind

let read_port env =
  let* raw = Sys.getenv_opt "PORT" in
  match int_of_string_opt raw with
  | Some p when p > 0 -> Some p
  | _ -> None`,
  },
  {
    id: "swift-async",
    languageId: "swift",
    code: `actor Counter {
    private var n = 0

    func next() -> Int {
        n += 1
        return n
    }
}

func run() async {
    let c = Counter()
    async let a = c.next()
    async let b = c.next()
    _ = await (a, b)
}`,
  },
  {
    id: "scala-match",
    languageId: "scala",
    code: `sealed trait Event
final case class Click(x: Int, y: Int) extends Event
final case class Key(c: Char) extends Event

def describe(e: Event): String = e match {
  case Click(x, y) if x < 0 => s"left $y"
  case Click(_, y)           => s"click at $y"
  case Key('\n')             => "enter"
  case Key(c)                => s"key $c"
}`,
  },
  {
    id: "lua-metatable",
    languageId: "lua",
    code: `local function readonly(t)
  return setmetatable({}, {
    __index = t,
    __newindex = function()
      error("table is read-only", 2)
    end,
  })
end

return { readonly = readonly }`,
  },
];
