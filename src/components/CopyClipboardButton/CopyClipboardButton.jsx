import { useState } from "react";
import clipboard from "clipboardy";
import Tooltip from "../Tooltip/Tooltip";
import { IconButton, styled } from "@mui/material";
import { MdContentCopy } from "react-icons/md";
import copyIcon from "../../../public/assets/images/dashboard/copy.svg";
import Image from "next/image";

const CopyToClipbpoardButton = (props) => {
  const { text = "", size = "medium" } = props;
  const [tooltipText, setTooltipText] = useState("Click to copy");

  function handleClick() {
    if (text) {
      clipboard
        .write(text)
        .then((response) => {
          setTooltipText("Copied");
        })
        .catch((err) => {
          setTooltipText("Unable to copy to clipboard");
        });
    } else {
      setTooltipText("Nothing to be copied!");
    }
  }

  return (
    <Tooltip
      title={tooltipText}
      onOpen={() => {
        setTooltipText("Click to copy");
      }}
      placement="top"
    >
      <IconButton sx={{ ml: "10px" }} onClick={handleClick}>
        <CopyIcon src={copyIcon} size={size} alt="copy" />
      </IconButton>
    </Tooltip>
  );
};

export default CopyToClipbpoardButton;

const CopyIcon = styled(Image, {
  shouldForwardProp: (prop) => prop !== "size",
})(({ theme, size }) => ({
  height: size === "small" ? "18px" : "24px",
  width: size === "small" ? "18px" : "24px",
}));
