import Button from "../Button/Button";
import CardWithTitle from "../Card/CardWithTitle";

type APIDocumentationProps = {
  serviceId: string;
  serviceAPIID: string;
};

const APIDocumentation: React.FC<APIDocumentationProps> = ({}) => {
  return (
    <CardWithTitle title="API Documentation" style={{ minHeight: "500px" }}>
      <Button
        onClick={() => {
          window.open("https://docs.falkordb.cloud/", "_blank");
        }}
      >
        Open API Documentation
      </Button>
    </CardWithTitle>
  );
};

export default APIDocumentation;
