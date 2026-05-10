import React from "react";
import NextImage from "next/image";
import gcpIcon from "../../../../public/assets/images/logos/gcpCloud.svg";
import { styled } from "@mui/material";

function GcpIcon(props) {
  return <Image src={gcpIcon} alt="gcp-logo" {...props} />;
}

export default GcpIcon;

const Image = styled(NextImage)(({}) => ({}));
