/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueriesObserver } from "react-query/core";
import { onUnmounted, reactive, readonly, set, watch } from "vue-demi";

import type { QueryFunction } from "react-query/types/core";
import type { UseQueryResult } from "react-query/types/react/types";

import { useQueryClient } from "./useQueryClient";
import { UseQueryOptions } from "./useQuery";

// Avoid TS depth-limit error in case of large array literal
type MAXIMUM_DEPTH = 20;

type GetOptions<T> =
  // Part 1: responsible for applying explicit type parameter to function arguments, if object { queryFnData: TQueryFnData, error: TError, data: TData }
  T extends {
    queryFnData: infer TQueryFnData;
    error?: infer TError;
    data: infer TData;
  }
    ? UseQueryOptions<TQueryFnData, TError, TData>
    : T extends { queryFnData: infer TQueryFnData; error?: infer TError }
    ? UseQueryOptions<TQueryFnData, TError>
    : T extends { data: infer TData; error?: infer TError }
    ? UseQueryOptions<unknown, TError, TData>
    : // Part 2: responsible for applying explicit type parameter to function arguments, if tuple [TQueryFnData, TError, TData]
    T extends [infer TQueryFnData, infer TError, infer TData]
    ? UseQueryOptions<TQueryFnData, TError, TData>
    : T extends [infer TQueryFnData, infer TError]
    ? UseQueryOptions<TQueryFnData, TError>
    : T extends [infer TQueryFnData]
    ? UseQueryOptions<TQueryFnData>
    : // Part 3: responsible for inferring and enforcing type if no explicit parameter was provided
    T extends {
        queryFn?: QueryFunction<infer TQueryFnData>;
        select: (data: any) => infer TData;
      }
    ? UseQueryOptions<TQueryFnData, unknown, TData>
    : T extends { queryFn?: QueryFunction<infer TQueryFnData> }
    ? UseQueryOptions<TQueryFnData>
    : // Fallback
      UseQueryOptions;

type GetResults<T> =
  // Part 1: responsible for mapping explicit type parameter to function result, if object
  T extends { queryFnData: any; error?: infer TError; data: infer TData }
    ? UseQueryResult<TData, TError>
    : T extends { queryFnData: infer TQueryFnData; error?: infer TError }
    ? UseQueryResult<TQueryFnData, TError>
    : T extends { data: infer TData; error?: infer TError }
    ? UseQueryResult<TData, TError>
    : // Part 2: responsible for mapping explicit type parameter to function result, if tuple
    T extends [any, infer TError, infer TData]
    ? UseQueryResult<TData, TError>
    : T extends [infer TQueryFnData, infer TError]
    ? UseQueryResult<TQueryFnData, TError>
    : T extends [infer TQueryFnData]
    ? UseQueryResult<TQueryFnData>
    : // Part 3: responsible for mapping inferred type to results, if no explicit parameter was provided
    T extends {
        queryFn?: QueryFunction<any>;
        select: (data: any) => infer TData;
      }
    ? UseQueryResult<TData>
    : T extends { queryFn?: QueryFunction<infer TQueryFnData> }
    ? UseQueryResult<TQueryFnData>
    : // Fallback
      UseQueryResult;

/**
 * QueriesOptions reducer recursively unwraps function arguments to infer/enforce type param
 */
type QueriesOptions<
  T extends any[],
  Result extends any[] = [],
  Depth extends ReadonlyArray<number> = []
> = Depth["length"] extends MAXIMUM_DEPTH
  ? UseQueryOptions[]
  : T extends []
  ? []
  : T extends [infer Head]
  ? [...Result, GetOptions<Head>]
  : T extends [infer Head, ...infer Tail]
  ? QueriesOptions<[...Tail], [...Result, GetOptions<Head>], [...Depth, 1]>
  : unknown[] extends T
  ? T
  : // If T is *some* array but we couldn't assign unknown[] to it, then it must hold some known/homogenous type!
  // use this to infer the param types in the case of Array.map() argument
  T extends UseQueryOptions<infer TQueryFnData, infer TError, infer TData>[]
  ? UseQueryOptions<TQueryFnData, TError, TData>[]
  : // Fallback
    UseQueryOptions[];

/**
 * QueriesResults reducer recursively maps type param to results
 */
type QueriesResults<
  T extends any[],
  Result extends any[] = [],
  Depth extends ReadonlyArray<number> = []
> = Depth["length"] extends MAXIMUM_DEPTH
  ? UseQueryResult[]
  : T extends []
  ? []
  : T extends [infer Head]
  ? [...Result, GetResults<Head>]
  : T extends [infer Head, ...infer Tail]
  ? QueriesResults<[...Tail], [...Result, GetResults<Head>], [...Depth, 1]>
  : T extends UseQueryOptions<infer TQueryFnData, infer TError, infer TData>[]
  ? // Dynamic-size (homogenous) UseQueryOptions array: map directly to array of results
    UseQueryResult<unknown extends TData ? TQueryFnData : TData, TError>[]
  : // Fallback
    UseQueryResult[];

export function useQueries<T extends any[]>(
  queries: readonly [...QueriesOptions<T>]
): Readonly<QueriesResults<T>> {
  const queryClientKey = queries[0]?.queryClientKey;
  const queryClient = useQueryClient(queryClientKey);
  const defaultedQueries = queries.map((options) => {
    return queryClient.defaultQueryObserverOptions(options);
  });

  const observer = new QueriesObserver(queryClient, defaultedQueries);
  const state = reactive(observer.getCurrentResult());
  const unsubscribe = observer.subscribe((result) => {
    result.forEach((resultEntry, index) => {
      set(state, index, resultEntry);
    });
  });

  watch(
    () => queries,
    () => {
      const defaulted = queries.map((options) => {
        return queryClient.defaultQueryObserverOptions(options);
      });
      observer.setQueries(defaulted);
    },
    { deep: true }
  );

  onUnmounted(() => {
    unsubscribe();
  });

  return readonly(state) as QueriesResults<T>;
}