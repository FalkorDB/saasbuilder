import { Box } from "@mui/material";

const FieldLabel = ({ required, children, ...restProps }) => {
  return (
    <Box
      component="label"
      sx={{
        fontWeight: 500,
        fontSize: "14px",
        lineHeight: "22px",
        color: "#111827",
      }}
    >
      {children}{" "}
      {required && (
        <Box component="span" color="#E03137">
          *
        </Box>
      )}
    </Box>
  );
};

export default FieldLabel;
