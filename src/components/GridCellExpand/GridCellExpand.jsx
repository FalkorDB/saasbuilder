import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import React from "react";
import CopyToClipbpoardButton from "../CopyClipboardButton/CopyClipboardButton";
import Link from "next/link";

// function isOverflown(element) {
//   return (
//     element.scrollHeight > element.clientHeight ||
//     element.scrollWidth > element.clientWidth
//   );
// }

const GridCellExpand = React.memo(function GridCellExpand(props) {
  const {
    width,
    value,
    copyButton,
    startIcon,
    endIcon,
    textStyles = {},
    onClick = () => {},
    href,
    target = "_self",
    justifyContent = "center",
  } = props;
  const wrapper = React.useRef(null);
  const cellDiv = React.useRef(null);
  const cellValue = React.useRef(null);
  // const [anchorEl, setAnchorEl] = React.useState(null);
  // const [showFullCell, setShowFullCell] = React.useState(false);
  // const [showPopper, setShowPopper] = React.useState(false);

  // const handleMouseEnter = () => {
  //   const isCurrentlyOverflown = isOverflown(cellValue.current);
  //   setShowPopper(isCurrentlyOverflown);
  //   setAnchorEl(cellDiv.current);
  //   setShowFullCell(true);
  // };

  // const handleMouseLeave = () => {
  //   setShowFullCell(false);
  // };

  // React.useEffect(() => {
  //   if (!showFullCell) {
  //     return undefined;
  //   }

  //   function handleKeyDown(nativeEvent) {
  //     // IE11, Edge (prior to using Bink?) use 'Esc'
  //     if (nativeEvent.key === "Escape" || nativeEvent.key === "Esc") {
  //       setShowFullCell(false);
  //     }
  //   }

  //   document.addEventListener("keydown", handleKeyDown);

  //   return () => {
  //     document.removeEventListener("keydown", handleKeyDown);
  //   };
  // }, [setShowFullCell, showFullCell]);

  const CellValue = (
    <Box
      sx={{
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
      }}
    >
      <Box
        component="span"
        sx={{
          "& *": {
            display: "block",
          },
        }}
      >
        {startIcon}
        {Boolean(copyButton && value) && (
          <CopyToClipbpoardButton text={value} size="small" />
        )}
      </Box>
      <Box
        textOverflow="ellipsis"
        overflow="hidden"
        ref={cellValue}
        sx={{ ...(href ? { color: "#6941C6" } : {}), ...textStyles }}
        onClick={onClick}
        title={value}
      >
        {value}
      </Box>
      {endIcon}
    </Box>
  );
  return (
    <Box
      ref={wrapper}
      // onMouseEnter={handleMouseEnter}
      // onMouseLeave={handleMouseLeave}
      sx={{
        alignItems: "center",
        lineHeight: "24px",
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        justifyContent: justifyContent,
      }}
    >
      <Box
        ref={cellDiv}
        sx={{
          height: "100%",
          width,
          display: "block",
          position: "absolute",
          top: 0,
        }}
      />
      {href ? (
        <Link
          style={{
            width: "100%",
          }}
          href={href}
          target={target}
        >
          {CellValue}
        </Link>
      ) : (
        CellValue
      )}

      {/* {showPopper && (
        <Popper
          open={showFullCell && anchorEl !== null}
          anchorEl={anchorEl}
          style={{ width, marginLeft: -17 }}
        >
          <Paper
            elevation={1}
            style={{ minHeight: wrapper.current.offsetHeight - 3 }}
          >
            <Typography
              variant="body2"
              sx={{ padding: "8px", fontSize: "14px" }}
            >
              {value}
            </Typography>
          </Paper>
        </Popper>
      )} */}
    </Box>
  );
});

export default GridCellExpand;

export function renderCellExpand(params) {
  return (
    <GridCellExpand
      value={params.value || ""}
      width={params.colDef.computedWidth}
    />
  );
}
