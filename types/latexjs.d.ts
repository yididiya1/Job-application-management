declare module 'latex.js' {
  export class LaTeXJSComponent {
    constructor(src: string);
    pdf(): Promise<Uint8Array | ArrayBuffer | { arrayBuffer?: () => Promise<ArrayBuffer> } | string>;
    // other methods are not typed here
  }

  export default LaTeXJSComponent;
}
