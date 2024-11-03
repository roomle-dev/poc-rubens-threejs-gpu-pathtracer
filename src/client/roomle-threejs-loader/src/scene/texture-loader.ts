import { ImageLoader, Loader, Texture } from 'three';

export class ExtendedTextureLoader extends Loader {
  constructor(manager?: any) {
    super(manager);
  }

  public load(
    url: string,
    onLoad?: (texture: Texture) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (err: unknown) => void
  ) {
    const texture = new Texture();
    const loader = new ImageLoader(this.manager);
    loader.setCrossOrigin(this.crossOrigin);
    loader.setPath(this.path);
    loader.load(
      url,
      (image: any) => {
        texture.image = image;
        texture.needsUpdate = true;
        if (onLoad !== undefined) {
          onLoad(texture);
        }
      },
      onProgress,
      onError
    );
    return texture;
  }
}
