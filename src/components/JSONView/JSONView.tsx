import { Suspense } from "react";
import dynamic from "next/dynamic";

const LazyJSONView = dynamic(() => import("react-json-view").then((mod) => mod.default), {
  ssr: false,
});

const JSONView = (props: any) => (
  <Suspense fallback={<p>Loading...</p>}>
    <LazyJSONView {...props} />
  </Suspense>
);

export default JSONView;
