import md5 from 'js-md5';

function createMd5Hash() {
  let value = '';

  return {
    update(input) {
      value += String(input ?? '');
      return this;
    },
    digest(encoding) {
      if (encoding !== 'hex') {
        throw new Error(`Unsupported digest encoding: ${encoding}`);
      }

      return md5(value);
    },
  };
}

export function createHash(algorithm) {
  if (algorithm !== 'md5') {
    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }

  return createMd5Hash();
}

export default {
  createHash,
};
