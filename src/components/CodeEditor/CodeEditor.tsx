import { Suspense } from "react";
import dynamic from "next/dynamic";

import { BaseCodeEditorProps } from "./BaseCodeEditor";
const BaseCodeEditor = dynamic(() => import("./BaseCodeEditor"), {
  ssr: false,
});

const CodeEditor = (props: BaseCodeEditorProps) => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <BaseCodeEditor {...props} />
    </Suspense>
  );
};

export default CodeEditor;
