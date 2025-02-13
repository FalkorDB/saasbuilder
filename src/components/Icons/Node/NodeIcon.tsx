import { FC } from "react";

const NodeIcon: FC = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={38}
      height={38}
      fill="none"
      {...props}
    >
      <path
        fill="#F9F5FF"
        d="M0 19C0 8.507 8.507 0 19 0s19 8.507 19 19-8.507 19-19 19S0 29.493 0 19Z"
      />
      <path
        fill="#7F56D9"
        fillRule="evenodd"
        d="M10.75 24.063a1.688 1.688 0 1 0 0 3.375 1.688 1.688 0 0 0 0-3.375ZM7.937 25.75a2.813 2.813 0 1 1 5.626 0 2.813 2.813 0 0 1-5.626 0ZM16 14.313a1.688 1.688 0 1 0 0 3.375 1.688 1.688 0 0 0 0-3.375ZM13.187 16a2.813 2.813 0 1 1 5.626 0 2.813 2.813 0 0 1-5.625 0ZM22 20.313a1.688 1.688 0 1 0 0 3.375 1.688 1.688 0 0 0 0-3.375ZM19.187 22a2.813 2.813 0 1 1 5.626 0 2.813 2.813 0 0 1-5.625 0ZM27.25 10.563a1.688 1.688 0 1 0 0 3.375 1.688 1.688 0 0 0 0-3.376Zm-2.813 1.687a2.813 2.813 0 1 1 5.626 0 2.813 2.813 0 0 1-5.625 0Z"
        clipRule="evenodd"
      />
      <path
        fill="#7F56D9"
        fillRule="evenodd"
        d="M15.198 17.483a.562.562 0 0 1 .229.761l-3.112 5.794a.563.563 0 0 1-.992-.532l3.113-5.794a.563.563 0 0 1 .762-.23ZM17.196 17.196c.22-.22.576-.22.795 0l2.813 2.813a.563.563 0 0 1-.795.795l-2.813-2.813a.562.562 0 0 1 0-.795ZM26.448 13.733a.563.563 0 0 1 .229.761l-3.113 5.794a.563.563 0 0 1-.99-.532l3.112-5.794a.563.563 0 0 1 .762-.23Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export default NodeIcon;
