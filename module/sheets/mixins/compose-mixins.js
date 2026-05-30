/**
 * @param {...Function} mixins
 * @returns {Function}
 */
export default function composeMixins(...mixins) {
  return (Base) => mixins.reduceRight((acc, mixin) => mixin(acc), Base);
}
