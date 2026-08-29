import { code, imp } from "ts-poet";

const DriveFolderBrowser = imp("DriveFolderBrowser@@/components/routes/drive/view")

export const writeDriveViewPage = () => code`
export default function DriveViewPage() {
  return <${DriveFolderBrowser} />;
}
`.toString({ prefix: '"use client";' });

export default writeDriveViewPage;
