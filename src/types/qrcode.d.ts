declare module "qrcode" {
  interface QRCodeColorOptions {
    dark?: string;
    light?: string;
  }

  interface QRCodeToDataUrlOptions {
    margin?: number;
    width?: number;
    color?: QRCodeColorOptions;
  }

  interface QRCodeToStringOptions {
    type?: "svg";
    margin?: number;
    width?: number;
    color?: QRCodeColorOptions;
  }

  const QRCode: {
    toDataURL(text: string, options?: QRCodeToDataUrlOptions): Promise<string>;
    toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  };

  export default QRCode;
}
