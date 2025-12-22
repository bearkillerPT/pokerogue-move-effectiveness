// Project-wide lightweight types. Keep these strict and avoid `any`/`unknown`.

export interface Move {
  id: number;
  ename?: string | null;
  cname?: string | null;
  jname?: string | null;
  power?: number | null;
  accuracy?: number | null;
  pp?: number | null;
  type?: string | null;
  tm?: number | null;
  category?: string | null;
}

// A small, permissive structural type for objects we read from the page.
// We avoid `any`/`unknown` by enumerating likely primitive shapes and arrays.
export interface LooseValue {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | string[]
    | number[]
    | Array<string | number | null | boolean>
    | object;
}

declare global {
  interface Window {
    __PME_MOVES?: Move[];
    // allow indexing dynamic global properties discovered at runtime
    [key: string]: LooseValue | undefined;
  }

  // allow attaching a private field used by the injected XHR wrapper
  interface XMLHttpRequest {
    _pme_url?: string;
  }
}

export {};
