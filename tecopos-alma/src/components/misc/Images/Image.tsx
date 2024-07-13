import { useState, useEffect } from "react";
import { Blurhash } from "react-blurhash";
import { CiImageOn } from "react-icons/ci";

interface ImageInterface {
  className?: string;
  hash?: string | null;
  src?: string | null;
}

const ImageComponent = ({ className, hash, src }: ImageInterface) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => {
    if (!!src) {
      const img = new Image();
      img.src = src;
      img.onload = () => setImgLoaded(true);
    }
  }, []);


  if (!imgLoaded && src && !hash)
    return (
      <div className={className ? className : ""}>
        <CiImageOn className="animate-pulse text-gray-600 object-cover h-full w-full" />
      </div>
    );
  if (imgLoaded && src)
    return <div className={className ? className : ""}><img className="object-contain h-full w-full" src={src} /></div>;
  if (!imgLoaded && hash)
    return (
      <div className={className ? className : ""}>
        <Blurhash
          hash={hash}
          style={{ width: "100%", height: "100%", objectFit: "scale-down", padding:5 }}
        />
      </div>
    );
  return (
    <img
      className={className ? className : ""}
      src={require("../../../assets/image-default.jpg")}
    />
  );
};

export default ImageComponent;
