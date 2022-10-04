import _Image from 'next/image';

function loader({ src, width, quality }) {
  return `${src}?w=${width}&q=${quality || 75}`;
}

export function Image(props) {
  const _props = Object.assign({}, props, {loader: loader});

  return (
    <_Image {..._props} />
  );
}

export default Image;
