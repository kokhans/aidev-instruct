---
description: Mongoose for MongoDB, covering connection, schema types, middleware, reads, updates, query injection, indexes and transactions.
globs: ["**/*.ts"]
---

# Mongoose

## Version

- Mongoose needs Node 20.19 or later and the MongoDB driver 7.
- Pre middleware is an `async` function without `next()`. `isAsync` middleware is removed.
- Updates that return the document pass `returnDocument: "after"`. `new: true` and `returnOriginal` are deprecated.
- Query filter types are `QueryFilter<T>`. `FilterQuery` is renamed.

## Connection

- Global settings are set once before models are compiled: `mongoose.set("sanitizeFilter", true)` and `mongoose.set("runValidators", true)`.

## Schemas and Types

- Schemas are written inline in `new Schema({ ... })` so Mongoose infers the TypeScript types. An explicit interface with `new Schema<T>()` and `model<T>()` is the fallback when inference fails.
- Interfaces use `Types.ObjectId`. Schemas use `Schema.Types.ObjectId` with `ref`.
- `strict` stays on. Every schema sets `timestamps: true`.
- Documents updated after a read set `optimisticConcurrency: true`, so a concurrent change throws `VersionError`. It protects `save()` only, not `updateOne` or `findOneAndUpdate`.
- Unbounded lists (comments, events) live in their own collection, not in an array.

## Reads

- Read-only results use `.lean()`. Lean documents have no virtuals, getters, defaults or `save`.
- `populate` is for small, bounded relations. Aggregations and large joins use `$lookup` in an aggregation pipeline.
- Lists paginate by a range on an indexed field (`_id` or a timestamp), not large `skip` values.
- `maxTimeMS` bounds slow queries.

## Writes

- Update validators only run with `runValidators` (set globally above) and only for `$set`, `$unset`, `$push`, `$addToSet`, `$pull` and `$pullAll`. Values written with `$inc` or pipelines are checked in code.
- Update pipelines throw unless the query passes `updatePipeline: true`.

## Query Injection

- `sanitizeFilter` wraps filter values that are objects with `$` keys in `$eq`, so `{ $ne: null }` from a request matches literally. Code that intends an operator wraps it in `mongoose.trusted()`.
- Request bodies and query strings are validated and mapped to known fields before reaching a filter or update. Raw request objects never become filters.

## Indexes

- Indexes are declared in the schema with `index: true`, `unique: true` or `schema.index({ ... })`, ordered equality, sort, range.
- Production sets `autoIndex: false`. A deploy step runs `syncIndexes()`, which also drops indexes no longer declared. `diffIndexes()` shows that plan first.

## Transactions

- Multi-document writes use `connection.transaction(async (session) => ...)`, which retries transient errors. Transactions need a replica set.
- Every operation inside passes `{ session }`, or the connection enables `transactionAsyncLocalStorage`.
- Operations inside a transaction run one after another, never with `Promise.all`.
