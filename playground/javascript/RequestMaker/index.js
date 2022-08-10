const R = function (API, Fields) {
  const _api = API;
  const _fields = Fields;

  let path = '';

  return {
    build(url, ...args) {
      path = String(url)
        .split('/')
        .reduce(
          (acc, key) => {
            if (!key) {
              return acc;
            }
            if (key.startsWith('$')) {
              if (!args?.[acc.argi]) {
                throw Error(`URL_VAR_EMPTY:${acc.argi}`);
              }
              return {
                path: `${acc.path}/${args[acc.argi]}`,
                argi: acc.argi + 1,
              };
            }
            return { path: `${acc.path}/${key}`, argi: acc.argi };
          },
          { path: '', argi: 0 }
        ).path;
    },
    make() {
      console.log(path);
    },
  };
};
