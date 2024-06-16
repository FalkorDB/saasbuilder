import React from "react";
import NextImage from "next/image";
import awsIcon from "../../../../public/assets/images/logos/awsCloud.svg";
import { styled } from "@mui/material";

function AwsIcon(props) {
  return <Image src={awsIcon} alt="aws-logo" {...props} />;
}

export default AwsIcon;

const Image = styled(NextImage)(({ theme }) => ({}));
