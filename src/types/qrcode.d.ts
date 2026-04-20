declare module "qrcode" {
  interface QRCodeColorOptions {
    dark?: string;
    light?: string;
  }

  interface QRCodeToStringOptions {
    type?: "svg";
    margin?: number;
    width?: number;
    color?: QRCodeColorOptions;
  }

  const QRCode: {
    toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  };

  export default QRCode;
}
