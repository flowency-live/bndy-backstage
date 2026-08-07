// TOMBSTONE — this was the original 56KB godmode monolith (tabs for venues /
// artists / songs / users in one file). It has not been routed since the
// godmode pages were split under App.tsx's /godmode/* routes, and the 2026-08
// godmode overhaul replaced all of its functionality:
//
//   Dashboard.tsx            — queue-centric landing
//   artists|venues|events|songs|users/index.tsx — DataTable curation pages
//   lib/queries.ts           — shared react-query data layer
//   components/DataTable.tsx — dense virtualized table + bulk select
//
// Nothing imports this file. Safe to `git rm` whenever convenient.

export {};
