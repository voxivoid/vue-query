import { successMutator, simpleFetcher } from "./test-utils";
import {
  isQueryKey,
  parseFilterArgs,
  parseMutationArgs,
  parseMutationFilterArgs,
  parseQueryArgs,
  updateState,
  cloneDeep,
  cloneDeepUnref,
} from "../utils";
import { reactive, ref } from "vue-demi";

describe("utils", () => {
  describe("isQueryKey", () => {
    test("should detect string as query key", () => {
      expect(isQueryKey("string")).toEqual(true);
    });

    test("should detect an array as query key", () => {
      expect(isQueryKey(["string", "array"])).toEqual(true);
    });
  });

  describe("parseFilterArgs", () => {
    test("should default to empty filters", () => {
      const result = parseFilterArgs(undefined);

      expect(result).toEqual({});
    });

    test("should merge query key with filters", () => {
      const filters = { active: true };

      const result = parseFilterArgs("key", filters);
      const expected = { ...filters, queryKey: "key" };

      expect(result).toEqual(expected);
    });
  });

  describe("parseMutationArgs", () => {
    test("should return the same instance of options", () => {
      const options = { retry: false };
      const result = parseMutationArgs(options);

      expect(result).toEqual(options);
    });

    test("should merge query key with options", () => {
      const options = { retry: false };
      const result = parseMutationArgs("key", options);
      const expected = { ...options, mutationKey: "key" };

      expect(result).toEqual(expected);
    });

    test("should merge query fn with options", () => {
      const options = { retry: false };
      const result = parseMutationArgs(successMutator, options);
      const expected = { ...options, mutationFn: successMutator };

      expect(result).toEqual(expected);
    });

    test("should merge query key and fn with options", () => {
      const options = { retry: false };
      const result = parseMutationArgs("key", successMutator, options);
      const expected = {
        ...options,
        mutationKey: "key",
        mutationFn: successMutator,
      };

      expect(result).toEqual(expected);
    });
  });

  describe("parseQueryArgs", () => {
    test("should return the same instance of options", () => {
      const options = { retry: false };
      const result = parseQueryArgs(options);

      expect(result).toStrictEqual(options);
    });

    test("should merge query key with options", () => {
      const options = { retry: false };
      const result = parseQueryArgs("key", options);
      const expected = { ...options, queryKey: "key" };

      expect(result).toEqual(expected);
    });

    test("should merge query key and fn with options", () => {
      const options = { retry: false };
      const result = parseQueryArgs("key", simpleFetcher, options);
      const expected = {
        ...options,
        queryKey: "key",
        queryFn: simpleFetcher,
      };

      expect(result).toEqual(expected);
    });
  });

  describe("parseMutationFilterArgs", () => {
    test("should default to empty filters", () => {
      const result = parseMutationFilterArgs(undefined);

      expect(result).toEqual(undefined);
    });

    test("should merge mutation key with filters", () => {
      const filters = { fetching: true };

      const result = parseMutationFilterArgs("key", filters);
      const expected = { ...filters, mutationKey: "key" };

      expect(result).toEqual(expected);
    });
  });

  describe("updateState", () => {
    test("should update first object with values from the second one", () => {
      const origin = { option1: "a", option2: "b", option3: "c" };
      const update = { option1: "x", option2: "y", option3: "z" };
      const expected = { option1: "x", option2: "y", option3: "z" };

      updateState(origin, update);
      expect(origin).toEqual(expected);
    });

    test("should update only existing keys", () => {
      const origin = { option1: "a", option2: "b" };
      const update = { option1: "x", option2: "y", option3: "z" };
      const expected = { option1: "x", option2: "y" };

      updateState(origin, update);
      expect(origin).toEqual(expected);
    });

    test("should remove non existing keys", () => {
      const origin = { option1: "a", option2: "b", option3: "c" };
      const update = { option1: "x", option2: "y" };
      const expected = { option1: "x", option2: "y" };

      updateState(origin, update);
      expect(origin).toEqual(expected);
    });
  });

  describe("cloneDeep", () => {
    test("should copy primitives and functions AS-IS", () => {
      expect(cloneDeep(3456)).toBe(3456);
      expect(cloneDeep("theString")).toBe("theString");
      expect(cloneDeep(null)).toBe(null);
    });

    test("should copy Maps and Sets AS-IS", () => {
      const setVal = new Set([3, 4, 5]);
      const setValCopy = cloneDeep(setVal);
      expect(setValCopy).toBe(setVal);
      expect(setValCopy).toStrictEqual(new Set([3, 4, 5]));

      const mapVal = new Map([
        ["a", "aVal"],
        ["b", "bVal"],
      ]);
      const mapValCopy = cloneDeep(mapVal);
      expect(mapValCopy).toBe(mapVal);
      expect(mapValCopy).toStrictEqual(
        new Map([
          ["a", "aVal"],
          ["b", "bVal"],
        ])
      );
    });

    test("should deeply copy arrays", () => {
      const val = [
        25,
        "str",
        null,
        new Set([3, 4]),
        [5, 6, { a: 1 }],
        undefined,
      ];
      const cp = cloneDeep(val);
      expect(cp).toStrictEqual([
        25,
        "str",
        null,
        new Set([3, 4]),
        [5, 6, { a: 1 }],
        undefined,
      ]);
      expect(cp).not.toBe(val);
      expect(cp[3]).toBe(val[3]); // Set([3, 4])
      expect(cp[4]).not.toBe(val[4]); // [5, 6, { a: 1 }]
      expect((cp[4] as number[])[2]).not.toBe((val[4] as number[])[2]); // { a : 1 }
    });

    test("should deeply copy object", () => {
      const val = reactive({
        a: 25,
        b: "str",
        c: null,
        d: undefined,
        e: new Set([5, 6]),
        f: [3, 4],
        g: { fa: 26 },
      });
      const cp = cloneDeep(val);

      expect(cp).toStrictEqual({
        a: 25,
        b: "str",
        c: null,
        d: undefined,
        e: new Set([5, 6]),
        f: [3, 4],
        g: { fa: 26 },
      });

      expect(cp.e).toBe(val.e); // Set
      expect(cp.f).not.toBe(val.f); // []
      expect(cp.g).not.toBe(val.g); // {}
    });
  });

  describe("cloneDeepUnref", () => {
    test("should unref primitives", () => {
      expect(cloneDeepUnref(ref(34))).toBe(34);
      expect(cloneDeepUnref(ref("mystr"))).toBe("mystr");
    });

    test("should deeply unref arrays", () => {
      const val = ref([2, 3, ref(4), ref("5"), { a: ref(6) }, [ref(7)]]);
      const cp = cloneDeepUnref(val);
      expect(cp).toStrictEqual([2, 3, 4, "5", { a: 6 }, [7]]);
    });

    test("should deeply unref objects", () => {
      const val = ref({
        a: 1,
        b: ref(2),
        c: [ref("c1"), ref(["c2"])],
        d: {
          e: ref("e"),
        },
      });
      const cp = cloneDeepUnref(val);

      expect(cp).toEqual({
        a: 1,
        b: 2,
        c: ["c1", ["c2"]],
        d: { e: "e" },
      });
    });
  });
});
