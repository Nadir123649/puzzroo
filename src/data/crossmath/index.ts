/**
 * Re-export of the generated CrossMath dataset loader.
 *
 * The authoritative implementation lives in @shared/data/crossmath (it consumes
 * the pre-generated, uniqueness-guaranteed JSON). This local copy simply
 * forwards to it so the module path stays resolvable; the app imports the
 * shared version directly.
 */
export * from '@shared/data/crossmath'
